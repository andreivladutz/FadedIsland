const LAYER_ARR = "layers", OBJECT_ARR = "objects", TILE_ARR = "data",
	  TILE_SIZE = "tilewidth", MAP_HEIGHT = "height", MAP_WIDTH = "width",
	  TILESETS_ARR = "tilesets", NO_TILE = 0, WORKFILE_SOURCE = "source",
	  TILESET_IMAGE = "image", TILED_PATH = "Tiled", 
	  TILE_ARR_IN_TILESETWORKFILE = "tiles", WALKABLE = "walkable",
	  ANIMATION = "animation", PROPERTIES = "properties",
	  PROPERTY_NAME = "name", PROPERTY_VALUE = "value",
	  POSITION_IN_MATRIX = "matrixPosition", CURRENT_ID = "currentId",
	  CURRENT_FRAME = "currentFrame", LOADED_TILESETS_EVENT = "tilesetLoadFinished";

class MapParser extends EventEmiter {
	constructor(resLoader, jsonText, loadedResourcesPromisesArr) {
		super();
		
		this.globalResLoader = resLoader;
		this.resourceLoader = new ResourceLoader();
		
		//a reference to the global array of promises
		this.loadedResourcesPromises = loadedResourcesPromisesArr;
		
		//the map .json object
		var jObj = this.jsonMapObject = JSON.parse(jsonText);

		// Array of Layer Objects
		this.layers = jObj["layers"];

		this.tilesetsWorkfiles = jObj[TILESETS_ARR];
		this.tileSize = jObj[TILE_SIZE];
		this.mapWidth = jObj[MAP_WIDTH];
		this.mapHeight = jObj[MAP_HEIGHT];
		/*
			building an array of matrices with mapHeight rows
			each layer of tiles is transformed in a matrix of tiles
		*/
		this.tilesMatrices = [];
		
		this.objectsArr = [];
		
		// many objects have a common template so we store it separately to spare some memory.
		// templates are indexed by the "template" property's src string
		this.objectTemplates = {
			
		};
		
		this.animationsArr = [];
		
		// we parse all layers : of tiles, of objects recursively
		// so if there are groups of layers they are expanded and parsed
		this.parseLayers(jObj);
		
		// this promise will be changed in the parseObjects method
		// if there are any templated objects
		this.loadedObjectTemplateWorkfilesPromise = new Promise(function(resolve) {
			// just a dummy fullfiled promise if there aren't any templateWorkfiles to load
			resolve();
		});
		
		// after all the layers have been parsed we kick the parsing of game objects
		this.parseObjects();
		
		//false means "no collision" while true means "collision a.k.a. non-walkable"
		this.collisionMatrix = [];
		for (var i = 0; i < this.mapHeight; i++) {
			this.collisionMatrix.push([]);
			
			for (var j = 0; j < this.mapWidth; j++) {
				this.collisionMatrix[i][j] = false;
			}
		}
		
		var self = this;
		
		// we wait for the objectTemplate workfiles to load before starting the load
		// of the tilesetWorkfiles because objectTemplates also have tilesets to be loaded
		this.loadedObjectTemplateWorkfilesPromise
			.then(
			function onResolved() {
				self.loadTilesetsWorkfiles();
			}, 
			function onRejected(err) {
				self.loadTilesetsWorkfiles();
				
				console.error("Something went wrong with the loading of the object template workfiles!");
				throw err;
			});
		
	}
}

_p = MapParser.prototype;


/*
	THE FORMAT OF ONE OBJECT IN THE RESOURCES ARRAY
		{
			name : "resource",
			itemType : "JSON",
			url : "....../resource.json"
		}
		
	here we keep the name of the resource to be the same as the url
	
		{
			name : "...../resource.json",
			*snip*
		}
		
	on each tileset object we add 
		- JSONobject property which is the parsed tileset .json workfile
		- image which is the loaded tileset image
*/
_p.loadTilesetsWorkfiles = function() {
	var tilesetsJsonRes = [],
		imageResources = [];
	
	var self = this;
	
	// going through every tileset workfile
	for (let tileset of this.tilesetsWorkfiles) {
		let src = tileset[WORKFILE_SOURCE],
			existingResource = this.globalResLoader.get(src);
		
		//tileset workfile was already loaded
		if (existingResource && existingResource._availableResource) {
			// we just add a copy of it on the current tileset
			tileset.JSONobject = JSON.parse(existingResource.response);
			
			// getting the source of the tileset image from the object
			let imgSrc = tileset.JSONobject[TILESET_IMAGE],
				existingImage = this.globalResLoader.get(imgSrc);
		
			//tileset image was already loaded
			if (existingImage && existingImage._availableResource) {
				tileset.image = existingImage;
			}
			else {
				this.loadTilesetImage(imgSrc, tileset, imageResources);
			}
			
			continue;
		}
		
		// pushing the json workfile in a resource array to be loaded
		tilesetsJsonRes.push({
			name : src,
			itemType : "JSON",
			url : src.replace("..", TILED_PATH)
		});
		
		// adding listener for the loading of this workfile event 
		this.resourceLoader.on("loaded" + src, function(e) {
			// has already been called so we exit
			if (tileset.JSONobject) {
				return;
			}
			tileset.JSONobject = JSON.parse(e.detail.response);
			
			self.loadTilesetImage(tileset.JSONobject[TILESET_IMAGE],
								  tileset,
								  imageResources);
		});
	}
	
	// adding the whole resource array to start loading
	this.resourceLoader.add(tilesetsJsonRes);
	
	// name of the resources bundle
	const WORKFILES_NAME = "TilesetWorkfiles";
	
	//once we finished loading all tileset .json files we start loading tileset images
	this.loadedResourcesPromises.push(
		promisify(function(resolve, reject) {
			self.resourceLoader.on("finishedLoading" + WORKFILES_NAME, function startLoadingImages() {				
				self.startLoadingTilsetImages(imageResources);
				self.processCollisionMatrixAnimations();
				
				// remove the tilesets which belong to the custom objects
				self.removeCustomObjectTilesets();
				
				resolve();
			});
		})
	);
	
	// kick-start the loading of the resources
	this.resourceLoader.load(WORKFILES_NAME);
};

function returnAllLayers(layers) {
	let realLayers = [];

    for(let layer of layers) {

        if("layers" in layer) {
            realLayers = realLayers.concat(returnAllLayers(layer["layers"]));
        }
        else if(layer["type"] === "tilelayer") realLayers.push(layer);
    }

    return realLayers;
}

function hasCustomProperty(layer, name) {

	if ("properties" in layer) {
    	for (let property of layer["properties"]) {

    		if (property["name"] === name)
    			return property["value"];
		}
		return null;
	}
	return null;
}

_p.processCollisionMatrixAnimations = function() {

	let realLayers = returnAllLayers(this.layers);
	let layersCounter = 0;
	let walkableTrigger;

	for (let tileMatrix of this.tilesMatrices) {

		walkableTrigger = hasCustomProperty(realLayers[layersCounter], "walkable");
		layersCounter++;

		for (let i = 0; i < tileMatrix.length; i++) {
			for (let j = 0; j < tileMatrix[i].length; j++) {

                if(walkableTrigger !== null && realLayers[layersCounter - 1]["data"][i * tileMatrix.length + j] !== 0) {
                    this.collisionMatrix[i][j] = !walkableTrigger;
                }

				let tileNo = tileMatrix[i][j],
					tilesets = this.tilesetsWorkfiles,
					usedTileset;

				if (tileNo == NO_TILE) {
					continue;
				}

				for (let tilesetInd = 0; tilesetInd < tilesets.length - 1; tilesetInd++) {
					let currTileset = tilesets[tilesetInd],
						nextTileset = tilesets[tilesetInd + 1];

					//the tile to be drawn belongs to the currentTileset
					if (tileNo >= currTileset[FIRST_TILE_NUMBER] && tileNo < nextTileset[FIRST_TILE_NUMBER]) {
						usedTileset = currTileset;
						break;
					}
				}

				//the current tile is from the last tileset in the tilesets array
				if (!usedTileset) {
					usedTileset = tilesets[tilesets.length - 1];
				}

				//if the resource isn't found locally than it is stored in the global resLoader
				let tilesetWorkfile = usedTileset.JSONobject;

				let tilesObjectArr = tilesetWorkfile[TILE_ARR_IN_TILESETWORKFILE],
					realTileNo = tileNo - usedTileset[FIRST_TILE_NUMBER],
					currTileObj;

				try{
					currTileObj = tilesObjectArr[realTileNo];
				}
				catch(err){
					continue;
				}

				if (!currTileObj) {
					continue;
				}
				
				if(walkableTrigger === null) {
                    if (PROPERTIES in currTileObj) {
                        let propertiesArr = currTileObj[PROPERTIES];

                        for (let property of propertiesArr) {
                            if (property[PROPERTY_NAME] === WALKABLE) {
                                let value = property[PROPERTY_VALUE];

                                //the tile is non-walkable so collision is true
                                if (value === false) {
                                    this.collisionMatrix[i][j] = true;
                                }
                            }
                        }
                    }
                }

				if (ANIMATION in currTileObj) {
					//making a copy of the animation array
					let currAnimationArr =
						JSON.parse(JSON.stringify(currTileObj[ANIMATION]));

					this.animationsArr.push(
						currAnimationArr
					);

					Object.defineProperties(currAnimationArr, {
						"matrixPosition" : {
							value : {i, j},
							enumerable : false,
							writable : false,
							configurable : false
						},
						"currentId" : {
							value : currAnimationArr[0].tileid,
							enumerable : false,
							writable : true,
							configurable : false
						},
						"currentFrame" : {
							value : 0,
							enumerable : false,
							writable : true,
							configurable : false
						}
					});
				}
			}
		}
	}
}

_p.startLoadingTilsetImages = function(imageResources) {
	const IMAGES_NAME = "TilesetsImages";
	
	this.resourceLoader.add(imageResources);
	
	var self = this;
	
	this.loadedResourcesPromises.push(
		promisify(function(resolve, reject) {
			self.resourceLoader.on("finishedLoading" + IMAGES_NAME, function() {
				console.log(self.tilesetsWorkfiles);
				
				self.resourceLoader.moveResourcesTo(self.globalResLoader);
				
				//we finished loading everything so we can make a mapInstance
				self.emit(LOADED_TILESETS_EVENT, null);
				
				resolve();
			});
		})
	);
	
	this.resourceLoader.load(IMAGES_NAME);
}						

// actually just pushing the image to be loaded at a later time
_p.loadTilesetImage = function(imgSrc, tileset, imageResources) {
	let existingResource = this.globalResLoader.get(imgSrc);
	
	// checking if the image has already been loaded
	if (existingResource && existingResource._availableResource) {
		tileset.image = existingResource;
		return;
	}

	//loading the image tileset
	imageResources.push({
		name : imgSrc,
		itemType : "img",
		url : imgSrc.replace("..", TILED_PATH)
	});

	this.resourceLoader.on("loaded" + imgSrc, function(e) {
		var img = e.detail;
		tileset.image = img;
	});
}

// parsing the layers of the map recursively 
_p.parseLayers = function(obj) {
	if (LAYER_ARR in obj) {
        var layerArr = obj[LAYER_ARR];

        for (let object of layerArr) {
            this.parseLayers(object);
        }
    }

    else if (TILE_ARR in obj) {
        this.applyLayer(obj[TILE_ARR], obj["opacity"]);
    }

    else if (OBJECT_ARR in obj) {
        this.objectsArr = this.objectsArr.concat(obj[OBJECT_ARR]);
    }
}

/*
	parsing objects by loading template.json files
*/
_p.parseObjects = function() {
	const TEMPLATE = "template";
	
	// the paths will occur many times as there are 
	// more objects of the same type on each map
	let objTemplatesPaths = new Set(),
		// the array of resources to be loaded
		templateWorkfilesResArr = [];
	
	for (obj of this.objectsArr) {
		// the curr object is a template object so we need to load it's template.json
		if (TEMPLATE in obj) {
			if (obj[TEMPLATE] === "../object_workfiles/WaterFountain.json") {
				console.log(obj);
			}
			objTemplatesPaths.add(obj[TEMPLATE]);
		}
	}
	
	/*
		There are no template workfiles to be loaded
	*/
	
	if (!objTemplatesPaths.size) {
		return;
	}
	
	var self = this;
	
	for (let src of objTemplatesPaths) {
		// pushing the json workfile in a resource array to be loaded
		templateWorkfilesResArr.push({
			name : src,
			itemType : "JSON",
			url : src.replace("..", TILED_PATH)
		});
		
		// adding listener for the loading of this workfile event 
		this.resourceLoader.on("loaded" + src, function(e) {
			/*
				when the template workfile has finished loading:
					- we parse and add it in the objectTemplates by the src key 
			*/
			self.objectTemplates[src] = {
				jsonTemplateWorkfile: JSON.parse(e.detail.response),
			}
		});
	}
	
	// adding the whole resource array to start loading
	this.resourceLoader.add(templateWorkfilesResArr);
	
	// name of the resources bundle
	const WORKFILES_NAME = "ObjectTemplatesWorkfiles";
	
	// we change the promise to really wait for the loading of the object template json files
	this.loadedObjectTemplateWorkfilesPromise = promisify(
		function(resolve, reject) {
			self.resourceLoader.on("finishedLoading" + WORKFILES_NAME, function() {
				self.addCustomObjectTilesets();
				
				resolve();
			});
		}
	);
	
	// we wait globally for the loading of the workfiles
	this.loadedResourcesPromises.push(
		this.loadedObjectTemplateWorkfilesPromise
	);
	
	// kick-start the loading of the resources
	this.resourceLoader.load(WORKFILES_NAME);
}


/*
	This function takes the tilesets in object templates and adds them with
	the rest of the tilesets to be loaded
	
	After the loading is complete removeCustomObjectTilesets should be called
*/
_p.addCustomObjectTilesets = function() {
	for (src in this.objectTemplates) {
		// obtaining an object tileset reference
		let tilesetRef = this.objectTemplates[src].jsonTemplateWorkfile["tileset"];
		// adding a flag so we know which tilesets to remove after the loading
		tilesetRef["objectTemplate"] = true;
		
		this.tilesetsWorkfiles.push(tilesetRef);
	}
}

// removing the extra tilesets added in the function above
_p.removeCustomObjectTilesets = function() {
	let tileArr = this.tilesetsWorkfiles;
	
	while (tileArr[tileArr.length - 1]["objectTemplate"]) {
		tileArr.pop();
	}
}

/*_p.parseLayers = function(json) {

	let allLayers = returnAllLayers(json["layers"]);
	console.log(allLayers.length);
	for(let layer of allLayers) {
		if(layer["type"] === "tilelayer")
			this.applyLayer(layer["data"]);
		else if(layer["type"] === "objectgroup")
            this.objectsArr = this.objectsArr.concat(json[OBJECT_ARR]);
	}
};*/

_p.applyLayer = function(tileArray, opacity) {
	var arrInd = 0, layerMatrix = [];
	
	layerMatrix.opacity = opacity;
	
	//creating a matrix with mapHeight rows
	//to represent this layer of tiles
	for (let i = 0; i < this.mapHeight; i++) {
		layerMatrix.push([]);
	}
	
	for (let i = 0; i < this.mapHeight; i++) {
		for (let j = 0; j < this.mapWidth; j++) {
			layerMatrix[i][j] = tileArray[arrInd++];
		}
	}
	
	this.tilesMatrices.push(layerMatrix);
}

_p.getMapInstance = function(mapName) {
	return new MapInstance(
		mapName,
		this.jsonMapObject,
		this.tilesetsWorkfiles,
		this.tileSize,
		this.mapWidth,
		this.mapHeight,
		this.tilesMatrices,
		this.objectsArr,
		this.objectTemplates,
		this.collisionMatrix,
		this.animationsArr
	);
}
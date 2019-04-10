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
		this.animationsArr = [];
		
		this.parseLayers(jObj);
		
		//false means "no collision" while true means "collision a.k.a. non-walkable"
		this.collisionMatrix = [];
		for (var i = 0; i < this.mapHeight; i++) {
			this.collisionMatrix.push([]);
			
			for (var j = 0; j < this.mapWidth; j++) {
				this.collisionMatrix[i][j] = false;
			}
		}
		
		this.loadTilesetsWorkfiles();
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
	
	for (let tileset of this.tilesetsWorkfiles) {
		let src = tileset[WORKFILE_SOURCE],
			existingResource = this.globalResLoader.get(src);
		
		//tileset workfile was already loaded
		if (existingResource && existingResource._availableResource) {
			tileset.JSONobject = JSON.parse(existingResource.response);
			
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
		
		//loading the json workfile
		tilesetsJsonRes.push({
			name : src,
			itemType : "JSON",
			url : src.replace("..", TILED_PATH)
		});
		
		this.resourceLoader.on("loaded" + src, function(e) {
			tileset.JSONobject = JSON.parse(e.detail.response);
			
			self.loadTilesetImage(tileset.JSONobject[TILESET_IMAGE],
								  tileset,
								  imageResources);
		});
	}
	
	this.resourceLoader.add(tilesetsJsonRes);
	
	const WORKFILES_NAME = "TilesetWorkfiles";
	
	//once we finished loading all tileset .json files we start loading tileset images
	this.loadedResourcesPromises.push(
		promisify(function(resolve, reject) {
			self.resourceLoader.on("finishedLoading" + WORKFILES_NAME, function startLoadingImages() {				
				self.startLoadingTilsetImages(imageResources);
				self.processCollisionMatrixAnimations();
				
				resolve();
			});
		})
	);
	
	this.resourceLoader.load(WORKFILES_NAME);
}

_p.processCollisionMatrixAnimations = function() {
	for (let tileMatrix of this.tilesMatrices) {
		for (let i = 0; i < tileMatrix.length; i++) {
			for (let j = 0; j < tileMatrix[i].length; j++) {
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
						
_p.loadTilesetImage = function(imgSrc, tileset, imageResources) {
	let existingResource = this.globalResLoader.get(imgSrc);

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

_p.parseLayers = function(obj) {
	if (LAYER_ARR in obj) {
		var layerArr = obj[LAYER_ARR];
		
		for (var obj of layerArr) {
			this.parseLayers(obj);
		}
	}
	
	else if (TILE_ARR in obj) {
		this.applyLayer(obj[TILE_ARR]);
	}
	
	else if (OBJECT_ARR in obj) {
		this.objectsArr = this.objectsArr.concat(obj[OBJECT_ARR]);
	}
}


_p.applyLayer = function(tileArray) {
	var arrInd = 0, layerMatrix = [];
	
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
		this.collisionMatrix,
		this.animationsArr
	);
}
const LAYER_ARR = "layers", OBJECT_ARR = "objects", TILE_ARR = "data",
	  TILE_SIZE = "tilewidth", MAP_HEIGHT = "height", MAP_WIDTH = "width",
	  TILESETS_ARR = "tilesets", NO_TILE = 0, WORKFILE_SOURCE = "source",
	  TILESET_IMAGE = "image", TILED_PATH = "Tiled";

class MapParser {
	constructor(resLoader, jsonText, loadedResourcesPromisesArr) {
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
		
		this.parseLayers(jObj);
		
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
				resolve();
			});
		})
	);
	
	this.resourceLoader.load(WORKFILES_NAME);
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
		this.objectsArr
	);
}
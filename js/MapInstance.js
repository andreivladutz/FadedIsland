const OBJECT_X = "x", OBJECT_Y = "y", IMAGE_OF_TILESET = "image", 
	  FIRST_TILE_NUMBER = "firstgid", TILES_PER_ROW = "columns"; 
class MapInstance extends InputHandler {
	constructor(
		mapName,
		jsonMapObject,
		tilesetsWorkfiles,
		tileSize,
		mapWidth,
		mapHeight,
		tilesMatrices,
		objectsArr) {
			super(document.getElementById("gameCanvas"));
			
			this.on("move", this.moveMap.bind(this));
			//own map name
			this.mapName = mapName;
			
			//the parsed map.json file
			this.jsonMapObject = jsonMapObject;
			
			/*
				the tilesets array of objects from the map.json plus on each object:
				JSONobject property = the parsed .json tileset workfile
				image property = the loaded tileset image
			*/
			this.tilesetsWorkfiles = tilesetsWorkfiles;
			
			this.mapImage = this.tilesetsWorkfiles[IMAGE_OF_TILESET];
			
			//the size of a single square tile
			this.tileSize = tileSize;
			
			//map size in number of tiles
			this.mapWidth = mapWidth
			this.mapHeight = mapHeight;
			
			//the array of matrices of tile numbers
			//each matrix is a layer of tiles
			this.tilesMatrices = tilesMatrices;
			
			//the array of objects from the map.json file
			this.objectsArr = objectsArr;
			
			//the map coordinates
			this.mapX = 0;
			this.mapY = 0;
			
			this.offDirty = true;
			
			//the size of the viewport in pixels
			this.viewportWidth = CanvasManagerFactory().canvas.width;
			this.viewportHeight = CanvasManagerFactory().canvas.height;
			
	}
}

_p = MapInstance.prototype;

_p.moveMap = function(e) {
	var movement = e.detail;;
	
	this.mapX = Math.min(
		this.mapX + movement.deltaX, 0
	);
	
	this.mapY = Math.min(
		this.mapY + movement.deltaY, 0
	);
	
	this.mapX = Math.max(
		- (this.mapWidth * this.tileSize) + this.viewportWidth, this.mapX
	);
	
	this.mapY = Math.max(
		- (this.mapHeight * this.tileSize) + this.viewportHeight, this.mapY
	);
	//this.mapX = Math.min(
	//	this.mapX, 
	//)

	this.emit("movedMap", null);
}
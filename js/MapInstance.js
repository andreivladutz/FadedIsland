const OBJECT_X = "x", OBJECT_Y = "y", IMAGE_OF_TILESET = "image", 
	  FIRST_TILE_NUMBER = "firstgid", TILES_PER_ROW = "columns",
	  DEFAULT_TILE = "defaultTile", JSON_TILESET_WORKFILE = "tilesetWorkfile"; 

class MapInstance extends EventEmiter {
	constructor(
		mapName,
		jsonMapObject,
		tilesetsWorkfiles,
		tileSize,
		mapWidth,
		mapHeight,
		tilesMatrices,
		objectsArr,
		collisionMatrix,
		animationsArr) {
			super();
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
			
			//true => we cannot walk on the tile 
			//false => no collision with the tile
			this.collisionMatrix = collisionMatrix;
			
			/*
				an array of animation arrays as it is defined in the tileset json
				workfile, with extra properties :
				
				matrixPosition - an object {i, j} with the position in the world
				currentId - the id of the current tile drawn
				currentFrame - the array index of the current frame drawn
			*/
			
			this.animationsArr = animationsArr;
			this.processAnimations();
			
			//the map coordinates
			this.mapX = 0;
			this.mapY = 0;
			
			CanvasManagerFactory().addEventListener(
				CANVAS_RESIZE_EVENT, 
				this.updateViewportSize.bind(this)
			);
			
			this.updateViewportSize();
	}
}

_p = MapInstance.prototype;

//returns true if the coords and tileId match an animated tile 
_p.isAnimated = function(i, j, tileId) {
	for (let animationArr of this.animationsArr) {
		for (let animationObj of animationArr) {
			if (animationObj.tileid == tileId ) {
				if (animationArr[POSITION_IN_MATRIX].i == i 
					&& animationArr[POSITION_IN_MATRIX].j == j) {
						return true;
				}
			}
		}
		
	}
	
	return false;
}

_p.processAnimations = function() {
	let tilesets = this.tilesetsWorkfiles;
	
	for (let animationArr of this.animationsArr) {
		let i = animationArr[POSITION_IN_MATRIX].i,
			j = animationArr[POSITION_IN_MATRIX].j;
		
		for (let layerMatrix of this.tilesMatrices) {
			let tileId = layerMatrix[i][j],
				usedTileset;
				
			if (tileId == NO_TILE) {
				continue;
			}

			for (let tilesetInd = 0; tilesetInd < tilesets.length - 1; tilesetInd++) {
				let currTileset = tilesets[tilesetInd],
					nextTileset = tilesets[tilesetInd + 1];

				//the tile to be drawn belongs to the currentTileset
				if (tileId >= currTileset[FIRST_TILE_NUMBER] && tileId < nextTileset[FIRST_TILE_NUMBER]) {
					usedTileset = currTileset;
					break;
				}
			}

			//the current tile is from the last tileset in the tilesets array
			if (!usedTileset) {
				usedTileset = tilesets[tilesets.length - 1];	
			}

			tileId -= usedTileset[FIRST_TILE_NUMBER];
			
			for (let animationObj of animationArr) {
				if (animationObj.tileid == tileId ) {
					animationArr[DEFAULT_TILE] = tileId;
					animationArr[JSON_TILESET_WORKFILE] = usedTileset.JSONobject;
					animationArr[TILESET_IMAGE] = usedTileset["image"];
				}
			}
		}
		
	}
}

_p.updateViewportSize = function() {
	//the size of the viewport in pixels
	this.viewportWidth = CanvasManagerFactory().canvas.width;
	this.viewportHeight = CanvasManagerFactory().canvas.height;
}

//_p.moveMap = function(e) {
//	var movement = e.detail,
//		pixelsMapWidth = this.mapWidth * this.tileSize,
//		pixelsMapHeight = this.mapHeight * this.tileSize;
//	
//	if (this.viewportWidth >= pixelsMapWidth) {
//		this.mapX = (this.viewportWidth - pixelsMapWidth) / 2;
//	}
//	
//	else {
//		this.mapX = Math.min(
//			this.mapX + movement.deltaX, 0
//		);
//		
//		this.mapX = Math.max(
//			- pixelsMapWidth + this.viewportWidth, this.mapX
//		);
//	}
//	
//	if (this.viewportHeight >= pixelsMapHeight) {
//		this.mapY = (this.viewportHeight - pixelsMapHeight) / 2;
//	}
//	
//	else {
//		this.mapY = Math.min(
//			this.mapY + movement.deltaY, 0
//		);
//
//		this.mapY = Math.max(
//			- pixelsMapHeight + this.viewportHeight, this.mapY
//		);
//	}
//
//	this.emit("movedMap", null);
//}


_p.moveMap = function(deltaX, deltaY) {
	var pixelsMapWidth = this.mapWidth * this.tileSize,
		pixelsMapHeight = this.mapHeight * this.tileSize;
	
	if (this.viewportWidth >= pixelsMapWidth) {
		this.mapX = (this.viewportWidth - pixelsMapWidth) / 2;
	}
	
	else {
		this.mapX = Math.min(
			this.mapX + deltaX, 0
		);
		
		this.mapX = Math.max(
			- pixelsMapWidth + this.viewportWidth, this.mapX
		);
	}
	
	if (this.viewportHeight >= pixelsMapHeight) {
		this.mapY = (this.viewportHeight - pixelsMapHeight) / 2;
	}
	
	else {
		this.mapY = Math.min(
			this.mapY +  deltaY, 0
		);

		this.mapY = Math.max(
			- pixelsMapHeight + this.viewportHeight, this.mapY
		);
	}

	this.emit("movedMap", null);
}
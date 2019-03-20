class MapRenderer {
	//the constructor receives the name of the current rendered map
	constructor(currentMapName) {
		this.canvasManager = CanvasManagerFactory();
		
		this.changeMap(currentMapName);
		
		//the offscreen buffer has extra 10 tiles in every direction
		//so it is bigger than the visible canvas
		this.extraBufferTiles = 30;
		
		var tileSize = this.currentMapInstance.tileSize;
		
		this.canvasManager.makeOffscreenBufferBigger(
			(this.extraBufferTiles * 2) * tileSize,
			(this.extraBufferTiles * 2) * tileSize
		);
		
		var self = this;
		this.canvasManager.addEventListener(
			CANVAS_RESIZE_EVENT,
			function() {
				self.offDirty = true;
				self.draw();
			}
		);
	}
}

MapRenderer.MAP_INSTANCES = {};

_p = MapRenderer.prototype;

_p.changeMap = function(mapName) {
	this.currentMapName = mapName;
	this.currentMapInstance = MapRenderer.MAP_INSTANCES[mapName];
		
	this.currentMapInstance.on("movedMap", 
							   this.draw.bind(this));
	
	//offDirty flag tells if the offscreenBuffer canvas should be redrawn
	this.offDirty = true;
}

_p.checkIfDirty = function() {
	var visArea = this.visibleTileArea,
		offVisArea = this.offScreenVisibleTileArea,
		mapInst = this.currentMapInstance;
	
	if (visArea.startX < offVisArea.startX || visArea.startY < offVisArea.startY 
		|| visArea.endX > offVisArea.endX 
		|| (visArea.endY >= offVisArea.endY && offVisArea.endY != mapInst.mapHeight)) {
		
		this.offDirty = true;
	}
	
	return this.offDirty;
}

_p.computeOffScreenBufferVisibleArea = function() {
	var mI = this.currentMapInstance,
		tileSize = mI.tileSize;
	
	this.offScreenVisibleTileArea = {
		startX : Math.max(
			this.visibleTileArea.startX - this.extraBufferTiles, 0
		),
		startY : Math.max(
			this.visibleTileArea.startY - this.extraBufferTiles, 0
		),
		endX : Math.min(
			this.visibleTileArea.endX + this.extraBufferTiles, mI.mapWidth
		),
		endY : Math.min(
			this.visibleTileArea.endY + this.extraBufferTiles, mI.mapHeight
		),
	};
}

_p.computeVisibleTileArea = function() {
	var mI = this.currentMapInstance,
		viewportWidth = mI.viewportWidth,
		viewportHeight = mI.viewportHeight,
		tileSize = mI.tileSize;
	
	this.visibleTileArea = {
		startX : Math.floor(Math.abs(mI.mapX) / tileSize),
		startY : Math.floor(Math.abs(mI.mapY) / tileSize),
		endX : Math.ceil((- mI.mapX + viewportWidth) / tileSize),
		endY : Math.ceil((- mI.mapY + viewportHeight) / tileSize)
	}
	
	/* if the viewport is bigger than the map */
	if (viewportWidth >= mI.mapWidth * tileSize) {
		this.visibleTileArea.startX = 0;
		this.visibleTileArea.endX = mI.mapWidth;
	}
	
	if (viewportHeight >= mI.mapHeight * tileSize) {
		this.visibleTileArea.startY = 0;
		this.visibleTileArea.endY = mI.mapHeight;
	}
}

_p.redrawOffscreenBuffer = function() {
	var offCtx = this.canvasManager.offScreenCtx,
		canvas = this.canvasManager.offScreenBuffer,
		mapName = this.currentMapName,
		mapInstance = this.currentMapInstance,
		tilesMatrices = mapInstance.tilesMatrices,
		mapX = mapInstance.mapX,
		mapY = mapInstance.mapY,
		tilesets = mapInstance.tilesetsWorkfiles,
		tileSize = mapInstance.tileSize;
	
	offCtx.clearRect(0, 0, canvas.width, canvas.height);
	
	var stX = this.offScreenVisibleTileArea.startX,
		stY = this.offScreenVisibleTileArea.startY,
		eX = this.offScreenVisibleTileArea.endX,
		eY = this.offScreenVisibleTileArea.endY;
	
	for (let tilesMatrix of tilesMatrices) {
		for (let i = stY; i < eY; i++) {
			for (let j = stX; j < eX; j++) {
				let tileNo = tilesMatrix[i][j],
					usedTileset;
				
				if (tileNo === NO_TILE) {
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

				tileNo -= usedTileset[FIRST_TILE_NUMBER];

				let tilesPerRow = usedTileset.JSONobject[TILES_PER_ROW],
					srcX = (tileNo % tilesPerRow) * tileSize,
					srcY = Math.floor(tileNo / tilesPerRow) * tileSize,
					destX = (j - stX) * tileSize,
					destY = (i - stY) * tileSize;

				offCtx.drawImage(
					usedTileset["image"], 
					srcX, srcY, tileSize, tileSize,
					destX, destY, tileSize, tileSize
				);
			}
		}
	}
	
	this.offDirty = false;
}

/*
	draw checks if the offscreenBuffer canvas is "dirty" i.e. if we ran out of bounds
	with the visible map and it needs to be redrawn or the screen has been resized, etc
*/
_p.draw = function() {
	this.computeVisibleTileArea();
	
	if (this.offDirty || this.checkIfDirty()) {
		this.computeOffScreenBufferVisibleArea();
		this.redrawOffscreenBuffer();
	}
	
	var offStX = this.offScreenVisibleTileArea.startX,
		offStY = this.offScreenVisibleTileArea.startY,
		stX = this.visibleTileArea.startX,
		stY = this.visibleTileArea.startY;
	
	var ctx = this.canvasManager.ctx,
		canvas = this.canvasManager.canvas,
		offScreenCanvas = this.canvasManager.offScreenBuffer,
		tileSize = this.currentMapInstance.tileSize,
		srcX = (stX - offStX) * tileSize,
		srcY = (stY - offStY) * tileSize;
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	ctx.drawImage(offScreenCanvas, 
				  srcX, srcY, canvas.width, canvas.height,
				  0, 0, canvas.width, canvas.height
				 );
}
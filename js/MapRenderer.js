class MapRenderer {
	//the constructor receives the name of the current rendered map
	constructor(currentMapInstance) {
		this.canvasManager = CanvasManagerFactory();
		
		this.currentMapName = currentMapInstance;
		
		MapRenderer.MAP_INSTANCES[currentMapInstance].on("movedMap", 
											  this.draw.bind(this));
	}
}

MapRenderer.MAP_INSTANCES = {};

_p = MapRenderer.prototype;

_p.draw = function() {
	var ctx = this.canvasManager.ctx,
		canvas = this.canvasManager.canvas,
		mapName = this.currentMapName,
		mapInstance = MapRenderer.MAP_INSTANCES[mapName],
		tilesMatrices = mapInstance.tilesMatrices,
		mapX = mapInstance.mapX,
		mapY = mapInstance.mapY,
		tilesets = mapInstance.tilesetsWorkfiles,
		tileSize = mapInstance.tileSize;
	
	ctx.clearRect(0, 0, canvas.width, canvas.height);
	
	for (let tilesMatrix of tilesMatrices) {
		for (let i = 0; i < tilesMatrix.length; i++) {
			for (let j = 0; j < tilesMatrix[i].length; j++) {
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
					destX = mapX + j * tileSize,
					destY = mapY + i * tileSize;

				ctx.drawImage(
					usedTileset["image"], 
					srcX, srcY, tileSize, tileSize,
					destX, destY, tileSize, tileSize
				);
			}
		}
	}
	
}
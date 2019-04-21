const LAST_ANIMATION_TIME = "lastAnimationTime", FRAME_DURATION = "duration";

class MapRenderer {
	//the constructor receives the name of the current rendered map
	constructor(currentMapName) {
		this.canvasManager = CanvasManagerFactory();
		
		this.changeMap(currentMapName);
		
		//the offscreen buffer has extra 10 tiles in every direction
		//so it is bigger than the visible canvas
		this.extraBufferTiles = 10;
		
		var tileSize = this.currentMapInstance.tileSize;
		
		this.canvasManager.makeOffscreenBufferBigger(
			(this.extraBufferTiles * 2) * tileSize,
			(this.extraBufferTiles * 2) * tileSize
		);
		
		//flag only for debugging
		this._showCollisions_ = false;
		
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

_p.showCollisions = function() {
	this._showCollisions_ = true;
}

_p.changeMap = function(mapName) {
	this.currentMapName = mapName;
	this.currentMapInstance = MapRenderer.MAP_INSTANCES[mapName];
		
	//offDirty flag tells if the offscreenBuffer canvas should be redrawn
	this.offDirty = true;
}

_p.checkIfDirty = function() {
	var visArea = this.visibleTileArea,
		offVisArea = this.offScreenVisibleTileArea,
		mapInst = this.currentMapInstance;
	
	if (visArea.startX < offVisArea.startX || visArea.startY < offVisArea.startY 
		|| (visArea.endX >= offVisArea.endX && offVisArea.endX != mapInst.mapWidth)
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
		startX : Math.abs(mI.mapX) / tileSize,
		startY : Math.abs(mI.mapY) / tileSize,
		endX : Math.min(
			(- mI.mapX + viewportWidth) / tileSize, mI.mapWidth
		),
		endY : Math.min(
			(- mI.mapY + viewportHeight) / tileSize, mI.mapHeight
		)
	}
	
	//console.log("START X = " + this.visibleTileArea.startX);
	//console.log("START Y = " + this.visibleTileArea.startY);
	//if (this.offScreenVisibleTileArea){
	//console.log("OFF START X = " + this.offScreenVisibleTileArea.startX);
	//console.log("OFF START Y = " + this.offScreenVisibleTileArea.startY);}
	
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

_p.drawOffScreenAnimatedTiles = function() {
	var mapInst = this.currentMapInstance,
		stX = this.offScreenVisibleTileArea.startX,
		stY = this.offScreenVisibleTileArea.startY,
		eX = this.offScreenVisibleTileArea.endX,
		eY = this.offScreenVisibleTileArea.endY;
	
	if (!this.startOfAnimation) {
		this.startOfAnimation = new Date().getTime();
	}
	
	for (let animationArr of mapInst.animationsArr) {
		let i = animationArr[POSITION_IN_MATRIX].i,
			j = animationArr[POSITION_IN_MATRIX].j;
		
		if (i < stY || i > eY || j < stX || j > eX) {
			continue;
		}
		
		let currFrame = animationArr[CURRENT_FRAME],
			frameDuration = animationArr[currFrame][FRAME_DURATION],
			timeNow = new Date().getTime();
		
		var newFrame = 
			Math.floor(
				(timeNow - this.startOfAnimation) / frameDuration
			) % animationArr.length;
		
		if (newFrame != currFrame) {
			currFrame = newFrame;
			animationArr[CURRENT_FRAME] = currFrame;
			animationArr[CURRENT_ID] = animationArr[currFrame].tileid;
			
			this.drawOffScreenTile(i, j, animationArr[DEFAULT_TILE]);
			
			let tileNo = animationArr[CURRENT_ID],
				tileSize = mapInst.tileSize,
				tilesPerRow = animationArr[JSON_TILESET_WORKFILE][TILES_PER_ROW],
				srcX = (tileNo % tilesPerRow) * tileSize,
				srcY = Math.floor(tileNo / tilesPerRow) * tileSize,
				destX = (j - stX) * tileSize,
				destY = (i - stY) * tileSize,
				offCtx = CanvasManagerFactory().offScreenCtx;

			offCtx.drawImage(
				animationArr[TILESET_IMAGE], 
				srcX, srcY, tileSize, tileSize,
				destX, destY, tileSize, tileSize
			);
			
		}
	}
}

//draws all of the layers of a tile without animated ones
_p.drawOffScreenTile = function(i, j, animatedId) {
	var offCtx = this.canvasManager.offScreenCtx,
		canvas = this.canvasManager.offScreenBuffer,
		mapInstance = this.currentMapInstance,
		tilesMatrices = mapInstance.tilesMatrices,
		mapX = mapInstance.mapX,
		mapY = mapInstance.mapY,
		tilesets = mapInstance.tilesetsWorkfiles,
		tileSize = mapInstance.tileSize;
	
	var stX = this.offScreenVisibleTileArea.startX,
		stY = this.offScreenVisibleTileArea.startY,
		eX = this.offScreenVisibleTileArea.endX,
		eY = this.offScreenVisibleTileArea.endY;
	
	// for every layer of tiles
	for (let tilesMatrix of tilesMatrices) {
		let tileNo = tilesMatrix[i][j],
			usedTileset;
		
		// NO_TILE means an empty tile
		if (tileNo == NO_TILE) {
			continue;
		}

		// going through all objects of tilesets used at the end of the map.json file
		// looking at the "firstgid" property to understand to which tileset the current tile belongs to
		for (let tilesetInd = 0; tilesetInd < tilesets.length - 1; tilesetInd++) {
			let currTileset = tilesets[tilesetInd],
				nextTileset = tilesets[tilesetInd + 1];

			//the tile to be drawn belongs to the currentTileset
			if (tileNo >= currTileset[FIRST_TILE_NUMBER] && tileNo < nextTileset[FIRST_TILE_NUMBER]) {
				usedTileset = currTileset;
				break;
			}
		}

		// the loop through the tilesets object didn't find two consecutive firgid properties
		// to fit the used tile number in so probably
		// the current tile is from the last tileset in the tilesets array
		if (!usedTileset) {
			usedTileset = tilesets[tilesets.length - 1];	
		}

		// the actual tileNo in the actual tileset.json is the id from the map data - firstgid number
		tileNo -= usedTileset[FIRST_TILE_NUMBER];
		
		// skipping the animated tile
		if (tileNo == animatedId) {
			continue;
		}
		
		// doing some quick maths to know which tile to draw and where
		let tilesPerRow = usedTileset.JSONobject[TILES_PER_ROW],
			srcX = (tileNo % tilesPerRow) * tileSize,
			srcY = Math.floor(tileNo / tilesPerRow) * tileSize,
			destX = (j - stX) * tileSize,
			destY = (i - stY) * tileSize;
		
		if ("opacity" in tilesMatrix && tilesMatrix["opacity"] != 1) {
			offCtx.save();
			offCtx.globalAlpha = tilesMatrix["opacity"];
		}
		
		offCtx.drawImage(
			usedTileset["image"], 
			srcX, srcY, tileSize, tileSize,
			destX, destY, tileSize, tileSize
		);
		
		if ("opacity" in tilesMatrix && tilesMatrix["opacity"] != 1) {
			offCtx.restore();
		}
		
		// showing the collision tiles with red in debugging mode
		if (this._showCollisions_ && mapInstance.collisionMatrix[i][j]) {
			let color = "rgba(255, 0, 0, 0.2)";

			offCtx.fillStyle = color;
			offCtx.fillRect(destX, destY, tileSize, tileSize);
		}
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
	
	var stX = Math.floor(this.offScreenVisibleTileArea.startX),
		stY = Math.floor(this.offScreenVisibleTileArea.startY),
		eX = Math.ceil(this.offScreenVisibleTileArea.endX),
		eY = Math.ceil(this.offScreenVisibleTileArea.endY);
	
	for (let i = stY; i < eY; i++) {
		for (let j = stX; j < eX; j++) {
			// drawing all the tiles on each layer
			this.drawOffScreenTile(i, j, NaN);
		}
	}
	
	this.drawOffScreenObjects();
	
	// redrew evth so the offScreenCanvas is not dirty anymore
	this.offDirty = false;
}

// the function that draws all drawableObjects in mapInstance if they are in sight
_p.drawOffScreenObjects = function() {
	var mapInst = this.currentMapInstance,
		tileSize = mapInst.tileSize,
		stX = this.offScreenVisibleTileArea.startX * tileSize,
		stY = this.offScreenVisibleTileArea.startY * tileSize,
		eX = this.offScreenVisibleTileArea.endX * tileSize,
		eY = this.offScreenVisibleTileArea.endY * tileSize,
		offCtx = CanvasManagerFactory().offScreenCtx;
	
	// we keep count of the drawn objects for later checks
	// e.g. checking player collision against them
	this.lastDrawnObjects = [];
	
	for (let obj of mapInst.drawableObjects) {
		// we are getting the filepath src of the template object workfile as this is the
		// key of the template object details in mapInstance.objectTemplates dictionary
		let src = obj["template"],
			templateObj = mapInst.objectTemplates[src],
			objwidth = templateObj.width, objheight = templateObj.height;
		
		// skipping this object as it is not in sight
		if (obj.x + objwidth < stX || obj.x - objwidth > eX || obj.y + objheight < stY || obj.y - objheight > eY) {
			continue;
		}
		
		this.lastDrawnObjects.push(obj);
		
		// for some reason the x, y coords given by Tiled are the coords of the bottom left corner of the object
		offCtx.drawImage(templateObj.image, obj.srcX, obj.srcY, objwidth, objheight,
						obj.x - stX, obj.y - stY - objheight, objwidth, objheight);
	}
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
	
	this.drawOffScreenAnimatedTiles();
	
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


/*
    all the functions that translate coords receive
    a coords object of the form {x : (x coordinate), y : (y coordinate)}
    and return an object of the same form
*/
_p.screenCoordsToMapCoords = function(coords) {
    var mapInstance = this.currentMapInstance,
        mapX = mapInstance.mapX,
        mapY = mapInstance.mapY,
        
        new_coords = {
            x : coords.x + Math.abs(mapX),
            y : coords.y + Math.abs(mapY)
        }
    
    return new_coords;
}

_p.mapCoordsToScreenCoords = function(coords) {
    var mapInstance = this.currentMapInstance,
        mapX = mapInstance.mapX,
        mapY = mapInstance.mapY,
        
        new_coords = {
            x : coords.x - Math.abs(mapX),
            y : coords.y - Math.abs(mapY)
        }
    
    return new_coords;
}

_p.mapCoordsToTileCoords = function(coords) {
    var mapInstance = this.currentMapInstance;
    
    var tile_coords = {
        x : Math.floor(coords.x / mapInstance.tileSize),
        y : Math.floor(coords.y / mapInstance.tileSize)
    }
    
    return tile_coords;
}

_p.tileCoordsToMapCoords = function(coords) {
    var mapInstance = this.currentMapInstance,
        new_coords = {
            x : coords.x * mapInstance.tileSize,
            y : coords.y * mapInstance.tileSize
        }
    
    return new_coords;
}

_p.screenCoordsToTileCoords = function(coords) {
    return this.mapCoordsToTileCoords(this.screenCoordsToMapCoords(coords));
}

_p.tileCoordsToScreenCoords = function(coords) {
    var new_coords = this.mapCoordsToScreenCoords(this.tileCoordsToMapCoords(coords));
    
    new_coords.x = Math.max(new_coords.x, 0);
    new_coords.y = Math.max(new_coords.y, 0);
    
    return new_coords;
}

// function to move map from mapInstance
_p.moveMap = function(deltaX, deltaY) {
    this.currentMapInstance.moveMap(deltaX, deltaY);
}

_p.getLastDrawnObjects = function() {
	return this.lastDrawnObjects;
}

_p.getTemplateObjects = function() {
	return this.currentMapInstance.objectTemplates;
}
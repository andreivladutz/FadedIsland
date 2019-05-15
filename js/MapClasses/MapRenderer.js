"use strict";
const LAST_ANIMATION_TIME = "lastAnimationTime", FRAME_DURATION = "duration";

class MapRenderer extends EventEmiter {
	//the constructor receives the name of the current rendered map
	constructor(currentMapName, playerReference) {
		super();
		this.canvasManager = CanvasManagerFactory();

		// special canvas for drawing objects on it
		this.objectCanvas = document.createElement("CANVAS");
		this.objectCtx = this.objectCanvas.getContext("2d");

		this.changeMap(currentMapName);

		this.playerReference = playerReference;

		//the offscreen buffer has extra 10 tiles in every direction
		//so it is bigger than the visible canvas
		this.extraBufferTiles = 10;
		
		let tileSize = this.currentMapInstance.tileSize;
		
		this.canvasManager.makeOffscreenBufferBigger(
			(this.extraBufferTiles * 2) * tileSize,
			(this.extraBufferTiles * 2) * tileSize
		);
		
		//flag only for debugging
		this._showCollisions_ = false;
		
		// map instance interaction points that are in proximity to the player
		this.visibleInteractionPoints = [];
		
		let self = this;
		this.canvasManager.addEventListener(
			CANVAS_RESIZE_EVENT,
			function(e) {
				self.offDirty = true;
				
				// in case we zoom out and are at the right end of the map we need to move the map
				// so the end of the map is at the viewport width, otherwise we would see a white margin
				if (self.currentMapInstance && e.detail === ZOOMED_OUT) {
					self.moveMap(0, 0);
				}
			}
		);
	}
}

// dictionary of initialised mapInstances
MapRenderer.MAP_INSTANCES = {};
MapRenderer.CHANGED_MAP_EVENT = "changedMap";
MapRenderer.REDRAWN_OFFSCREEN = "redrawnOffscreen";

MapRenderer.ROOM_OVERLAY_OPACITY = 0.95;

_p = MapRenderer.prototype;

// the player will inform the mapRenderer that it changed the old room
_p.changedRoom = function() {
	this.offDirty = true;
};

_p.showCollisions = function() {
	this._showCollisions_ = true;
};

_p.changeMap = function(mapName) {
	let oldMapName = this.currentMapName;
	
	this.currentMapName = mapName;
	this.currentMapInstance = MapRenderer.MAP_INSTANCES[mapName];
		
	// offDirty flag tells if the offscreenBuffer canvas should be redrawn
	this.offDirty = true;
	
	// RESET EVERYTHING
	this.offScreenVisibleTileArea = null;
	this.visibleTileArea = null;
	this.visibleInteractionPoints = [];
	this.lastDrawnObjects = [];
	
	
	this.emit(MapRenderer.CHANGED_MAP_EVENT, {
		oldMap: oldMapName,
		newMap: mapName
	});
};

_p.checkIfDirty = function() {
	let visArea = this.visibleTileArea,
		offVisArea = this.offScreenVisibleTileArea,
		mapInst = this.currentMapInstance;
	
	if (visArea.startX < offVisArea.startX || visArea.startY < offVisArea.startY 
		|| (visArea.endX >= offVisArea.endX && offVisArea.endX !== mapInst.mapWidth)
		|| (visArea.endY >= offVisArea.endY && offVisArea.endY !== mapInst.mapHeight)) {
		
		this.offDirty = true;
	}
	
	return this.offDirty;
};

_p.computeOffScreenBufferVisibleArea = function() {
	let mI = this.currentMapInstance,
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
};

_p.computeVisibleTileArea = function() {
	let mI = this.currentMapInstance,
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
};

_p.drawOffScreenAnimatedTiles = function() {
	let mapInst = this.currentMapInstance,
		stX = this.offScreenVisibleTileArea.startX,
		stY = this.offScreenVisibleTileArea.startY,
		eX = this.offScreenVisibleTileArea.endX,
		eY = this.offScreenVisibleTileArea.endY;
	
	/* 
	 *	the first call to this function instantiates a timer and one Animator utility for each animated tile
	 *	which are then used at later calls to update the frames of the animations
	 */
	if (!this.animationTimer) {
		this.animationTimer = new Timer();
	}
	
	for (let animationArr of mapInst.animationsArr) {
		let i = animationArr[POSITION_IN_MATRIX].i,
			j = animationArr[POSITION_IN_MATRIX].j;
		
		let currFrame = animationArr[CURRENT_FRAME],
			frameCount = animationArr.length;
		
		// no animator instance for this animated tile so we create one 
		if (!animationArr._ANIMATOR) {
			let frameDuration = animationArr[currFrame][FRAME_DURATION];
			
			// we init the ._ANIMATOR with the total duration of the animation
			animationArr._ANIMATOR = new Animator(frameDuration * frameCount);
			// all animations are infinite i.e. after they end they start again
			animationArr._ANIMATOR.setRepeatCount(Animator.INFINITE);
			// start the animator
			animationArr._ANIMATOR.start();
		}
		
		/*
		 *	There's only a global timer for all the animated tiles so we send it as 
		 *	a parameter to each animator, updating the internal lastUpdateTime only after
		 *	all the animated tiles have been drawn (so they keep the same rythm and are all synchronized)
		 */
		let newFrame = Math.floor(
			animationArr._ANIMATOR.update(this.animationTimer) * frameCount
		);
		
		// if the frame changed we have to draw the new frame
		if (newFrame !== currFrame) {
			currFrame = newFrame;
			animationArr[CURRENT_FRAME] = currFrame;
			animationArr[CURRENT_ID] = animationArr[currFrame].tileid;
			
			// update all Animations but if they are out of sight do not redraw them 
			if (i < stY || i > eY || j < stX || j > eX) {
				continue;
			}
			
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

			// hide rooms
			let currRoom = this.playerReference.currentRoom,
				tileRooms = this.currentMapInstance.tileToRooms;

			// if there aren't rooms then return
			if (!this.mapHasRooms() || tileRooms[i][j] === currRoom) {
				continue;
			}

			offCtx.save();
			offCtx.globalAlpha = MapRenderer.ROOM_OVERLAY_OPACITY;

			offCtx.fillStyle = "black";
			offCtx.fillRect(destX, destY, tileSize, tileSize);

			offCtx.restore();
			
		}
	}
	
	// when the *for loop* which updates all animated tiles ended it's time to update the global timer ->
	// we have just updated all the tiles so the lastUpdate time is right now
	this.animationTimer.lastUpdatedNow();
};

//draws all of the layers of a tile without animated ones
_p.drawOffScreenTile = function(i, j, animatedId) {
	let offCtx = this.canvasManager.offScreenCtx,
		mapInstance = this.currentMapInstance,
		tilesMatrices = mapInstance.tilesMatrices,
		tileSize = mapInstance.tileSize;
	
	let stX = this.offScreenVisibleTileArea.startX,
		stY = this.offScreenVisibleTileArea.startY,
		destX = (j - stX) * tileSize,
		destY = (i - stY) * tileSize;
	
	// for every layer of tiles
	for (let tilesMatrix of tilesMatrices) {
		/*
		 * now that tiles layers are kept as sparse matrices we first have to check
		 * if the row of the tile we want to draw really exists or is full of null tiles
		 */
		
		//AND
		
		/*
		 * we check if our tile is an empty tile and if it is we skip it
		 * BEFORE: it was equal to zero but NOW: we don't keep the null tiles in memory anymore
		 * so if it was a NO_TILE (i.e. equal to 0) now it simply doesn't exist in the sparse matrix
		 */
		if (!tilesMatrix[i] || !tilesMatrix[i][j]) {
			continue;
		}
		
		let tileNo = tilesMatrix[i][j].value;
		
		/*
			usedTileset is the tileset which the current tile belongs to from tilesetWorkfiles
		*/
		let usedTileset = tilesMatrix[i][j].usedTileset;
		// the actual tileNo in the actual tileset.json is the id from the map data - firstgid number
		tileNo -= usedTileset[FIRST_TILE_NUMBER];
		
		// skipping the animated tile
		if (tileNo == animatedId) {
			continue;
		}
		
		// doing some quick maths to know which tile to draw and where
		let tilesPerRow = usedTileset.JSONobject[TILES_PER_ROW],
			srcX = (tileNo % tilesPerRow) * tileSize,
			srcY = Math.floor(tileNo / tilesPerRow) * tileSize;
		
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

	// after drawing all layers for this tile we check the logic needed for hiding rooms
	let currRoom = this.playerReference.currentRoom,
		tileRooms = this.currentMapInstance.tileToRooms;

	// if there aren't rooms then return
	if (!this.mapHasRooms() || tileRooms[i][j] === currRoom) {
		return;
	}

	offCtx.save();
	offCtx.globalAlpha = MapRenderer.ROOM_OVERLAY_OPACITY;

	offCtx.fillStyle = "black";
	offCtx.fillRect(destX, destY, tileSize, tileSize);

	offCtx.restore();
};

_p.redrawOffscreenBuffer = function() {
	let offCtx = this.canvasManager.offScreenCtx,
		canvas = this.canvasManager.offScreenBuffer;
	
	offCtx.clearRect(0, 0, canvas.width, canvas.height);
	
	let stX = Math.floor(this.offScreenVisibleTileArea.startX),
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
};

// the function that draws all drawableObjects in mapInstance if they are in sight
_p.drawOffScreenObjects = function() {
	let mapInst = this.currentMapInstance,
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

		// creating a unique id so we always know the lastDrawnObject
		let currObjIdentifier = obj["template"] + obj.srcX + obj.srcY;

		// if this object is not in the same room as the player hide it
		if (this.mapHasRooms() && obj.roomNumber !== this.playerReference.currentRoom) {
			currObjIdentifier += "hidden";
		}

		// if we have already drawn this object don't redraw it
		if (this.lastDrawnObject !== currObjIdentifier) {
			this.lastDrawnObject = currObjIdentifier;
			// we're first drawing the object on another hidden canvas because if it's in a hidden room
			// we want to hide the image of the object (note that the image of the object has transparent margins)
			// without hiding the whole rectangle of the object (just the visible part, without transparent margins)
			this.objectCanvas.width = objwidth, this.objectCanvas.height = objheight;
			this.objectCtx.drawImage(templateObj.image, obj.srcX, obj.srcY, objwidth, objheight,
				0, 0, objwidth, objheight);

			this.objectCtx.save();
			this.objectCtx.globalCompositeOperation = "source-atop";

			// if this object is not in the same room as the player hide it
			if (this.mapHasRooms() && obj.roomNumber !== this.playerReference.currentRoom) {
				this.objectCtx.globalAlpha = MapRenderer.ROOM_OVERLAY_OPACITY;

				this.objectCtx.fillStyle = "black";
				this.objectCtx.fillRect(0, 0, objwidth, objheight);
			}

			this.objectCtx.restore();
		}

		// for some reason the x, y coords given by Tiled are the coords of the bottom left corner of the object
		offCtx.drawImage(this.objectCanvas, 0, 0, objwidth, objheight,
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
		
		// compute the interaction points that are close to the player
		this.setVisibleInteractionPoints();
		// and if there are any points in proximity inform the player
		if (this.visibleInteractionPoints.length) {
			this.emit(MapRenderer.REDRAWN_OFFSCREEN, this.visibleInteractionPoints);
		}
	}
	
	this.drawOffScreenAnimatedTiles();
	
	let offStX = this.offScreenVisibleTileArea.startX,
		offStY = this.offScreenVisibleTileArea.startY,
		stX = this.visibleTileArea.startX,
		stY = this.visibleTileArea.startY;
	
	let ctx = this.canvasManager.ctx,
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
};


/*
	when we redraw the offscreenBuffer we also compute the interaction points that are in proximity
 */
_p.setVisibleInteractionPoints = function() {
	let mapInst = this.currentMapInstance,
		tileSize = mapInst.tileSize,
		stX = this.offScreenVisibleTileArea.startX * tileSize,
		stY = this.offScreenVisibleTileArea.startY * tileSize,
		eX = this.offScreenVisibleTileArea.endX * tileSize,
		eY = this.offScreenVisibleTileArea.endY * tileSize;
	
	this.visibleInteractionPoints = [];
	
	for (let point of mapInst.interactionPoints) {
		let x = point.x, y = point.y;
		
		if (x < stX || x > eX || y < stY || y > eY) {
			continue;
		}
		
		this.visibleInteractionPoints.push(point);
	}
};

/*
    all the functions that translate coords receive
    a coords object of the form {x : (x coordinate), y : (y coordinate)}
    and return an object of the same form
*/
_p.screenCoordsToMapCoords = function(coords) {
    let mapInstance = this.currentMapInstance,
        mapX = mapInstance.mapX,
        mapY = mapInstance.mapY,
        
        new_coords = {
            x : coords.x + Math.abs(mapX),
            y : coords.y + Math.abs(mapY)
        };
    
    return new_coords;
}

_p.mapCoordsToScreenCoords = function(coords) {
    var mapInstance = this.currentMapInstance,
        mapX = mapInstance.mapX,
        mapY = mapInstance.mapY,
        
        new_coords = {
            x : coords.x - Math.abs(mapX),
            y : coords.y - Math.abs(mapY)
        };
    
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
    let mapInstance = this.currentMapInstance,
        new_coords = {
            x : coords.x * mapInstance.tileSize,
            y : coords.y * mapInstance.tileSize
        };
    
    return new_coords;
};

_p.screenCoordsToTileCoords = function(coords) {
    return this.mapCoordsToTileCoords(this.screenCoordsToMapCoords(coords));
};

_p.tileCoordsToScreenCoords = function(coords) {
    let new_coords = this.mapCoordsToScreenCoords(this.tileCoordsToMapCoords(coords));
    
    new_coords.x = Math.max(new_coords.x, 0);
    new_coords.y = Math.max(new_coords.y, 0);
    
    return new_coords;
};

// function to move map from mapInstance
_p.moveMap = function(deltaX, deltaY) {
    this.currentMapInstance.moveMap(deltaX, deltaY);
};

_p.setMapCoords = function(mapX, mapY) {
	this.currentMapInstance.mapX = 0;
	this.currentMapInstance.mapY = 0;
	
	this.currentMapInstance.moveMap(mapX, mapY);
};

_p.getViewportSize = function() {
	return {
		width : this.currentMapInstance.viewportWidth,
		height : this.currentMapInstance.viewportHeight
	};
};

_p.getMapWidth = function() {
	return this.currentMapInstance.mapWidth * this.currentMapInstance.tileSize;
};

_p.getMapHeight = function() {
	return this.currentMapInstance.mapHeight * this.currentMapInstance.tileSize;
};

_p.getLastDrawnObjects = function() {
	return this.lastDrawnObjects;
};

_p.getTemplateObjects = function() {
	return this.currentMapInstance.objectTemplates;
};

_p.getCurrentMapName = function() {
	return this.currentMapInstance.mapName;
};

_p.getRoomChangingPoints = function() {
	return this.currentMapInstance.roomChangePoints;
};

_p.mapHasRooms = function() {
	// if we found room rectangles then this map has rooms
	return this.currentMapInstance.roomRectangles.length > 0;
};

// get the matrix of tiles mapped to each room
_p.getTilesToRooms = function() {
	return this.currentMapInstance.tileToRooms;
};
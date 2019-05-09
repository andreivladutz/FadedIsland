"use strict";
const FRAME_WIDTH = 64, FRAME_HEIGHT = 64,
	  ACTUAL_PLAYER_WIDTH = 32,
      FRAME_ROW = 8;

var interval, counter = 0;


var RESOURCES = [
    {
        name: "playerBody1",
        itemType: "img",
        url: "./img/player/playerBody1.png"
    },
    {
        name: "bodyArmour1",
        itemType: "img",
        url: "./img/armour/bodyArmour1.png"
    },
    {
        name: "bootsArmour1",
        itemType: "img",
        url: "./img/armour/bootsArmour1.png"
    },
    {
        name: "armsArmour1",
        itemType: "img",
        url: "./img/armour/armsArmour1.png"
    },
    {
        name: "helmArmour1",
        itemType: "img",
        url: "./img/armour/helmArmour1.png"
    },
    {
        name: "pantsArmour1",
        itemType: "img",
        url: "./img/armour/pantsArmour1.png"
    },
];


class Player {
    constructor(loadedPromisesArr, customResources) {
        this.canvas = CanvasManagerFactory().canvas;
        this.ctx = CanvasManagerFactory().ctx;
        
        this.speed = 5;
        this.power = 20; // attack power
		
		/* 
		 * we keep timers for frame changing and coordinate updating 
		 * at determined intervals of time.
		 * 
		 * UPDATE: we no longer keep timers for coordinate updating
		 */
		this.walkAnimationTimer = null;
		// this.walkMovementTimer = null;

		// coords corespond to feet area
		this.coordX = this.canvas.width / 2;
		this.coordY = this.canvas.height / 2;
        this.coordBodyY = this.coordY - FRAME_HEIGHT / 5; // y coord for body, collision when going up
		
		// the drawing coords are screen coords but we also have to keep count 
		// of the map coords of the player. they are initialised when setMapRenderer is called
		this.mapCoordX = this.mapCoordY = 0;
        
        // loading player sprite
        this.resLoader = new ResourceLoader();
        this.resLoader.add(RESOURCES);
        
        // column, row for specific frame in sprite
        // expected order for frames top-down: up/0, left/1, down/2, right/3
        // default for down movement frame
        this.row = FRAME_ROW + Player.DOWNWARD_DIRECTION;
        this.column = Player.STANDSTILL_POSITION;

		// we keep the global promises array so we can use it in waitOn utility 
		this.globalPromisesArr = loadedPromisesArr;
		
		// save the propertiesNames for resources that are non-null
		// this way we can draw the actor by piece using the propertyName
		this.propertiesNames = [];
		
		/*
		 *	the constructor for the Actor accepts an object like this :
		 *
		 *	{
		 *		"base" : "resourceName",
		 *		"hair" : "resourceName",
		 *		"bootsArmour" : "resourceName",
		 *		"feetArmour" : "resourceName",
		 *		"bodyArmour" : "resourceName",
		 *		"armsArmour" : "resourceName",
		 *		"headArmour" : "resourceName"
		 *	}
		 *
		 * IF ONE RESOURCE IS MISSING IT SHOULD BE SET TO NULL e.g.
		 *		"bodyArmour" : null,
		 */
		for (let propertyName in customResources) {
			let resourceName = customResources[propertyName];
			
			if (resourceName !== null) {
				// wait for the resource to load
				this.waitOn(resourceName, propertyName);
				
				this.propertiesNames.push(propertyName);
			}
			else {
				delete customResources[propertyName];
			}
		}
        
        this.resLoader.load();
		this.initAnimators();
		
		var self = this;
		
		// the event comes with the type of the zoom -> in or out
		CanvasManagerFactory().addEventListener(CANVAS_RESIZE_EVENT, function() {
			if (!self.mapRenderer) {
				return;
			}
			
			self.updateCoordsOnResize();
		});
	}
}

// duration of one frame in ms
Player.MOVEMENT_DURATION = 80;
// number of frames for walking animation 
// ALTHOUGH THE FIRST ONE IS STANDSTILL POSITION 
// WHICH WE WILL IGNORE WHEN WALKING!!!
Player.WALK_MAX_COLUMNS = 9;

// launching "fake" keypresses so they are launched as uniformly as possible
Player.KEYDOWN_INTERVAL_DELAY = 16;

// standstill column
Player.STANDSTILL_POSITION = 0;
// the order of spritesheet directions in the image
Player.UPWARD_DIRECTION = 0;
Player.DOWNWARD_DIRECTION = 2;
Player.LEFT_DIRECTION = 1;
Player.RIGHT_DIRECTION = 3;

_p = Player.prototype;

// small utility to transform a name like FooName to fooName
function getLowerCaseName(name) {
	return name.charAt(0).toLowerCase() + name.substr(1);
}

/*
	this utility promisifies a listener for a resource with resourceName,
	pushes it to the global waiting array of promises and resolves when loading
	has finished, adding the image object on this object under the name of propertyName
	
	by default the resourceName passed should be PascalCase and the property will be
	the camelCase version of the resourceName. you can also specify a different propertyName
*/
_p.waitOn = function(resourceName, propertyName = getLowerCaseName(resourceName)) {
	var self = this;
	
	function loadedResource(resolveFunc, rejectFunc) {
		self.resLoader.on("loaded" + resourceName, function(e) {
			// the image is also passed as an event so we don't 
			// need to call the get method on resLoader 
			self[propertyName] = e.detail;
			
			resolveFunc();
		});
		
		// the global promises array will reject with this error
		self.resLoader.on("error" + resourceName, function(err) {
			rejectFunc(err);
		});
	}
	
	this.globalPromisesArr.push(promisify(loadedResource));
}

// initialise all animators
_p.initAnimators = function() {
	// separate animator for the walking animation (the frame animation)
	// the total duration of one movement loop
	// WALK_COLUMNS - 1 bc we ignore the standstill position
	this.walkingFrameAnimator = new Animator(Player.MOVEMENT_DURATION * (Player.WALK_MAX_COLUMNS - 1));
	// infinite animation, we use the start and stop methods on this animator 
	// to stop and resume the walk animation
	this.walkingFrameAnimator.setRepeatCount(Animator.INFINITE);
}

_p.drawSpriteFrame = function(image) {
	var drawCoordX = Math.floor(this.coordX - FRAME_WIDTH / 2),
		drawCoordY = Math.floor(this.coordY - FRAME_HEIGHT);
	
	this.ctx.drawImage(image, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       drawCoordX, drawCoordY, FRAME_WIDTH, FRAME_HEIGHT);
}

_p.draw = function() {
    // draw the pieces of the actor
	for (let propertyName of this.propertiesNames) {
		this.drawSpriteFrame(this[propertyName]);
	}
}

_p.setMapRenderer = function(mapRenderer) {
    this.mapRenderer = mapRenderer;
	this.updateMapCoords();
}

_p.setMapCoords = function(mapCoordX, mapCoordY) {
	this.mapCoordX = mapCoordX;
	this.mapCoordY = mapCoordY;
}

// when the screen coords are updated this function should be called too
_p.updateMapCoords = function() {
	({x: this.mapCoordX, y: this.mapCoordY} = this.mapRenderer.screenCoordsToMapCoords({x: this.coordX, y: this.coordY}));
}

/*
	having given some map coordinates we move the map and compute player screen coords 
	such that the player will be at the given coords on the map
 */
_p.movePlayerToMapCoords = function(x, y) {
	var midX = this.canvas.width / 2, midY = this.canvas.height / 2,
		mapWidth = this.mapRenderer.getMapWidth(), mapHeight = this.mapRenderer.getMapHeight(),
		mapMovedX, mapMovedY;
	
	// set X COORDS
	if (x < midX) {
		mapMovedX = 0;
		this.coordX = x;
	}
	else if (x >= mapWidth - midX) {
		mapMovedX = mapWidth - this.canvas.width;
		this.coordX = x - mapMovedX;
	}
	else {
		mapMovedX = x - midX;
		this.resetXCoordsToCenter();
	}
	
	// set Y COORDS
	if (y < midY) {
		mapMovedY = 0;
		this.coordY = y;
	}
	else if (y >= mapHeight - midY) {
		mapMovedY = mapHeight - this.canvas.height;
		this.coordY = y - mapMovedY;
	}
	else {
		mapMovedY = y - midY;
		this.resetYCoordsToCenter();
	}
	
	// don't forget to update body coord
	this.coordBodyY = this.coordY - FRAME_HEIGHT / 5
	
	this.mapRenderer.setMapCoords(- Math.round(mapMovedX), - Math.round(mapMovedY));
	
	this.updateMapCoords();
}

/*
 * when the map changes or the screen size gets updated the screen coords change but the map coords 
 * should remain the same -> so we move the "camera" (actually the map). this way the player remains at the same map coords
 */ 
_p.updateCoordsOnResize = function(zoomType) {
	this.movePlayerToMapCoords(this.mapCoordX, this.mapCoordY);
}

// function to check if future tile to be walking on is obstacle or not
_p.checkCollision = function(x, y, cY = this.coordY, cX = this.coordX) { // x,y distance to be added | cX, cY coords to be added to
	/*
		player's feet make a segment and that segment can cross multiple tiles at once so we have
		to check the collision with all the crossed tiles at that moment
	*/
    var tileSize = this.mapRenderer.currentMapInstance.tileSize,
		leftTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x - ACTUAL_PLAYER_WIDTH / 2,
																	y: cY + y}),
		rightTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x + ACTUAL_PLAYER_WIDTH / 2,
																	 y: cY + y}),
		matrixCols = this.mapRenderer.currentMapInstance.collisionMatrix[0].length,
		matrixRows = this.mapRenderer.currentMapInstance.collisionMatrix.length;
	
	// make sure tile coords aren't out of bounds
	if (leftTileCoords.x < 0 || leftTileCoords.y < 0 || rightTileCoords.x >= matrixCols || rightTileCoords.y >= matrixRows) {
		return true;
	}
	
	// check all the crossed tiles
	for (let tileX = leftTileCoords.x; tileX <= rightTileCoords.x; tileX++) {
		// the y is the same for all crossed tiles
		if (this.mapRenderer.currentMapInstance.collisionMatrix[leftTileCoords.y][tileX]) {
			//debugger;
			return true;
		}
	}
	
	// checking collision against all objects with the feet segment of the player
	if (this.checkCollisionAgainstObjects(cX + x - ACTUAL_PLAYER_WIDTH / 2, cX + x + ACTUAL_PLAYER_WIDTH / 2, cY + y)) {
		return true;
	}
	
	// no collision with any tile was found
	return false;
}

// this functions checks the collision between the player and visible game objects
_p.checkCollisionAgainstObjects = function(lftPlyrX, rghtPlyrX, y) {
	/* 
		the player coords received by the function are screen coords
		so they need to be converted to map coords
	*/
	({x: lftPlyrX, y} = this.mapRenderer.screenCoordsToMapCoords({x : lftPlyrX, y}));
	({x: rghtPlyrX} = this.mapRenderer.screenCoordsToMapCoords({x : rghtPlyrX, y}));
	
	let visibleObjects = this.mapRenderer.getLastDrawnObjects(),
		templates = this.mapRenderer.getTemplateObjects();
	
	// checking against every object
	for (let obj of visibleObjects) {
		let src = obj["template"],
			correspTemplate = templates[src],
			width = correspTemplate.width,
			height = correspTemplate.height,
			lX = obj.x, rX = obj.x + width, bY = obj.y, uY = obj.y - height;
		
		if (rghtPlyrX >= lX && lftPlyrX <= rX && y >= uY && y <= bY) {
			return true;
		}
	}
	
	return false;
}

_p.resetXCoordsToCenter = function() {
    this.coordX = Math.floor(this.canvas.width / 2);
}

_p.resetYCoordsToCenter = function() {
    this.coordY = Math.floor(this.canvas.height / 2);
    this.coordBodyY = this.coordY - FRAME_HEIGHT / 5;
}

_p.updateMovementAnimation = function() {
	// if no movement timer has been created or it has been stopped by keyRelease()
	// another instance of Timer is created (so lastUpdateTime is reinitialised to now)
	if (!this.movementTimer && !this.walkAnimationTimer) {
		this.walkAnimationTimer = new Timer();
		
		this.walkingFrameAnimator.start();
	}
	
	// pass the timer to get the deltaTime and compute the frame that should be drawn right now
	// We get the number of a frame between 0 and NumberOfFrames - 1 which we offset by 1 so we skip the 0 frame which is STANDSTILL_POSITION
	this.column = Math.floor(this.walkingFrameAnimator.update(this.walkAnimationTimer) * (Player.WALK_MAX_COLUMNS - 1)) + 1;
	
	// we updated the frames now
	this.walkAnimationTimer.lastUpdatedNow();
}

// shouldCheckCollision is a flag used for performance reasons when we are sure there will be no collision
_p.moveUp = function(speed, shouldCheckCollision = true) {
	for(var i = speed; i >= 0; i--) {
        if (!shouldCheckCollision || !this.checkCollision(0, -i, this.coordBodyY, this.coordX)) { // if no collision
            // player movement
            if (this.mapRenderer.currentMapInstance.mapY == 0) { // canvas is at the top of the whole map
				this.coordBodyY = Math.max(this.coordBodyY - i, 4 * FRAME_HEIGHT / 5); // move only the player until it hits upper bound
				this.coordY = Math.max(this.coordY - i, FRAME_HEIGHT);
            }
            else {
                if (this.coordBodyY - i >= this.canvas.height / 2) { // player not centered on y-axis
                    this.coordBodyY -= i;
                    this.coordY -= i;
                }
                else {
                    this.resetYCoordsToCenter();
                    this.mapRenderer.moveMap(0, i);
                }   
            }
			
			this.updateMapCoords();
            return;
        }
    }
}

_p.moveDown = function(speed, shouldCheckCollision = true) {
	for(var i = speed; i >= 0; i--) {
        if(!shouldCheckCollision || !this.checkCollision(0, i)) { // if no collision
			// player movement
            var mapInstance = this.mapRenderer.currentMapInstance;
            var lowerBound = this.canvas.height - mapInstance.mapHeight * mapInstance.tileSize; // pseudo bound
            if(mapInstance.mapY == lowerBound) { // if canvas at pseudo lower bound aka bottom of canvas is at bottom of whole map
				this.coordY = Math.min(this.coordY + i, this.canvas.height);// move player until it hits lower bound
				this.coordBodyY = Math.min(this.coordBodyY + i, this.canvas.height - FRAME_HEIGHT / 5);
            }
            else {
                if(this.coordY + i <= this.canvas.height / 2) { // player not centered on y-axis
                    this.coordY += i;
                    this.coordBodyY += i;
                }
                else {
                    this.resetYCoordsToCenter();
                    this.mapRenderer.moveMap(0, -i); 
                }    
            }
			
			this.updateMapCoords();
            return;
        }
    }
}

_p.moveLeft = function(speed, shouldCheckCollision = true) {
	for(var i = speed; i >= 0; i--) {
        if(!shouldCheckCollision || !this.checkCollision(-i, 0, this.coordY, this.coordX)) { // if no collision
            // player movement
            if(this.mapRenderer.currentMapInstance.mapX == 0) { // canvas is at the left of the whole map
                this.coordX = Math.max(this.coordX - i, FRAME_WIDTH / 2); // move only player until hits left bound
            }
            else {
                if(this.coordX - i >= this.canvas.width / 2) // player not centered on x-axis
                    this.coordX -= i;
                else {
                    this.resetXCoordsToCenter();
                    this.mapRenderer.moveMap(i, 0);
                }      
            }
			
			this.updateMapCoords();
            return;
		}
		
    }
}

_p.moveRight = function(speed, shouldCheckCollision = true) {
	for(var i = speed; i >= 0; i--) {
        if (!shouldCheckCollision || !this.checkCollision(i, 0, this.coordY, this.coordX)) { // if no collision
            // player movement
            var mapInstance = this.mapRenderer.currentMapInstance;
            var rightBound = this.canvas.width - mapInstance.mapWidth * mapInstance.tileSize; // pseudo bound
			
            if(mapInstance.mapX == rightBound) {// if canvas at pseudo right bound aka right bound of canvas is at right bound of whole map
				this.coordX = Math.min(this.coordX + i, this.canvas.width - FRAME_WIDTH / 2);// move player until hits right bound
            }
            else {
                if(this.coordX + i <= this.canvas.width / 2) // player not centered on x-axis
                    this.coordX += i;
                else {
                    this.resetXCoordsToCenter();
                    this.mapRenderer.moveMap(-i, 0);                
                }
            }
		}
			
		this.updateMapCoords();
        return;
    }
}

_p.keyUp = function(e, speed = this.speed) {
	this.row = FRAME_ROW + Player.UPWARD_DIRECTION;
	this.updateMovementAnimation();
	
	
    this.moveUp(speed);
}

_p.keyDown = function(e, speed = this.speed) {
	this.row = FRAME_ROW + Player.DOWNWARD_DIRECTION;
	this.updateMovementAnimation();

    this.moveDown(speed);
}

_p.keyLeft = function(e, speed = this.speed) {
	// sprite animation
	this.row = FRAME_ROW + Player.LEFT_DIRECTION;
	this.updateMovementAnimation();
    	
    this.moveLeft(speed);
}

_p.keyRight = function(e, speed = this.speed) {
	// sprite animation
	this.row = FRAME_ROW + Player.RIGHT_DIRECTION;
	this.updateMovementAnimation();
	
   	this.moveRight(speed);
}

_p.keyUpRight = function(e) {
    this.keyUp(e, Math.round(this.speed * 0.7));
    this.keyRight(e, Math.round(this.speed * 0.7));
}

_p.keyUpLeft = function(e) {
    this.keyUp(e, Math.round(this.speed * 0.7));
    this.keyLeft(e, Math.round(this.speed * 0.7));
}

_p.keyDownRight = function(e) {
    this.keyDown(e, Math.round(this.speed * 0.7));
    this.keyRight(e, Math.round(this.speed * 0.7));
}

_p.keyDownLeft = function(e) {
    this.keyDown(e, Math.round(this.speed * 0.7));
    this.keyLeft(e, Math.round(this.speed * 0.7));
}

/* when all keys have been released we have to stop all the moving */
_p.keyRelease = function() {
    this.column = Player.STANDSTILL_POSITION;
	
	// stop the animator so it is resetted the next time the player starts moving again
	this.walkAnimationTimer = null;
	// this.walkMovementTimer = null;
	this.walkingFrameAnimator.stop();
}






























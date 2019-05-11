"use strict";



class Player extends Actor {
    constructor(loadedPromisesArr, customResources) {
        super(loadedPromisesArr, customResources);
        
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

_p = Player.prototype;



/*
	having given some map coordinates we move the map and compute player screen coords 
	such that the player will be at the given coords on the map
 */
// ramane
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

_p.resetXCoordsToCenter = function() {
    this.coordX = Math.floor(this.canvas.width / 2);
}

_p.resetYCoordsToCenter = function() {
    this.coordY = Math.floor(this.canvas.height / 2);
    this.coordBodyY = this.coordY - FRAME_HEIGHT / 5;
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
	this.row = FRAME_ROW + Actor.UPWARD_DIRECTION;
	this.updateMovementAnimation();
	
	
    this.moveUp(speed);
}

_p.keyDown = function(e, speed = this.speed) {
	this.row = FRAME_ROW + Actor.DOWNWARD_DIRECTION;
	this.updateMovementAnimation();

    this.moveDown(speed);
}

_p.keyLeft = function(e, speed = this.speed) {
	// sprite animation
	this.row = FRAME_ROW + Actor.LEFT_DIRECTION;
	this.updateMovementAnimation();
    	
    this.moveLeft(speed);
}

_p.keyRight = function(e, speed = this.speed) {
	// sprite animation
	this.row = FRAME_ROW + Actor.RIGHT_DIRECTION;
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
    this.column = Actor.STANDSTILL_POSITION;
	
	// stop the animator so it is resetted the next time the player starts moving again
	this.walkAnimationTimer = null;
	// this.walkMovementTimer = null;
	this.walkingFrameAnimator.stop();
}






























"use strict"

// sprite consts
const FRAME_WIDTH = 64, FRAME_HEIGHT = 64,
	  ACTUAL_ACTOR_WIDTH = 32,
      FRAME_ROW = 8;


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


class Actor {
    constructor(loadedPromisesArr, customResources) {
        this.canvas = CanvasManagerFactory().canvas;
        this.ctx = CanvasManagerFactory().ctx;
        
		// will be overwritten in the Player/Enemy classes
        this.speed = 0;
        this.power = 0; // attack power
		
		/* 
		 * we keep timers for frame changing and coordinate updating 
		 * at determined intervals of time.
		 * 
		 * UPDATE: we no longer keep timers for coordinate updating
		 */
		this.walkAnimationTimer = null;
		// this.walkMovementTimer = null;
        
        this.attackTimer = null;

		// coords corespond to feet area
		// just to see them in the constructor. they should be initialised accordingly!
		this.coordX = null;
		this.coordY = null;
        this.coordBodyY = null; // y coord for body, collision when going up
		
		// the drawing coords are screen coords but we also have to keep count 
		// of the map coords of the Actor.
		this.mapCoordX = this.mapCoordY = null;
        
        // loading Actor sprite
        this.resLoader = new ResourceLoader();
        this.resLoader.add(RESOURCES);
        
        // column, row for specific frame in sprite
        // expected order for frames top-down: up/0, left/1, down/2, right/3
        // default for down movement frame
        this.row = FRAME_ROW + Actor.DOWNWARD_DIRECTION;
        this.column = Actor.STANDSTILL_POSITION;

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
        
        // if both hair and helmet present, don't draw hair
        let hairIndex = this.propertiesNames.indexOf("hair");
        
        if (hairIndex != -1 && this.propertiesNames.indexOf("headArmour") != -1) {
            this.propertiesNames.splice(hairIndex, 1);
        }
        
        // set default attack type to dagger
        this.attackFrames = Actor.NO_FOR_DAGGER;
        
        this.resLoader.load();
		this.initAnimators();
    }

}


// duration of one frame in ms
Actor.MOVEMENT_DURATION = 80;
// number of frames for walking animation 
// ALTHOUGH THE FIRST ONE IS STANDSTILL POSITION 
// WHICH WE WILL IGNORE WHEN WALKING!!!
Actor.WALK_MAX_COLUMNS = 9;

// launching "fake" keypresses so they are launched as uniformly as possible
Actor.KEYDOWN_INTERVAL_DELAY = 16;

// standstill column
Actor.STANDSTILL_POSITION = 0;
// the order of spritesheet directions in the image
Actor.UPWARD_DIRECTION = 0;
Actor.DOWNWARD_DIRECTION = 2;
Actor.LEFT_DIRECTION = 1;
Actor.RIGHT_DIRECTION = 3;

// duration of one attack frame in ms
Actor.ATTACK_DURATION = 200;

// attack consts, starting row + # of frames
Actor.DAGGER = 12;
Actor.NO_FOR_DAGGER = 5;

Actor.BOW = 16;
Actor.NO_FOR_BOW = 12;

Actor.SPEAR = 4;
Actor.NO_FOR_SPEAR = 7;


_p = Actor.prototype;

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
	// WALK_COLUMNS - 1 bcuz we ignore the standstill position
	this.walkingFrameAnimator = new Animator(Actor.MOVEMENT_DURATION * (Actor.WALK_MAX_COLUMNS - 1));
	// infinite animation, we use the start and stop methods on this animator 
	// to stop and resume the walk animation
	this.walkingFrameAnimator.setRepeatCount(Animator.INFINITE);
    
    // animator for attack
    this.attackFrameAnimator = new Animator(Actor.ATTACK_DURATION * this.attackFrames);
    this.attackFrameAnimator.setRepeatCount(Animator.INFINITE);
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
}

_p.setMapCoords = function(mapCoordX, mapCoordY) {
	this.mapCoordX = mapCoordX;
	this.mapCoordY = mapCoordY;
}

_p.getMapCoords = function() {
	if (this.mapCoordX !== null && this.mapCoordY !== null) {
		return {x: this.mapCoordX, y: this.mapCoordY};
	}
	
	return null;
}

_p.updateScreenCoords = function() {
	({x: this.coordX, y: this.coordY} = this.mapRenderer.mapCoordsToScreenCoords({x: this.mapCoordX, y: this.mapCoordY}));
}

// when the screen coords are updated this function should be called too
_p.updateMapCoords = function() {
	({x: this.mapCoordX, y: this.mapCoordY} = this.mapRenderer.screenCoordsToMapCoords({x: this.coordX, y: this.coordY}));
}


// function to check if future tile to be walking on is obstacle or not
_p.checkCollision = function(x, y, cY = this.coordY, cX = this.coordX) { // x,y distance to be added | cX, cY coords to be added to
	/*
		Actor's feet make a segment and that segment can cross multiple tiles at once so we have
		to check the collision with all the crossed tiles at that moment
	*/
    var tileSize = this.mapRenderer.currentMapInstance.tileSize,
		leftTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x - ACTUAL_ACTOR_WIDTH / 2,
																	y: cY + y}),
		rightTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x + ACTUAL_ACTOR_WIDTH / 2,
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
	
	// checking collision against all objects with the feet segment of the Actor
	if (this.checkCollisionAgainstObjects(cX + x - ACTUAL_ACTOR_WIDTH / 2, cX + x + ACTUAL_ACTOR_WIDTH / 2, cY + y)) {
		return true;
	}
	
	// no collision with any tile was found
	return false;
}

// this functions checks the collision between the Actor and visible game objects
_p.checkCollisionAgainstObjects = function(lftPlyrX, rghtPlyrX, y) {
	/* 
		the Actor coords received by the function are screen coords
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

_p.updateMovementAnimation = function() {
        // if no movement timer has been created or it has been stopped by keyRelease()
        // another instance of Timer is created (so lastUpdateTime is reinitialised to now)
        if (!this.movementTimer && !this.walkAnimationTimer) {
            this.walkAnimationTimer = new Timer();

            this.walkingFrameAnimator.start();
        }

        // pass the timer to get the deltaTime and compute the frame that should be drawn right now
        // We get the number of a frame between 0 and NumberOfFrames - 1 which we offset by 1 so we skip the 0 frame which is STANDSTILL_POSITION
        this.column = Math.floor(this.walkingFrameAnimator.update(this.walkAnimationTimer) * (Actor.WALK_MAX_COLUMNS - 1)) + 1;

        // we updated the frames now
        this.walkAnimationTimer.lastUpdatedNow();
}

_p.updateAttackAnimation = function() {
    // if no attack timer has been created or it has been stopped by mouseRelease()
    if (!this.attackTimer) {
        this.attackTimer = new Timer();
        this.attackFrameAnimator.start();
    }
    this.row = Actor.DAGGER + 3;
    this.column = Math.floor(this.attackFrameAnimator.update(this.attackTimer) * this.attackFrames) + 1;
    
    // draw specific frame from attack frames
    this.draw();
    
    // we update the frames now
    this.attackTimer.lastUpdatedNow();
    this.animReq = requestAnimationFrame(this.updateAttackAnimation.bind(this));
    
    // repeat until we make one loop aka complete animation
    if(this.attackFrameAnimator._loopsDone == 1) {
        cancelAnimationFrame(this.animReq);
        this.attackTimer = null;
        this.attackFrameAnimator.stop();
        return;
    }
}








































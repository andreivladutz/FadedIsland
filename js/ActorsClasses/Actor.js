"use strict"

// sprite consts
const FRAME_WIDTH = 64, FRAME_HEIGHT = 64,
	  ACTUAL_ACTOR_WIDTH = 32;


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
	// WEAPONS
    {
        name: "bow",
        itemType: "img",
        url: "./img/weapons/recurvebow.png"
    },
    {
        name: "arrow",
        itemType: "img",
        url: "./img/weapons/arrow.png"
    },
    {
        name: "spear",
        itemType: "img",
        url: "./img/weapons/spear.png"
    },
    {
        name: "dagger",
        itemType: "img",
        url: "./img/weapons/dagger_male.png"
    },
];


class Actor {
    constructor(loadedPromisesArr, customResources, attackType) {
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
		
		// flag to know if one attack has already been started
		this.attacking = false;
		// flag to know if the player is currently moving
		this.walking = false;

		// coords corespond to feet area
		// just to see them in the constructor. they should be initialised accordingly!
		this.coordX = null;
		this.coordY = null;
        this.coordBodyY = null; // y coord for body, collision when going up
		
		// the drawing coords are screen coords but we also have to keep count 
		// of the map coords of the Actor.
		this.mapCoordX = this.mapCoordY = null;
        
		// Player updates his angle by the position of the mouse cursor
		// Enemies update their angle by the player position
		// # TODO: if the player will be out of range they should have a neutral angle
		this.angle = null;
		// direction is updated depending on the angle
		this.direction = null;
		
        // loading Actor sprite
        this.resLoader = new ResourceLoader();
        this.resLoader.add(RESOURCES);
        
        // column, row for specific frame in sprite
        // expected order for frames top-down: up/0, left/1, down/2, right/3
        // default for down movement frame
        this.row = Actor.WALK_ROW + Actor.DOWNWARD_DIRECTION;
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
				Actor.waitOn(this, this.globalPromisesArr, resourceName, propertyName);
				
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
        
        // set attack type
	    this.attackType = attackType;
        switch(attackType) {
	        case Actor.DAGGER:
		        this.attackFrames = Actor.NO_FOR_DAGGER;
		        this.attackDuration = Actor.DAGGER_ATTACK_DURATION;
		        break;
	        case Actor.BOW:
		        this.attackFrames = Actor.NO_FOR_BOW;
		        this.attackDuration = Actor.BOW_ATTACK_DURATION;
		        break;
	        case Actor.SPEAR:
		        this.attackFrames = Actor.NO_FOR_SPEAR;
		        this.attackDuration = Actor.SPEAR_ATTACK_DURATION;
		        break;
        }
		// flag for ranged type attack
	    this.spawnedProjectile = false;

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
// position of walking in the spritesheet
Actor.WALK_ROW = 8;

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
Actor.DAGGER_ATTACK_DURATION = 50;
Actor.SPEAR_ATTACK_DURATION = 80;
Actor.BOW_ATTACK_DURATION = 70;

// attack consts, starting row + # of frames
Actor.DAGGER = 12;
Actor.NO_FOR_DAGGER = 6;

Actor.BOW = 16;
Actor.NO_FOR_BOW = 12;
// the number of the frame when a projectile should also be spawned
Actor.PROJECTILE_SPAWN_FRAME = 10;

Actor.SPEAR = 4;
Actor.NO_FOR_SPEAR = 8;

// static dictionary of loaded resources(images) of all the weapons
Actor.WEAPONS = {};

_p = Actor.prototype;

// small utility to transform a name like FooName to fooName
function getLowerCaseName(name) {
	return name.charAt(0).toLowerCase() + name.substr(1);
}

/*
	MADE THE FUNCTION STATIC SO IT CAN LOAD IMAGES ON ANY OBJECT WITH A resLoader 

	this utility promisifies a listener for a resource with resourceName,
	pushes it to the global waiting array of promises and resolves when loading
	has finished, adding the image object on this object under the name of propertyName
	
	by default the resourceName passed should be PascalCase and the property will be
	the camelCase version of the resourceName. you can also specify a different propertyName
	
	@param obj = the object to place the property with the resource on
*/
Actor.waitOn = function(obj, globalPromisesArr, resourceName, propertyName = getLowerCaseName(resourceName)) {
	function loadedResource(resolveFunc, rejectFunc) {
		obj.resLoader.on("loaded" + resourceName, function(e) {
			// the image is also passed as an event so we don't 
			// need to call the get method on resLoader 
			obj[propertyName] = e.detail;
			
			resolveFunc();
		});
		
		// the global promises array will reject with this error
		obj.resLoader.on("error" + resourceName, function(err) {
			rejectFunc(err);
		});
	}
	
	globalPromisesArr.push(promisify(loadedResource));
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
    this.attackFrameAnimator = new Animator(this.attackDuration * this.attackFrames);
    // overriding hook function
    this.attackFrameAnimator._onAnimationEnd = (function() {
	    // attacking stopped
	    this.attacking = false;

	    this.attackTimer = null;
	    this.attackFrameAnimator.stop();
    }).bind(this);
}

_p.drawSpriteFrame = function(image) {
	let drawCoordX = Math.floor(this.coordX - FRAME_WIDTH / 2),
		drawCoordY = Math.floor(this.coordY - FRAME_HEIGHT);
	
	this.ctx.drawImage(image, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       drawCoordX, drawCoordY, FRAME_WIDTH, FRAME_HEIGHT);
};

_p.draw = function() {
    // draw the pieces of the actor
	for (let propertyName of this.propertiesNames) {
		this.drawSpriteFrame(this[propertyName]);
	}

	if (this.attacking) {
		// depending on the type of attack we want to draw the actor's weapon
		switch (this.attackType) {
			case Actor.DAGGER:
				this.drawSpriteFrame(Actor.WEAPONS["dagger"]);
				break;
			case Actor.BOW:
				this.drawSpriteFrame(Actor.WEAPONS["bow"]);
				this.drawSpriteFrame(Actor.WEAPONS["arrow"]);
				break;
			case Actor.SPEAR:
				this.drawSpriteFrame(Actor.WEAPONS["spear"]);
				break;
		}
	}
};

_p.setMapRenderer = function(mapRenderer) {
    this.mapRenderer = mapRenderer;
};

_p.setMapCoords = function(mapCoordX, mapCoordY) {
	this.mapCoordX = mapCoordX;
	this.mapCoordY = mapCoordY;
};

_p.getMapCoords = function() {
	if (this.mapCoordX !== null && this.mapCoordY !== null) {
		return {x: this.mapCoordX, y: this.mapCoordY};
	}
	
	return null;
};

_p.updateScreenCoords = function() {
	({x: this.coordX, y: this.coordY} = this.mapRenderer.mapCoordsToScreenCoords({x: this.mapCoordX, y: this.mapCoordY}));
};

// when the screen coords are updated this function should be called too
_p.updateMapCoords = function() {
	({x: this.mapCoordX, y: this.mapCoordY} = this.mapRenderer.screenCoordsToMapCoords({x: this.coordX, y: this.coordY}));
};


// function to check if future tile to be walking on is obstacle or not
_p.checkCollision = function(x, y, cY = this.coordY, cX = this.coordX) { // x,y distance to be added | cX, cY coords to be added to
	/*
		Actor's feet make a segment and that segment can cross multiple tiles at once so we have
		to check the collision with all the crossed tiles at that moment
	*/
    let leftTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x - ACTUAL_ACTOR_WIDTH / 2,
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
};

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
};

_p.updateMovementAnimation = function() {
        // if no movement timer has been created or it has been stopped by keyRelease()
        // another instance of Timer is created (so lastUpdateTime is reinitialised to now)
        if (!this.walkAnimationTimer) {
            this.walkAnimationTimer = new Timer();

            this.walkingFrameAnimator.start();
        }

        // pass the timer to get the deltaTime and compute the frame that should be drawn right now
        // We get the number of a frame between 0 and NumberOfFrames - 1 which we offset by 1 so we skip the 0 frame which is STANDSTILL_POSITION
        this.column = Math.floor(this.walkingFrameAnimator.update(this.walkAnimationTimer) * (Actor.WALK_MAX_COLUMNS - 1)) + 1;

        // we updated the frames now
        this.walkAnimationTimer.lastUpdatedNow();
};

// this stops the walking for all Actors (moved the code from the player KeyRelease)
_p.stopWalking = function() {
	this.column = Actor.STANDSTILL_POSITION;
	this.walking = false;

	// stop the animator so it is resetted the next time the player starts moving again
	this.walkAnimationTimer = null;
	// this.walkMovementTimer = null;
	this.walkingFrameAnimator.stop();
};

// this function will update the angle of the actor and the direction
_p.computeDirection = function(x, y) {
	// atan2 computes the angle relative to point 0, 0
	// so we have to translate the coords to a coord system where 
	// the origin is the player feet position
	x -= this.coordX;
	y -= this.coordY;
	
	// Left this for the curious ones that want to see the angles update
	// console.log(this.angle * 180 / Math.PI);
	
	this.angle = Math.atan2(y, x);
	
	// if the angle is between PI / 4 and 3 * PI / 4 the actor is looking down
	if (this.angle >= Math.PI / 4 && this.angle <= 3 * Math.PI / 4) {
		this.direction = Actor.DOWNWARD_DIRECTION;
	}
	// if the angle is between - PI / 4 and PI / 4 the actor is looking right
	else if (this.angle >= - Math.PI / 4 && this.angle <= Math.PI / 4) {
		this.direction = Actor.RIGHT_DIRECTION;
	}
	// if the angle is between 3 * PI / 4 and PI or - 3 * PI / 4 and - PI the actor is looking left
	else if (Math.abs(this.angle) >= 3 * Math.PI / 4 && Math.abs(this.angle) <= Math.PI) {
		this.direction = Actor.LEFT_DIRECTION;
	}
	// if the angle is between - 3 * PI / 4 and - PI / 4 the actor is looking up
	else if (this.angle <= - Math.PI / 4 && this.angle >= - 3 * Math.PI / 4) {
		this.direction = Actor.UPWARD_DIRECTION;
	}
};

// function to update the drawn direction of the actor IF THE ACTOR IS NOT MOVING OR ATTACKING!!!
_p.updateDirection = function() {
	if (this.attacking || this.walking) {
		return;
	}
	
	this.row = Actor.WALK_ROW + this.direction;
};

_p.startAttack = function() {
	// just set the flag to true. the update function will take care of the rest
	this.attacking = true;
	// we stopped walking. the attack has priority
	this.stopWalking();
};

// special case for bow attack because it also spawns an arrow Projectile
_p.handleBowAttack = function() {
	new Projectile(this.coordX, this.coordY - FRAME_HEIGHT / 2, this.angle);
};

_p.updateAttackAnimation = function() {
	// no attack has been started so no need to update
	if (!this.attacking) {
		return;
	}
	
    // if no attack timer has been created or it has been stopped by mouseRelease()
    if (!this.attackTimer) {
        this.attackTimer = new Timer();
        this.attackFrameAnimator.start();
    }
    this.row = this.attackType + this.direction;
    this.column = Math.floor(this.attackFrameAnimator.update(this.attackTimer) * this.attackFrames);

	// if the attackType is the ranged one we should launch a projectile right before ending the attack animation
	if (this.attackType === Actor.BOW && this.column === Actor.PROJECTILE_SPAWN_FRAME && !this.spawnedProjectile) {
		this.spawnedProjectile = true;
		this.handleBowAttack();
	}

    // the animation might have finished in the last update above
    if (this.attacking) {
	    // we update the frames now
	    this.attackTimer.lastUpdatedNow();
    }
    else {
    	// stopped the attack so if ranged reset flag
	    this.spawnedProjectile = false;
    	this.column = Actor.STANDSTILL_POSITION;
    }
};


/*
	GENERAL UPDATE FUNCTION (should be called right before drawing the actors -> for now in main):
	- updates the attack frames
	- will update movement on enemies
	- to be added...
 */
_p.update = function() {
	this.updateAttackAnimation();
	this.updateDirection();
};








































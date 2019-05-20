"use strict"

// sprite consts
const FRAME_WIDTH = 64, FRAME_HEIGHT = 64,
	  ACTUAL_ACTOR_WIDTH = 32, ACTUAL_ACTOR_HEIGHT = 52;

class Actor extends EventEmiter {
    constructor(loadedPromisesArr, customResources, attackType) {
    	super();
        this.canvas = CanvasManagerFactory().canvas;
        this.ctx = CanvasManagerFactory().ctx;

        // special buffer to draw bleeding actor on first
        this.bleedCanvas = document.createElement("canvas");
        this.bleedCtx = this.bleedCanvas.getContext("2d");

        this.bleedCanvas.height = FRAME_HEIGHT;
        this.bleedCanvas.width = FRAME_WIDTH;
        
		// will be overwritten in the Player/Enemy classes
        this.speed = 0;

	    // health bar details. values to be changed in player/enemy
	    this.initHealthBar();

	    this.healthBar = new HealthBar(this.health, this.healthBarColor, this);

		this.collisionDamage = Actor.COLLISION_DAMAGE;

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

		this.handleResourceLoadWaiting(customResources);
        
        // set attack type
	    this.attackType = attackType;
        switch(attackType) {
	        case Actor.DAGGER:
		        this.attackFrames = Actor.NO_FOR_DAGGER;
		        this.attackDuration = Actor.DAGGER_ATTACK_DURATION;
		        this.attackDamage = Actor.DAGGER_DAMAGE;
		        this.attackTileRange = Actor.DAGGER_RANGE;
		        this.horizontalAttackPixelsRange = Actor.DAGGER_HORIZ_DIST;
		        this.verticalAttackPixelsRange = Actor.DAGGER_VERT_DIST;
		        break;
	        case Actor.BOW:
		        this.attackFrames = Actor.NO_FOR_BOW;
		        this.attackDuration = Actor.BOW_ATTACK_DURATION;
		        this.attackDamage = Actor.BOW_DAMAGE;
		        // dummy values don't really care
		        this.attackTileRange = Infinity;
		        this.horizontalAttackPixelsRange = Infinity;
		        this.verticalAttackPixelsRange = Infinity;
		        break;
	        case Actor.SPEAR:
		        this.attackFrames = Actor.NO_FOR_SPEAR;
		        this.attackDuration = Actor.SPEAR_ATTACK_DURATION;
		        this.attackDamage = Actor.SPEAR_DAMAGE;
		        this.attackTileRange = Actor.SPEAR_RANGE;
		        this.horizontalAttackPixelsRange = Actor.SPEAR_HORIZ_DIST;
		        this.verticalAttackPixelsRange = Actor.SPEAR_VERT_DIST;
		        break;
        }
		// flag for ranged type attack
	    this.spawnedProjectile = false;

        // tile area of the actor used for the attack
	    this.leftTiles = [];
	    this.rightTiles = [];
	    this.upTiles = [];
	    this.downTiles = [];

		this.initAnimators();
    }

    // moved resource loading to a separate function so it can be overridden in the Enemy class
	handleResourceLoadWaiting(customResources) {
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

		//picking only the resource objects this actor needs
		let resourceObjects = [];

		for (let propertyName in customResources) {
			let resourceName = customResources[propertyName];

			if (resourceName !== null) {
				// wait for the resource to load
				Actor.waitOn(this, this.globalPromisesArr, resourceName, propertyName);

				for (let obj of RESOURCES) {
					if (obj.name === resourceName) {
						resourceObjects.push(obj);
					}
				}

				this.propertiesNames.push(propertyName);
			} else {
				delete customResources[propertyName];
			}
		}

		this.resLoader.add(resourceObjects);
		this.resLoader.load();
	}

	// checks if actor has spear attack or dagger attack
	melee() {
		return this.attackType === Actor.SPEAR || this.attackType === Actor.DAGGER;
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

// dying position in the spritesheet
Actor.DEATH_ROW = 20;
Actor.DEATH_FRAMES = 5;
// dying frame time in ms
Actor.DEATH_DURATION = 150;

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
// range of dagger attack in tiles
Actor.DAGGER_RANGE = 1;
// range in pixels euclidean distance
Actor.DAGGER_HORIZ_DIST = 60;
Actor.DAGGER_VERT_DIST = 76;
Actor.DAGGER_DAMAGE = 20;

Actor.BOW = 16;
Actor.NO_FOR_BOW = 12;
// the number of the frame when a projectile should also be spawned
Actor.PROJECTILE_SPAWN_FRAME = 10;
Actor.BOW_DAMAGE = 15;

Actor.SPEAR = 4;
Actor.NO_FOR_SPEAR = 8;
Actor.SPEAR_RANGE = 1;
// range in pixels euclidean distance
Actor.SPEAR_HORIZ_DIST = 100;
Actor.SPEAR_VERT_DIST = 116;
Actor.SPEAR_DAMAGE = 30;

// static dictionary of loaded resources(images) of all the weapons
Actor.WEAPONS = {};

// in ms
Actor.BLEED_TIME = 250;
// distance pushed
Actor.BLEED_PUSH = 10;

Actor.COLLISION_DAMAGE = 3;

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

    // animator for dying animation
	this.deathFrameAnimator = new Animator(Actor.DEATH_DURATION * Actor.DEATH_FRAMES);
	// overriding hook function
	this.deathFrameAnimator._onAnimationEnd = (function() {
		this.dying = false;

		this.deathTimer = null;
		this.deathFrameAnimator.stop();

		this.handleAfterDeath();
	}).bind(this);
}

_p.drawSpriteFrame = function(ctx, image, x, y) {
	ctx.drawImage(image, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT,
                       x, y, FRAME_WIDTH, FRAME_HEIGHT);
};

_p.draw = function() {
	let drawCoordX = Math.floor(this.coordX - FRAME_WIDTH / 2),
		drawCoordY = Math.floor(this.coordY - FRAME_HEIGHT),
		ctx = this.ctx;

	if (this.bleeding) {
		ctx = this.bleedCtx;
		drawCoordX = 0;
		drawCoordY = 0;
		ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
	}

    // draw the pieces of the actor
	for (let propertyName of this.propertiesNames) {
		this.drawSpriteFrame(ctx, this[propertyName], drawCoordX, drawCoordY);
	}

	if (this.attacking) {
		// depending on the type of attack we want to draw the actor's weapon
		switch (this.attackType) {
			case Actor.DAGGER:
				this.drawSpriteFrame(ctx, Actor.WEAPONS["dagger"], drawCoordX, drawCoordY);
				break;
			case Actor.BOW:
				this.drawSpriteFrame(ctx, Actor.WEAPONS["bow"], drawCoordX, drawCoordY);
				this.drawSpriteFrame(ctx, Actor.WEAPONS["arrow"], drawCoordX, drawCoordY);
				break;
			case Actor.SPEAR:
				this.drawSpriteFrame(ctx, Actor.WEAPONS["spear"], drawCoordX, drawCoordY);
				break;
		}
	}

	// actually just buffered actor
	if (this.bleeding) {
		let drawCoordX = Math.floor(this.coordX - FRAME_WIDTH / 2),
			drawCoordY = Math.floor(this.coordY - FRAME_HEIGHT);

		ctx.save();
		ctx.globalCompositeOperation = "source-atop";

		ctx.fillStyle = "rgba(193, 66, 66, 0.64)";
		ctx.fillRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);

		this.ctx.drawImage(this.bleedCanvas, 0, 0, FRAME_WIDTH, FRAME_HEIGHT,
			drawCoordX, drawCoordY, FRAME_WIDTH, FRAME_HEIGHT);

		ctx.restore();
	}

	if (!this.died) {
		this.healthBar.draw();
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
	this.coordBodyY = this.coordY - FRAME_HEIGHT / 5;
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

// this functions checks the collision between the Actor and all game objects
_p.checkCollisionAgainstObjects = function(lftActorX, rightActorX, y, mapCoords = false) {
	/* 
		the Actor coords received by the function are screen coords (unless mapCoords is true)
						so they need to be converted to map coords
	*/
	if (!mapCoords) {
		({x: lftActorX, y} = this.mapRenderer.screenCoordsToMapCoords({x : lftActorX, y}));
		({x: rightActorX} = this.mapRenderer.screenCoordsToMapCoords({x : rightActorX, y}));
	}

	let visibleObjects = this.mapRenderer.getAllDrawableObjects(),
		templates = this.mapRenderer.getTemplateObjects();
	
	// checking against every object
	for (let obj of visibleObjects) {
		let src = obj["template"],
			correspondingTemplate = templates[src],
			width = correspondingTemplate.width,
			height = correspondingTemplate.height,
			lX = obj.x, rX = obj.x + width, bY = obj.y, uY = obj.y - height;
		
		if (rightActorX >= lX && lftActorX <= rX && y >= uY && y <= bY) {
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
	// the origin is the actor feet position
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

// return tiles under area
_p.getTilesUnderActor = function() {
	let leftMapX =  this.mapCoordX - ACTUAL_ACTOR_WIDTH / 2, rightMapX = this.mapCoordX + ACTUAL_ACTOR_WIDTH / 2,
		topMapY = this.mapCoordY - FRAME_HEIGHT, bottomMapY = this.mapCoordY;

	this.leftTiles = [];
	this.rightTiles = [];
	this.upTiles = [];
	this.downTiles = [];

	// keep a reference to the point situated in the middle of the player
	this.middlePoint = {x: this.mapCoordX, y: this.mapCoordY - FRAME_HEIGHT / 2};

	this.leftTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: leftMapX, y: topMapY}));
	this.rightTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: rightMapX, y: topMapY}));

	this.leftTiles.push({x: this.leftTiles[0].x, y: this.leftTiles[0].y + 1});
	this.rightTiles.push({x: this.rightTiles[0].x, y: this.rightTiles[0].y + 1});

	this.leftTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: leftMapX, y: bottomMapY}));
	this.rightTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: rightMapX, y: bottomMapY}));

	this.leftMiddleTile = this.leftTiles[1];
	this.rightMiddleTile = this.rightTiles[1];

	this.upTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: leftMapX, y: topMapY}));
	this.upTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: rightMapX, y: topMapY}));

	this.downTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: leftMapX, y: bottomMapY}));
	this.downTiles.push(this.mapRenderer.mapCoordsToTileCoords({x: rightMapX, y: bottomMapY}));
};

_p.updateDeathAnimation = function() {
	// not dying so no need to update
	if (!this.dying) {
		return;
	}

	if (!this.deathTimer) {
		this.deathTimer = new Timer();
		this.deathFrameAnimator.start();
	}
	this.row = Actor.DEATH_ROW;
	this.column = Math.floor(this.deathFrameAnimator.update(this.deathTimer) * Actor.DEATH_FRAMES);

	// the animation might have finished in the last update above
	if (this.dying) {
		// we update the frames now
		this.deathTimer.lastUpdatedNow();
	}
};

// starting the dying animation. real aftermath is done in handleAfterDeath
_p.handleDeath = function() {
	this.died = true;
	this.dying = true;
	this.bleeding = false;
	this.attacking = false;
	this.walking = false;
};

// SHOULD BE OVERRIDDEN IN THE SUBCLASS
_p.handleAfterDeath = function() {
	// different logic for player and enemy...
};

// @param damage = it receives the damage depending on the attack type or collision,
// @param direction = the direction in which the other actor attacked this actor
// @param waitTime =  and a wait time (in case of attack) -> we want the animation for the attack to reach the hit phase
// before starting bleeding
_p.bleed = function(damage, direction = null, waitTime = 0) {
	// if already bleeding we have temporary invincibility
	if (this.bleedTimeout || this.bleeding || this.died) {
		return;
	}

	this.bleedTimeout = setTimeout(function(self) {
		// if already bleeding we have temporary invincibility
		if (self.bleeding || self.died) {
			return;
		}

		self.bleedTimeout = null;
		self.timeStartedBleeding = new Date().getTime();
		self.bleeding = true;

		self.healthBar.tookDamage(damage);
		// this hit killed the actor
		self.health -= damage;
		if (self.health <= 0) {
			self.handleDeath();

			return;
		}

		// if the enemy died it doesn't make any sense to push it
		if (self instanceof Enemy) {
			self.push(direction);
		}
	}, waitTime, this);
};

_p.isStillBleeding = function() {
	if (new Date().getTime() - this.timeStartedBleeding >= Actor.BLEED_TIME) {
		this.bleeding = false;
		this.timeStartedBleeding = null;
	}
};

// get two sets of tiles and return true if they collide
function tileCollision(set1, set2) {
	for (let tile1 of set1) {
		for (let tile2 of set2) {
			if (tile1.x === tile2.x && tile1.y === tile2.y) {
				return true;
			}
		}
	}

	return false;
}

// this function receives another actor (after an attack has been started)
// and checks if the actor has been hit by this attack
_p.checkHitOnActor = function(actor) {
	actor.getTilesUnderActor();

	if (this.direction === Actor.RIGHT_DIRECTION) {
		let rightTilesX = this.rightTiles[0].x;
		for (let tileX = rightTilesX; tileX <= rightTilesX + this.attackTileRange; tileX++) {
			// creating intermediate hit boxes
			let rightTilesHitBoxes = [];
			rightTilesHitBoxes.push({x: tileX, y: this.rightMiddleTile.y});

			if (tileCollision(rightTilesHitBoxes, actor.leftTiles) || tileCollision(rightTilesHitBoxes, actor.rightTiles)) {
				if (euclideanDistance(this.middlePoint, actor.middlePoint) <= this.horizontalAttackPixelsRange) {
					return true;
				}
			}
		}
	}
	else if (this.direction === Actor.LEFT_DIRECTION) {
		let leftTilesX = this.leftTiles[0].x;
		for (let tileX = leftTilesX; tileX >= leftTilesX - this.attackTileRange; tileX--) {
			// creating intermediate hit boxes
			let leftTilesHitBoxes = [];
			leftTilesHitBoxes.push({x: tileX, y: this.leftMiddleTile.y});

			if (tileCollision(leftTilesHitBoxes, actor.rightTiles) ||  tileCollision(leftTilesHitBoxes, actor.leftTiles) ) {
				if (euclideanDistance(this.middlePoint, actor.middlePoint) <= this.horizontalAttackPixelsRange) {
					return true;
				}
			}
		}
	}
	else if (this.direction === Actor.DOWNWARD_DIRECTION) {
		/*
		let bottomTilesY = this.downTiles[0].y;
		for (let tileY = bottomTilesY; tileY <= bottomTilesY + (this.attackTileRange - 1); tileY++) {
			let bottomHitBoxes = [];
			for (let tile of this.downTiles) {
				bottomHitBoxes.push({x: tile.x, y: tileY});
			}
		*/

		// leftTiles and rightTiles of an actor covers all of its area (including up and bottom hit boxes)
		if (tileCollision(this.downTiles, actor.leftTiles) || tileCollision(this.downTiles, actor.rightTiles)) {
			if (euclideanDistance(this.middlePoint, actor.middlePoint) <= this.verticalAttackPixelsRange) {
				return true;
			}
		}
		//}
	}
	else if (this.direction === Actor.UPWARD_DIRECTION) {
		/*
		let upwardTilesY = this.upTiles[0].y;
		for (let tileY = upwardTilesY; tileY >= upwardTilesY - (this.attackTileRange - 1); tileY--) {
			let upwardHitBoxes = [];
			for (let tile of this.upTiles) {
				upwardHitBoxes.push({x: tile.x, y: tileY});
			}
		*/

		// leftTiles and rightTiles of an actor covers all of its area (including up and bottom hit boxes)
		if (tileCollision(this.upTiles, actor.leftTiles) || tileCollision(this.upTiles, actor.rightTiles)) {
			if (euclideanDistance(this.middlePoint, actor.middlePoint) <= this.verticalAttackPixelsRange) {
				return true;
			}
		}
		//}
	}

	return false;

	/* CODE FOR DRAWING HITBOXES. KEEPING IT AROUND
			for (let tile of leftTilesHitBoxes) {
				let screenTile = this.mapRenderer.tileCoordsToScreenCoords(tile);

				this.ctx.fillStyle = "black";
				this.ctx.fillRect(screenTile.x, screenTile.y, 32, 32);
			}
			debugger;
			for (let tile of actor.leftTiles) {
				let screenTile = this.mapRenderer.tileCoordsToScreenCoords(tile);

				this.ctx.fillStyle = "green";
				this.ctx.fillRect(screenTile.x, screenTile.y, 32, 32);
			}
			debugger;

			for (let tile of actor.rightTiles) {
				let screenTile = this.mapRenderer.tileCoordsToScreenCoords(tile);

				this.ctx.fillStyle = "green";
				this.ctx.fillRect(screenTile.x, screenTile.y, 32, 32);
			}
			debugger;
			 */
};

_p.startAttack = function() {
	// just set the flag to true. the update function will take care of the rest
	this.attacking = true;
	// we stopped walking. the attack has priority
	this.stopWalking();

	this.getTilesUnderActor();
};

// special case for bow attack because it also spawns an arrow Projectile
_p.handleBowAttack = function() {
	new Projectile(this.coordX, this.coordY - ACTUAL_ACTOR_HEIGHT / 2,
		this.angle, this.direction, this, this.mapRenderer);
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
	if (this.died) {
		this.updateDeathAnimation();

		if (!this.dying) {
			this.column = Actor.DEATH_FRAMES;
		}

		return;
	}

	this.healthBar.update();

	this.updateAttackAnimation();
	this.updateDirection();

	if (this.bleeding) {
		this.isStillBleeding();
	}
};








































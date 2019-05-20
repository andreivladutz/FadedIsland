class Enemy extends Actor {
	constructor(loadedPromisesArr, customResources, attackType, name) {
		super(loadedPromisesArr, customResources, attackType);

		// save own name
		this.name = name;

		// override properties from actor
		let randomness;
		do {
			randomness = Math.random();
		} while (randomness < 0.5);

		// random health between half DEFAULT_HEALTH and DEFAULT_HEALTH
		this.health = randomness * Enemy.DEFAULT_HEALTH;
		this.healthBarColor = "red";

		// all enemies have to keep a reference to the player
		this.playerReference = player;

		// keep the mapName spawned in. we don't want to draw or update if the player left the map
		this.mapNameSpawnedIn = null;

		// keep the reference to the spawnPoint it spawned me (should be set with setSpawnPoint)
		this.spawnPoint = null;

		// keep a timer to count how much time the enemy has been too far away from the player
		this.timerAwayFromPlayer = new Timer();
		this.timeAway = 0;
	}

	// overridden method so we don't wait for already loaded resources
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
		for (let propertyName in customResources) {
			let resourceName = customResources[propertyName];

			if (resourceName !== null) {
				// resource was already loaded in the past
				if (Enemy.loadedResourceImages[resourceName]) {
					// use the already loaded image instead
					this[propertyName] = Enemy.loadedResourceImages[resourceName];

					this.propertiesNames.push(propertyName);
					delete customResources[propertyName];

					continue;
				}

				// the first time the resource loads
				this.resLoader.on("loaded" + resourceName, function (e) {
					Enemy.loadedResourceImages[resourceName] = e.detail;
				});
			}
		}

		super.handleResourceLoadWaiting(customResources);
	}

	setMapRenderer(mapRenderer) {
		super.setMapRenderer(mapRenderer);
		this.mapNameSpawnedIn = mapRenderer.getCurrentMapName();
	}

	/*
		stop updating / drawing if the player left the map
	 */
	update() {
		if (this.mapNameSpawnedIn !== this.mapRenderer.getCurrentMapName()) {
			return;
		}

		this.updateScreenCoords();
		super.update();
		this.checkDistanceFromPlayer();
	}

	draw() {
		if (this.mapNameSpawnedIn !== this.mapRenderer.getCurrentMapName()) {
			return;
		}

		super.draw();
	}

	startAttack() {
		if (this.attacking || this.died) {
			return;
		}

		super.startAttack();
	}
}

// look for a random point for a maximum of quarter of a second
Enemy.POINT_SEARCH_TIME = 250;

Enemy.SPAWN_RANGE = 500;

// After being more than MAX_DIST_FROM_PLAYER away for more than DESPAWN_TIME the enemy despawns
Enemy.MAX_DIST_FROM_PLAYER = 2500;
Enemy.DESPAWN_TIME = 5000;

Enemy.KILLED_ENEMY_EVENT = "killedEnemy";
// max health
Enemy.DEFAULT_HEALTH = 100;

// keep a dictionary of already loaded images. There are a lot of enemies that look the same
// so they reuse the same images. Doesn't make sense to wait again for the loading of those images
Enemy.loadedResourceImages = {};

// verify if map coords are in range and not colliding with anything on the map
Enemy.verifyValidMapCoords = function(x, y) {
	let currMapWidth = mapRenderer.getMapWidth(), currMapHeight = mapRenderer.getMapHeight();

	if (x < ACTUAL_ACTOR_WIDTH / 2 || x > currMapWidth - ACTUAL_ACTOR_WIDTH / 2
		|| y < FRAME_HEIGHT / 2 || y > currMapHeight - FRAME_HEIGHT / 2) {

		return false;
	}

	let collisionChecker = {
		mapRenderer,
		playerReference: player,
		checkCollisionAgainstObjects: Actor.prototype.checkCollisionAgainstObjects,
		checkCollisionMapCoords: Enemy.prototype.checkCollisionMapCoords,
		checkPlayerCollision: Enemy.prototype.checkPlayerCollision,
		checkCollision: Enemy.prototype.checkCollision
	};

	// check if there is no collision at (x, y) map coords and (x, bodyY) coords
	// also check collision against the player
	return !collisionChecker.checkCollision(y, x) && !collisionChecker.checkPlayerCollision(y, x);
};

/*
	static method to get a random map point positioned in range around (x, y) map point
 */
Enemy.getRandomPointAround = function(x, y, range) {
	// we might just not find any point because there isn't any valid one in this range
	// so after some time we stop the search and return null if no point has been found
	let searchStartTime = new Date().getTime(), foundX, foundY;

	do {
		// exceeded search time. there probably isn't any point available
		if (new Date().getTime() - searchStartTime > Enemy.POINT_SEARCH_TIME ) {
			return null;
		}

		let xSign = (Math.random() < 0.5)? -1 : 1,
			ySign = (Math.random() < 0.5)? -1 : 1;
		foundX = x + xSign * Math.random() * range;
		foundY = y + ySign * Math.random() * range;

	} while(!Enemy.verifyValidMapCoords(foundX, foundY));

	return {x: foundX, y: foundY};
};

_p = Enemy.prototype;

function rectIntersection(rectA, rectB) {
	// condition:
	if (rectA.left <= rectB.right && rectA.right >= rectB.left &&
		rectA.top <= rectB.bottom && rectA.bottom >= rectB.top ) {

		return true;
	}
	return false;
}

_p.checkPlayerCollision = function(cY = this.mapCoordY, cX = this.mapCoordX) {
	let playerRect = {
			top: this.playerReference.mapCoordY - ACTUAL_ACTOR_HEIGHT,
			left: this.playerReference.mapCoordX - ACTUAL_ACTOR_WIDTH / 2,
			right: this.playerReference.mapCoordX + ACTUAL_ACTOR_WIDTH / 2,
			bottom: this.playerReference.mapCoordY
		};

	let enemyRect = {
		top: cY - ACTUAL_ACTOR_HEIGHT,
		left: cX - ACTUAL_ACTOR_WIDTH / 2,
		right: cX + ACTUAL_ACTOR_WIDTH / 2,
		bottom: cY
	};

	// the actors collide
	if (rectIntersection(playerRect, enemyRect)) {
		return true;
	}

	return false;
};

_p.checkCollision = function(cY = this.mapCoordY, cX = this.mapCoordX, shouldCheckUpwardCollision = true) {
	return this.checkCollisionMapCoords(cY, cX) ||
		(shouldCheckUpwardCollision && this.checkCollisionMapCoords(cY - FRAME_HEIGHT / 5, cX));
}

// version of checkCollision function that checks collision using map coordinates
_p.checkCollisionMapCoords = function(cY = this.mapCoordY, cX = this.mapCoordX) {
	/*
		Actor's feet make a segment and that segment can cross multiple tiles at once so we have
		to check the collision with all the crossed tiles at that moment
	*/
	let leftTileCoords = this.mapRenderer.mapCoordsToTileCoords({x: cX - ACTUAL_ACTOR_WIDTH / 2, y: cY}),
		rightTileCoords = this.mapRenderer.mapCoordsToTileCoords({x: cX + ACTUAL_ACTOR_WIDTH / 2, y: cY}),
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

	// checking collision against all objects with the feet segment of the Actor (passing true as mapCoords flag)
	if (this.checkCollisionAgainstObjects(cX - ACTUAL_ACTOR_WIDTH / 2, cX + ACTUAL_ACTOR_WIDTH / 2, cY, true)) {
		return true;
	}

	// no collision with any tile was found
	return false;
};

// overridden function so it updates it's direction depending on the player position at always
// THIS FUNCTION IS CALLED REGULARLY IN THE UPDATE FUNCTION OF THE ACTOR CLASS
_p.updateDirection = function() {
	this.computeDirection(this.playerReference.coordX, this.playerReference.coordY);

	this.row = Actor.WALK_ROW + this.direction;
};

_p.setSpawnPoint = function(spawnPoint) {
	this.spawnPoint = spawnPoint;
};

_p.despawn = function() {
	// remove the current enemy from all the arrays
	this.spawnPoint.SPAWNED_ENEMIES.splice(this.spawnPoint.SPAWNED_ENEMIES.indexOf(this), 1);
	ENEMIES.splice(ENEMIES.indexOf(this), 1);
	DRAWABLE_ENTITIES.splice(DRAWABLE_ENTITIES.indexOf(this), 1);
}

// check the distance away from the player and start counting the time spent away from the player
// so we know when to despawn the enemy if it stayed away for too long
_p.checkDistanceFromPlayer = function() {
	let distFromPlayer = euclideanDistance({x: this.playerReference.coordX, y: this.playerReference.coordY},
		{x: this.coordX, y: this.coordY});

	if (distFromPlayer < Enemy.MAX_DIST_FROM_PLAYER) {
		this.timerAwayFromPlayer.lastUpdatedNow();
		this.timeAway = 0;
	}
	else {
		this.timeAway += this.timerAwayFromPlayer.getDeltaTime();
		this.timerAwayFromPlayer.lastUpdatedNow();

		if (this.timeAway >= Enemy.DESPAWN_TIME) {
			this.despawn();
		}
	}
};

// only enemies get pushed.
_p.push = function(direction) {
	let sgnX = 0, sgnY = 0;

	// the enemy got pushed only in one direction
	if (direction === Actor.UPWARD_DIRECTION) {
		sgnY = -1;
	}
	else if (direction === Actor.DOWNWARD_DIRECTION) {
		sgnY = 1;
	}
	else if (direction === Actor.LEFT_DIRECTION) {
		sgnX = -1;
	}
	else if (direction === Actor.RIGHT_DIRECTION) {
		sgnX = 1;
	}

	// trying to push as much as possible
	for (let pushed = Actor.BLEED_PUSH; pushed >= 0; pushed--) {
		// push on x axis
		if (sgnX !== 0 && !this.checkCollision(this.mapCoordY, this.mapCoordX + pushed * sgnX, false)) {
			this.mapCoordX += pushed * sgnX;
			break;
		}
		else if (sgnY !== 0) {
			if (sgnY === -1 && !this.checkCollision(this.mapCoordY - pushed, this.mapCoordX)) {
				this.mapCoordY -= pushed;
				break
			}
			else if (sgnY === 1 && !this.checkCollision(this.mapCoordY + pushed, this.mapCoordX, false)){
				this.mapCoordY += pushed;
				break;
			}
		}
	}

	this.updateScreenCoords();
};

_p.handleAfterDeath = function() {
	// self remove from everywhere
	this.despawn();

	// emit enemy killed event on the player
	this.playerReference.emit(Enemy.KILLED_ENEMY_EVENT, this.name);
};
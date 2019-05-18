class Enemy extends Actor {
	constructor(loadedPromisesArr, customResources, attackType) {
		super(loadedPromisesArr, customResources, attackType);

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

		super.update();
		this.checkDistanceFromPlayer();
	}

	draw() {
		if (this.mapNameSpawnedIn !== this.mapRenderer.getCurrentMapName()) {
			return;
		}

		super.draw();
	}
}

// look for a random point for a maximum of quarter of a second
Enemy.POINT_SEARCH_TIME = 250;

Enemy.SPAWN_RANGE = 500;

// After being more than MAX_DIST_FROM_PLAYER away for more than DESPAWN_TIME the enemy despawns
Enemy.MAX_DIST_FROM_PLAYER = 2500;
Enemy.DESPAWN_TIME = 5000;

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
		checkCollisionAgainstObjects: Actor.prototype.checkCollisionAgainstObjects,
		checkCollision: Enemy.prototype.checkCollisionMapCoords
	};

	// check if there is no collision at (x, y) map coords and (x, bodyY) coords
	return !(collisionChecker.checkCollision(y, x) || collisionChecker.checkCollision(y - FRAME_HEIGHT / 5, x));
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
	this.updateScreenCoords();
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
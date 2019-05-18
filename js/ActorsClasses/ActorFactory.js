/*
	ActorFactory gets instantiated at load time

	it will be a singleton -> a function that will return
	the same object every time and the object will
	have methods for instantiating Actors depending on their names and types in the
							ActorFactory.predefinedActors array
 */
const ActorFactory = (function() {
	// find the predefined object
	function findPredefActor(actorName) {
		for (let obj of ActorFactory.predefinedActors) {
			if (obj.name === actorName) {
				return obj;
			}
		}

		// didn't find the actor
		return null;
	}

	let waitedOnPromises = [];

	function setWaitedOnPromises(waitedOnPr) {
		waitedOnPromises = waitedOnPr;
	}

	/*
	 @param waitedOnPromises = global promises arr that wrap loading events which are waited on
	 @param actorName = the name in the predefinedActors array

	 the map coordinates can also be specified at instantiation
	 */
	function getActor(actorName, x = -1, y = -1, waitedOnPr = null) {
		if (waitedOnPr) {
			setWaitedOnPromises(waitedOnPr);
		}

		let predefActor = findPredefActor(actorName);

		if (predefActor === null) {
			// didn't find the actor
			return null;
		}

		// copying the resource array so properties don't get deleted out of the original array
		let actor, resourcesCopy = JSON.parse(JSON.stringify(predefActor.resources));

		// init actor accordingly, setting its coords if needed
		if (predefActor.type === "player") {
			actor = new Player(waitedOnPromises, resourcesCopy, predefActor.attackType);

			if (x !== -1 && y !== -1) {
				actor.movePlayerToMapCoords(x, y);
			}
		}
		else if (predefActor.type === "enemy") {
			actor = new Enemy(waitedOnPromises, resourcesCopy, predefActor.attackType);

			if (x !== -1 && y !== -1) {
				actor.mapCoordX = x;
				actor.mapCoordY = y;
			}
		}

		return actor;
	}

	// this function receives a spawnPoint and makes sure it generates an enemy where it should
	function spawnEnemy(spawnPoint) {
		// spawn point deactivated or the maximum number of enemies spawned at once has been reached
		if (!spawnPoint.active || spawnPoint[MapInstance.ENEMY_MAX_SPAWN] === spawnPoint.SPAWNED_ENEMIES.length) {
			return;
		}

		// get the enemies this spawn point spawns and a randomPoint around it
		let spawnableEnemies = [], randomPoint, spawnPointRoom = null, randomPointRoom = null;

		// if this map has rooms make sure we don't spawn any enemy outside the room
		if (mapRenderer.mapHasRooms()) {
			var tileCoordsSpawnPt = mapRenderer.mapCoordsToTileCoords(spawnPoint);
			spawnPointRoom = mapRenderer.getTilesToRooms()[tileCoordsSpawnPt.y][tileCoordsSpawnPt.x];
		}

		do {
			randomPoint = Enemy.getRandomPointAround(spawnPoint.x, spawnPoint.y, Enemy.SPAWN_RANGE);

			if (mapRenderer.mapHasRooms()) {
				var tileCoordsRandomPt = mapRenderer.mapCoordsToTileCoords(randomPoint);
				randomPointRoom = mapRenderer.getTilesToRooms()[tileCoordsRandomPt.y][tileCoordsRandomPt.x];
			}
		} while (spawnPointRoom !== randomPointRoom);

		// getting all the enemies it spawns
		for (let enemyName of ActorFactory.enemyNames) {
			if (spawnPoint[enemyName]) {
				spawnableEnemies.push(enemyName);
			}
		}
		// spawning a random enemy from the spawnableEnemies array
		let randomSpawnedIndex = Math.round((spawnableEnemies.length - 1) * Math.random());

		let spawnedEnemy = getActor(spawnableEnemies[randomSpawnedIndex], randomPoint.x, randomPoint.y);
		//set the mapRenderer accordingly
		spawnedEnemy.setMapRenderer(mapRenderer);
		spawnedEnemy.setSpawnPoint(spawnPoint);

		ENEMIES.push(spawnedEnemy);
		DRAWABLE_ENTITIES.push(spawnedEnemy);
		spawnPoint.SPAWNED_ENEMIES.push(spawnedEnemy);
	}

	const factory = {
		getActor,
		spawnEnemy
	};

	return function getFactory() {
		return factory;
	}
})();
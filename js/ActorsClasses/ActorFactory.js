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
			actor = new Enemy(waitedOnPromises, resourcesCopy, predefActor.attackType, predefActor.name);

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
		// or it isn't its map
		if (!spawnPoint.active || spawnPoint[MapInstance.ENEMY_MAX_SPAWN] === spawnPoint.SPAWNED_ENEMIES.length
			|| spawnPoint.mapName !== mapRenderer.getCurrentMapName()) {
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

	// using these for generating "uniqueNames" for spawn points
	let uniqueName = "uniqueName", uniqueNumber = 0;

	/*
		This function generate a spawn point for map @mapName at MAP COORDINATES (x, y)
		and spawns all enemies mentioned in the @spawnedEnemies ARRAY!, but at some point
		if @maxSpawnedAtOnce enemies are spawned by this point, this point stops spawning until
		you kill some of the enemies spawned by this point (IF ONE IS KILLED ONE WILL BE SPAWNED AGAIN).

		if @maxSpawnedAtOnce enemies is not reached yet, the spawn point spawns one random enemy from the
		@spawnedEnemies array every @spawnInterval milliseconds.

		if @afterKillingNo is specified, @afterKillingCallback should be specified too, so after killing
		@afterKillingNo enemies SPAWNED BY THIS SPAWN POINT, the @afterKillingCallback is called

		if @deactivateAfter is specified, the spawn point will get deactivated after @deactivateAfter number
		of enemies SPAWNED BY THIS SPAWN POINT are killed by the player
	 */
	function generateEnemySpawnPoint(mapName, x, y, spawnedEnemies, maxSpawnedAtOnce, spawnInterval,
	                                 afterKillingNo = Infinity, afterKillingCallback = null, deactivateAfter = Infinity) {
		// you have to wait for this mapInstance to get parsed before generating a spawnPoint
		if (!MapRenderer.MAP_INSTANCES[mapName]) {
			throw new Error("YOU CANNOT GENERATE A SPAWN POINT BEFORE MAP PARSING TAKES PLACE");
		}

		let newSpawnPoint = {
			mapName: mapName,
			type: MapInstance.ENEMY_SPAWN,
			x: x,
			y: y,
			active: true,
			name: uniqueName + uniqueNumber, // every spawn point needs a unique name to work correctly
			SPAWNED_ENEMIES: [], // this array keeps all the spawned enemies by this spawn at any point in time
			[MapInstance.ENEMY_MAX_SPAWN]: maxSpawnedAtOnce,
			[MapInstance.ENEMY_SPAWN_INTERVAL]: spawnInterval,
			[ActorFactory.DEACTIVATE_AFTER]: deactivateAfter,
			[ActorFactory.AFTER_KILLING_NO]: afterKillingNo,
			[ActorFactory.AFTER_KILLING_CALLBACK]: afterKillingCallback,
			[ActorFactory.KILLED_ENEMIES]: 0, // count the killed enemies
		};

		uniqueNumber++;

		// bind the verifying function to this spawn point. (under the hood detail)
		newSpawnPoint[ActorFactory.VERIFY_KILLED_ENEMIES] = verifyKilledEnemies.bind(newSpawnPoint);

		// add a property for every enemyName so they get spawned by this spawn point
		for (let enemyName of spawnedEnemies) {
			newSpawnPoint[enemyName] = true;
		}

		// push the spawn point to its map
		MapRenderer.MAP_INSTANCES[mapName].enemySpawnPoints.push(newSpawnPoint);
	}

	function verifyKilledEnemies() {
		// deactivate spawn point
		if (this[ActorFactory.KILLED_ENEMIES] >= this[ActorFactory.DEACTIVATE_AFTER]) {
			this.active = false;
		}

		if (this[ActorFactory.KILLED_ENEMIES] >= this[ActorFactory.AFTER_KILLING_NO]) {
			this[ActorFactory.AFTER_KILLING_CALLBACK]();
		}
	}

	const factory = {
		getActor,
		spawnEnemy,
		generateEnemySpawnPoint
	};

	return function getFactory() {
		return factory;
	}
})();

ActorFactory.DEACTIVATE_AFTER = "deactivateAfter";
ActorFactory.KILLED_ENEMIES = "killedEnemies";
ActorFactory.AFTER_KILLING_NO = "afterKilling";
ActorFactory.AFTER_KILLING_CALLBACK = "afterKillingCallback";
ActorFactory.VERIFY_KILLED_ENEMIES = "verifyKilledEnemiesCallback";
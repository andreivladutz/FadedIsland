let DEBUGGING = true;

MapLoader.RESOURCES = [
    {
        name: "MainMap",
        itemType: "JSON",
        url: "Tiled/map/map1.json"
	},
    {
        name: "CastleMap",
        itemType: "JSON",
        url: "Tiled/map/castle2.json"
	},
    {
        name: "Dungeon",
        itemType: "JSON",
        url: "Tiled/map/dungeon.json"
    },
];

// in case the name of the map resources changes
const MAIN_MAP = "MainMap",
    CASTLE_MAP = "CastleMap",
    DUNGEON = "Dungeon";

/*
    when this event fires on the mapLoader instance 
    it means the mapRenderer has been initialised
*/
const MAPS_READY_EVENT = "mapRendererInitialised";


/*
    all the global objects should be moved in a Game class later
*/
let loadingScreen, resourceLoader, canvasManager, mapRenderer, mapLoader, player, movementManager, loadedPromisesArr = [],
	// Projectiles and Enemies are also kept separate for collision checking, etc
	PROJECTILES = [], ENEMIES = [];

// all Actors and Projectiles are kept in this array so they all are
// updated and drawn every game update cycle
let DRAWABLE_ENTITIES = [];

/*
	A unit test to verify if the Enemy.getRandomPointAround behaves as expected
 */
function TEST_RANDOM_POINT_GENERATION(playerRef, range, noOfTest) {
	// the 4 directions in which the player can move (without diagonals)
	let possibleMovements = ["keyUp", "keyLeft", "keyDown", "keyRight"],
		mapCoordXBeforeMovement = playerRef.mapCoordX,
		mapCoordYBeforeMovement = playerRef.mapCoordY,
		failedTests = 0, passedTests = 0;

	// function to check if player could actually move (changed his coords)
	function playerMoved() {
		return mapCoordXBeforeMovement !== playerRef.mapCoordX || mapCoordYBeforeMovement !== playerRef.mapCoordY;
	}

	// when the tests end print the results
	function printTestResults(i) {
		console.log("TOTAL TESTS RUN = " + i + " OF WHICH:");
		console.log(failedTests + " FAILED / " + passedTests + " PASSED");
	}

	for (let i = 1; i <= noOfTest; i++) {
		console.log("TEST " + i + ": ");

		// randomly generate a map point around the player
		let randomPoint = Enemy.getRandomPointAround(playerRef.mapCoordX, playerRef.mapCoordY, range);

		// if we cannot generate a new point we stop the test
		if (randomPoint === null) {
			console.log("CANNOT GENERATE ANY MORE RANDOM POINTS. TEST ABORTING!");
			failedTests++;
			printTestResults(i);
			return;
		}

		// move player to new generated random map point
		playerRef.movePlayerToMapCoords(randomPoint.x, randomPoint.y);

		// save map coords before trying to move
		mapCoordXBeforeMovement = playerRef.mapCoordX;
		mapCoordYBeforeMovement = playerRef.mapCoordY;

		// check if the player is stuck
		let stuck = true;

		// try all direction movements until the player moves
		for (let moveAction of possibleMovements) {
			playerRef[moveAction]();

			// it could move so it is not stuck
			if (playerMoved()) {
				stuck = false;
				break;
			}
		}

		// if the player got stuck then the test failed
		if (stuck) {
			console.log("FAILED. PLAYER IS STUCK");
			failedTests++;
		} else {
			console.log("PASSED.");
			passedTests++;
		}

		if (i === noOfTest) {
			printTestResults(i);
		}
	}
}

function init() {
    loadingScreen = new LoadingScreen();
	let desiredModel = getPreferences();
	
	if (DEBUGGING) {
		let stats = new xStats();
		document.body.appendChild(stats.element);
	}
	
	resourceLoader = new ResourceLoader();
	canvasManager = CanvasManagerFactory(document.getElementById("gameCanvas"));
	
	mapLoader = new MapLoader(resourceLoader);
	
    function loadedMap(resolve, reject) {
        mapLoader.on(MAPS_READY_EVENT, function () {
            mapRenderer = mapLoader.getMapRenderer();
            //mapRenderer.showCollisions();
			// setting the mapRenderer
			StateSaverManager().setMapRenderer(mapRenderer);
			
            resolve();
        });
	}
					 
    // push map loading to pseudo-semaphore so we wait on all the maps
    loadedPromisesArr.push(promisify(loadedMap));

    // Load images for Actor weapons and arrow Projectiles
	loadWeaponsResources();
	loadProjectileResources();

	// instantiate the player using the actorFactory
    player = ActorFactory().getActor(desiredModel, -1, -1, loadedPromisesArr);

    // add the player with the rest of the drawable entities
	DRAWABLE_ENTITIES.push(player);

    // instantiate each enemy once, ignoring the returned instantiated enemy just to force
	// the loading of all the image resources used in the enemies
    for (let enemyName of ActorFactory.enemyNames) {
	    ActorFactory().getActor(enemyName);
    }
	
	// setting the stateSaver in the mapLoader and also initialising it
	mapLoader.setStateSaver(StateSaverManager());
	// passing the reference to the player
	mapLoader.setPlayerReference(player);
	
	// initialise the movementManager with the player reference
	movementManager = new MovementManager(player);

    // push map loading to pseudo-semaphore so we wait on all the maps
    loadedPromisesArr.push(promisify(loadedMap));

    // wait on loadMap and loadPlayer
    waitOnAllPromises(loadedPromisesArr).then(
        function onResolved() {
            initGameOnLoaded();
        },
        function onRejected(err) {
            console.error(err);
        }
    );

    mapLoader.load();

    player.addEventListener(Enemy.KILLED_ENEMY_EVENT, function(e) {
    	let enemyName = e.detail;
    	console.log("KILLED A " + enemyName);
    });

    /* THROWS ERROR. MAP PARSING HASN'T TAKEN PLACE YET
    ActorFactory().generateEnemySpawnPoint(DUNGEON, 2779, 2239, ["rangedSkeleton", "darkElf", "capedSkeleton"],
	    4, 3000);

     */
}

function loadWeaponsResources() {
	// small function to find the index of a resource with a given name
	function findResourceIndex(resName) {
		for (let idx = 0; idx < RESOURCES.length; idx++) {
			if (RESOURCES[idx].name === resName) {
				return idx;
			}
		}
			
		return -1;
	}
	
	let weaponsResourcesNames = ["bow", "arrow", "spear", "dagger"],
		weaponResources = [];
	
	// Actor.waitOn() static method needs a resLoader on the object it loads the resources for
	Actor.WEAPONS.resLoader = new ResourceLoader();
	
	// load all the weapons images and add them in the Actor.WEAPONS dictionary
	for (let resName of weaponsResourcesNames) {
		// getting only the slice of weapons resources from all the Actor resources
		weaponResources.push(RESOURCES[findResourceIndex(resName)]);
		// waiting on the resource to load globally, also adding them to Actor.WEAPONS
		Actor.waitOn(Actor.WEAPONS, loadedPromisesArr, resName);
	}
	
	/*
		Start loading the resources
	 */
	Actor.WEAPONS.resLoader.add(weaponResources);
	Actor.WEAPONS.resLoader.load();
}

function loadProjectileResources() {
	// Actor.waitOn() static method needs a resLoader on the object it loads the resources for
	Projectile.LOADED_RESOURCES.resLoader = new ResourceLoader();

	// load all the weapons images and add them in the Actor.WEAPONS dictionary
	for (let resObj of Projectile.RESOURCES) {
		let resName = resObj.name;
		// waiting on the resource to load globally, also adding them to Projectile.RESOURCES
		Actor.waitOn(Projectile.LOADED_RESOURCES, loadedPromisesArr, resName);
	}

	/*
		Start loading the resources
	 */
	Projectile.LOADED_RESOURCES.resLoader.add(Projectile.RESOURCES);
	Projectile.LOADED_RESOURCES.resLoader.load();
}

function initGameOnLoaded() {
    // begin drawing everything
    requestAnimationFrame(draw);
    loadingScreen.removeLoadingScreen();

    // generating dynamic spawn point
	ActorFactory().generateEnemySpawnPoint(DUNGEON, 2779, 2239, ["rangedSkeleton", "darkElf", "capedSkeleton"],
		4, 3000, 5, function() {
		console.log("The player killed 5 enemies on this spawn point");
	}, 7);

    // testing enemy random point generation with 10000 tests
	//TEST_RANDOM_POINT_GENERATION(player, 5000, 10000);
}

// player added to the DRAWABLE_ENTITIES array
function draw() {
	for (let entity of DRAWABLE_ENTITIES) {
		entity.update();
	}

	// make sure we draw entities in order
	DRAWABLE_ENTITIES.sort(function cmp(a, b) {
		if (a.coordY === b.coordY) {
			return a.coordX - b.coordX;
		}

		return a.coordY - b.coordY;
	});
	
	mapRenderer.draw();

	for (let entity of DRAWABLE_ENTITIES) {
		entity.draw();
	}
	
	requestAnimationFrame(draw);
}

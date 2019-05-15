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
let loadingScreen, resourceLoader, canvasManager, mapRenderer, mapLoader, player, movementManager, loadedPromisesArr = [];
// all Actors and Projectiles are kept in this array so they all are
// updated and drawn every game update cycle
let DRAWABLE_ENTITIES = [];

function init() {
    loadingScreen = new LoadingScreen();
	
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
            mapRenderer.showCollisions();
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
	
    player = new Player(loadedPromisesArr, {
		"base" : "playerBody1",
		"hair" : null,
		"feetArmour" : "pantsArmour1",
		"bootsArmour" : "bootsArmour1",
		"bodyArmour" : "bodyArmour1",
		"armsArmour" : "armsArmour1",
		"headArmour" : "helmArmour1"
	}, Actor.DAGGER);
	
	// setting the stateSaver in the mapLoader and also initialising it
	mapLoader.setStateSaver(StateSaverManager());
	// passing the reference to the player
	mapLoader.setPlayerReference(player);
	
	// initialise the movementManager with the player reference
	movementManager = new MovementManager(player);

    // push map loading to pseudo-semaphore so we wait on all the maps
    loadedPromisesArr.push(promisify(loadedMap));

    // initialise the movementManager with the player reference
    movementManager = new MovementManager(player);

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
}

function draw() {
	player.update();

	for (let entity of DRAWABLE_ENTITIES) {
		// all update functions should return their index in the DRAWABLE_ENTITIES arr if they ran out of use
		// (i.e. they despawned, died, collided, etc.) or -1 if they are still in use
		let index = entity.update();

		if (index != -1 && typeof(index) === "number") {
			DRAWABLE_ENTITIES.splice(index, 1);
		}
	}
	
	mapRenderer.draw();
	player.draw();

	for (let entity of DRAWABLE_ENTITIES) {
		entity.draw();
	}
	
	requestAnimationFrame(draw);
}

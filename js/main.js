var DEBUGGING = true;

MapLoader.RESOURCES = [
	{
		name : "MainMap",
		itemType : "JSON",
		url : "Tiled/map/map1.json"
	},
	{
		name : "CastleMap",
		itemType : "JSON",
		url : "Tiled/map/castle2.json"
	},
    {
        name : "Dungeon",
        itemType : "JSON",
        url : "Tiled/map/dungeon.json"
    },
];

// in case the name of the map resources changes
const MAIN_MAP = "MainMap", CASTLE_MAP = "CastleMap", DUNGEON = "Dungeon";

/*
    when this event fires on the mapLoader instance 
    it means the mapRenderer has been initialised
*/
const MAPS_READY_EVENT = "mapRendererInitialised";


/*
    all the global objects should be moved in a Game class later
*/
var resourceLoader, canvasManager, mapRenderer, mapLoader, player, movementManager, loadedPromisesArr = [];

function init() {
    loadingScreen = new LoadingScreen();
	if (DEBUGGING) {
		var stats = new xStats();
		document.body.appendChild(stats.element);
	}
	
	resourceLoader = new ResourceLoader();
	canvasManager = CanvasManagerFactory(document.getElementById("gameCanvas"));
	
	mapLoader = new MapLoader(resourceLoader);
    
    function loadedMap(resolve, reject) {
        mapLoader.on(MAPS_READY_EVENT, function() {
            mapRenderer = mapLoader.getMapRenderer();
            player.setMapRenderer(mapRenderer);
            mapRenderer.showCollisions();
            resolve();
        });
	}
    
    // push map loading to pseudo-semaphore so we wait on all the maps
    loadedPromisesArr.push(promisify(loadedMap));
	
    player = new Player(loadedPromisesArr, {
		"base" : "playerBody1",
		"hair" : null,
		"feetArmour" : "pantsArmour1",
		"bootsArmour" : "bootsArmour1",
		"bodyArmour" : "bodyArmour1",
		"armsArmour" : "armsArmour1",
		"headArmour" : "helmArmour1"
	});
	
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
    var dialogue = new DialogueBox();
    dialogue.setQuestion("ce faci?");
    dialogue.setOptions("bine", "bine", "foarte bine", "se lipesc banii de mine");
}

function initGameOnLoaded() {
	// begin drawing everything
	requestAnimationFrame(draw);
    loadingScreen.removeLoadingScreen();
}

function draw() {
	mapRenderer.draw();
	player.draw();
	
	requestAnimationFrame(draw);
}


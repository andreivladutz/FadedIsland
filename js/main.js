var DEBUGGING = true;

MapLoader.RESOURCES = [
	{
		name : "TestMap",
		itemType : "JSON",
		url : "Tiled/map/test.json"
	},{
		name : "MainMap",
		itemType : "JSON",
		url : "Tiled/map/map1.json"
	},{
		name : "CastleMap",
		itemType : "JSON",
		url : "Tiled/map/castle2.json"
	},
];

// in case the name of the map resources changes
const MAIN_MAP = "MainMap", TEST_MAP = "TestMap", CASTLE_MAP = "CastleMap";

/*
    when this event fires on the mapLoader instance 
    it means the mapRenderer has been initialised
*/
const MAPS_READY_EVENT = "mapRendererInitialised"


/*
    all the global objects should be moved in a Game class later
*/
var resourceLoader, canvasManager, mapRenderer, mapLoader, player, loadedPromisesArr = [];

function init() {
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
            //mapRenderer.showCollisions();
            resolve();
        });
    }
    
    
    
    // push map loading to pseudo-semaphore
    loadedPromisesArr.push(promisify(loadedMap));
    player = new Player(canvasManager.canvas, loadedPromisesArr);
    
    // wait on loadMap and loadPlayer
    waitOnAllPromises(loadedPromisesArr).then(
        function onResolved() {
            requestAnimationFrame(draw);
        },
        function onRejected(err) {
            console.error(err);
        }
    )
    
    mapLoader.load();
}

function draw() {
	mapRenderer.draw();
	player.draw();
	requestAnimationFrame(draw);
}


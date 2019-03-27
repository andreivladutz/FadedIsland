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
	},
];

// in case the name of the map resources changes
const MAIN_MAP = "MainMap", TEST_MAP = "TestMap";

/*
    when this event fires on the mapLoader instance 
    it means the mapRenderer has been initialised
*/
const MAPS_READY_EVENT = "mapRendererInitialised"


/*
    all the global objects should be moved in a Game class later
*/
var resourceLoader, canvasManager, mapRenderer, mapLoader;

function init() {
	if (DEBUGGING) {
		var stats = new xStats();
		document.body.appendChild(stats.element);
	}
	
	resourceLoader = new ResourceLoader();
	canvasManager = CanvasManagerFactory(document.getElementById("gameCanvas"));
	mapLoader = new MapLoader(resourceLoader);
    
    mapLoader.on(MAPS_READY_EVENT, function() {
        mapRenderer = mapLoader.getMapRenderer();
        
        //mapRenderer.showCollisions();
		requestAnimationFrame(draw);
    });
    
    mapLoader.load();
}

function draw() {
	mapRenderer.draw();
	
	requestAnimationFrame(draw);
}


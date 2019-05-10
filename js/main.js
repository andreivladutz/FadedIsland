var DEBUGGING = true;

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
        mapLoader.on(MAPS_READY_EVENT, function () {
            mapRenderer = mapLoader.getMapRenderer();
            player.setMapRenderer(mapRenderer);
            mapRenderer.showCollisions();
            resolve();
        });
    }



    // push map loading to pseudo-semaphore so we wait on all the maps
    loadedPromisesArr.push(promisify(loadedMap));
    player = new Player(canvasManager.canvas, loadedPromisesArr);
    // initialise the movementManager with the player reference
    movementManager = new MovementManager(player);

    // wait on loadMap and loadPlayer
    waitOnAllPromises(loadedPromisesArr).then(
        function onResolved() {
            requestAnimationFrame(draw);
            loadingScreen.removeLoadingScreen();
        },
        function onRejected(err) {
            console.error(err);
        }
    );

    mapLoader.load();
    var dialogue = new DialogueBox();
    dialogue.setQuestion("A ajuns sa-mi fie frica sa ies din casa. Sunt om batran, nu ma pot apara.");
    dialogue.setOptions([{
        text: "sunt un prost si ma cac in gura mea",
        type: 1
    }, {
        text: "si eu la fel, bossulik",
        type: 2
    }, {
        text: "caca maca part muie dragnea psd sug coiu tau stang si drept in acelasi timp",
        type: 3
    }, {
        text: "se lipesc banii de mine",
        type: 4
    }]);
    dialogue.waitOnInput();
}

function draw() {
    mapRenderer.draw();
    player.draw();
    requestAnimationFrame(draw);
}

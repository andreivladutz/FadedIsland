/*
    MapLoader handles the initialising of every map in the game, keeping an instance of mapRenderer
    
    It loads the resources via a local resourceLoader, but moves everything on the global resourceLoader
                once all the files needed for the rendering of a map were loaded 
                
    The map resources to be loaded (i.e. the main map json workfiles) should be added in the MapLoader.RESOURCES array
*/

class MapLoader extends EventEmiter {
    constructor(globalResourceLoader) {
        super();
        this.resLoader = new ResourceLoader();
        this.globalResLoader = globalResourceLoader;
        
        this.canvasManager = CanvasManagerFactory();
        
        //will be inited once all the resources have been loaded properly
        this.mapRenderer = null;
		
		// reference to the state saver
		// will be initialised later with setStateSaver
		this.stateSaver = null;
		
		// reference to the player
		// will be inited later with setPlayerReference
		this.playerReference = null;
        
        //array of promises to be fullfilled on the loading 
        this.loadedResourcesPromises = [];
    }
}

_p = MapLoader.prototype;

_p.setStateSaver = function(stateSaver) {
	this.stateSaver = stateSaver;
}

_p.setPlayerReference = function(player) {
	this.playerReference = player;
}

_p.load = function() {
    var self = this;
    
    /*
		listener for the handling of each loaded resource
	*/
	for (let resource of MapLoader.RESOURCES) {
		this.resLoader.addEventListener(
			"loaded" + resource["name"],
			
			function(e) {
				// parsing each map as it's .json file has finished loading
				self.parseMap(e, resource["name"]);
			}
		);
	}
		
	this.resLoader.add(MapLoader.RESOURCES);
    
    // "Maps" = name for the currently loading group of resources 
	this.resLoader.load("Maps");
	
	this.loadedResourcesPromises.push(
		promisify(function(resolve, reject) {
            // waiting on all the json map files to load
			self.resLoader.addEventListener("finishedLoadingMaps", resolve);
		})
	);
	
	// waiting on all map .json files to load, but also waiting on all tilesetworkfiles to load,
	// objects, tilesets, collisions, animated tiles to be parsed and all other processing
	// this guarantees every mapInstance will be instantiated and parsed correctly before onLoadedMaps is called
	waitOnAllPromises(this.loadedResourcesPromises).then(this.onLoadedMaps.bind(this));
}

_p.onLoadedMaps = function() {
	// the MainMap is the only map with more than one spawn point so we have to set it explicitly
	MapRenderer.MAP_INSTANCES[MAIN_MAP].spawnPoint = MapInstance.MAP_TRANSITION_POINTS[MAIN_MAP][MAIN_MAP];
	
	// get the values from the localStorage. If it is the first time the default values will be returned
	let storedValues = this.stateSaver.storedValues,
		storedMapName = storedValues.currentMap;
	
	// init mapRenderer and setting the current map
	this.mapRenderer = new MapRenderer(storedMapName);
	// setting the reference to the mapRenderer on the player before trying to set the spawn point
	// otherwise an error will be thrown
	this.playerReference.setMapRenderer(this.mapRenderer);
	
	// if no value has been stored for the lastMapCoords then the default value is null which evaluates to false
	// so we instead set the lastMapCoords to the value of the spawn point for the currentMap
	storedValues.lastMapCoords ||
		(storedValues.lastMapCoords = MapRenderer.MAP_INSTANCES[storedMapName].getSpawnPoint());
	
	// set the player spawn point
	this.playerReference.movePlayerToMapCoords(storedValues.lastMapCoords.x, storedValues.lastMapCoords.y);
	
    this.resLoader.moveResourcesTo(this.globalResLoader);
        
    this.emit(MAPS_READY_EVENT, null);
}

/*
    once the json workfile for the map is loaded we start parsing it
    and kick the loader for the tilesets workfiles and images
*/
_p.parseMap = function(e, mapName) {
	var xhttpObj = e.detail;
	
	var mapParser = new MapParser(this.globalResLoader, xhttpObj.response, this.loadedResourcesPromises, mapName);

	mapParser.on(LOADED_TILESETS_EVENT, function() {	
		MapRenderer.MAP_INSTANCES[mapName] = mapParser.getMapInstance(mapName);
	});
}

_p.getMapRenderer = function() {
	if (this.mapRenderer === null) {
		throw new Error("Trying to get an uninstantiated reference to mapRenderer");
	}
	
    return this.mapRenderer;
}
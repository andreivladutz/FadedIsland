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
        
        //array of promises to be fullfilled on the loading 
        this.loadedResourcesPromises = [];
    }
}

_p = MapLoader.prototype;

_p.load = function() {
    var self = this;
    
    /*
		listener for the handling of each loaded resource
	*/
	for (let resource of MapLoader.RESOURCES) {
		this.resLoader.addEventListener(
			"loaded" + resource["name"],
			
			function(e) {
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
	
	waitOnAllPromises(this.loadedResourcesPromises).then(function() {
		self.mapRenderer = new MapRenderer(MAIN_MAP);
        self.resLoader.moveResourcesTo(self.globalResLoader);
        
        self.emit(MAPS_READY_EVENT, null);
	});
}

/*
    once the json workfile for the map is loaded we start parsing it
    and kick the loader for the tilesets workfiles and images
*/
_p.parseMap = function(e, mapName) {
	var xhttpObj = e.detail;
	
	var mapParser = new MapParser(this.globalResLoader, xhttpObj.response, this.loadedResourcesPromises);

	mapParser.on(LOADED_TILESETS_EVENT, function() {	
		MapRenderer.MAP_INSTANCES[mapName] = mapParser.getMapInstance(mapName);
	});
}

_p.getMapRenderer = function() {
    return this.mapRenderer;
}
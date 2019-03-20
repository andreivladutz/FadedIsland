var DEBUGGING = true;

const RESOURCES = [
	{
		name : "Map1",
		itemType : "JSON",
		url : "Tiled/map/test.json"
	},{
		name : "Map2",
		itemType : "JSON",
		url : "Tiled/map/map1.json"
	},
];

var resourceLoader, canvasManager, mapRenderer;

//array of promises to be fullfilled on the loading 
var loadedResourcesPromises = [];

function init() {
	if (DEBUGGING) {
		var stats = new xStats();
		document.body.appendChild(stats.element);
	}
	
	
	resourceLoader = new ResourceLoader();
	canvasManager = CanvasManagerFactory(document.getElementById("gameCanvas"));
	
	/*
		listener for the handling of each loaded resource
	*/
	for (let resource of RESOURCES) {
		resourceLoader.addEventListener(
			"loaded" + resource["name"],
			
			function(e){
				MapRenderer.MAP_INSTANCES[resource["name"]] = 
					parseMap(e, resource["name"]);
			}
		);
	}
		
	resourceLoader.add(RESOURCES);
	resourceLoader.load("Maps");
	
	loadedResourcesPromises.push(
		promisify(function(resolve, reject) {
			resourceLoader.addEventListener("finishedLoadingMaps", resolve);
		})
	);
	
	waitOnAllPromises(loadedResourcesPromises).then(function() {
		mapRenderer = new MapRenderer("Map2");
		mapRenderer.draw();
	});
}

function parseMap(e, mapName) {
	var xhttpObj = e.detail;
	
	var mapParser = new MapParser(resourceLoader, xhttpObj.response, loadedResourcesPromises);
	
	return mapParser.getMapInstance(mapName);
}
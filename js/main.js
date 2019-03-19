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

var resourceLoader = new ResourceLoader();

function init() {
	if (DEBUGGING) {
		var stats = new xStats();
		document.body.appendChild(stats.element);
	}
	
	/*
		listener for the handling of each loaded resource
	*/
	for (let resource of RESOURCES) {
		resourceLoader.addEventListener(
			"loaded" + resource["name"],
			
			function(e){
				MapRenderer.MAP_INSTANCES[resource["name"]] = 
					parseMap(e);
			}
		);
	}
		
	resourceLoader.add(RESOURCES);
	resourceLoader.load();
}

function parseMap(e) {
	var xhttpObj = e.detail;
	
	var mapParser = new MapParser(resourceLoader, xhttpObj.response);
	
	return mapParser.getMapInstance();
}
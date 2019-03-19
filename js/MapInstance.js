const OBJECT_X = "x", OBJECT_Y = "y"; 
class MapInstance {
	constructor(
		jsonMapObject,
		tilesetsWorkfiles,
		tileSize,
		mapWidth,
		mapHeight,
		tilesMatrix,
		objectsArr) {
			
			//the parsed map.json file
			this.jsonMapObject = jsonMapObject;
			
			/*
				the tilesets array of objects from the map.json plus on each object:
				JSONobject property = the parsed .json tileset workfile
				image property = the loaded tileset image
			*/
			this.tilesetsWorkfiles = tilesetsWorkfiles;
			
			//the size of a single square tile
			this.tileSize = tileSize;
			
			//map size
			this.mapWidth = mapWidth
			this.mapHeight = mapHeight;
			
			//the matrix of tile numbers
			this.tilesMatrix = tilesMatrix;
			
			//the array of objects from the map.json file
			this.objectsArr = objectsArr;
	}
}
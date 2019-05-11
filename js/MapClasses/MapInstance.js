const OBJECT_X = "x", OBJECT_Y = "y", IMAGE_OF_TILESET = "image", 
	  FIRST_TILE_NUMBER = "firstgid", TILES_PER_ROW = "columns",
	  DEFAULT_TILE = "defaultTile", JSON_TILESET_WORKFILE = "tilesetWorkfile"; 

class MapInstance extends EventEmiter {
	constructor(
		mapName,
		tilesetsWorkfiles,
		tileSize,
		mapWidth,
		mapHeight,
		tilesMatrices,
		objectsArr,
		objectTemplates,
		collisionMatrix,
		animationsArr) {
			super();
			//own map name
			this.mapName = mapName;
			
			/*
				the tilesets array of objects from the map.json plus on each object:
				JSONobject property = the parsed .json tileset workfile
				image property = the loaded tileset image
			*/
			this.tilesetsWorkfiles = tilesetsWorkfiles;
			
			//the size of a single square tile
			this.tileSize = tileSize;
			
			//map size in number of tiles
			this.mapWidth = mapWidth
			this.mapHeight = mapHeight;
			
			//the array of matrices of tile numbers
			//each matrix is a layer of tiles
			this.tilesMatrices = tilesMatrices;
			
			// the array of objects from the map.json file
			// the objects can be of more than one type -> spawn points, template
			this.objectsArr = objectsArr;
			
			// the array of template objects that can be drawn (they have a tileset)
			this.drawableObjects = [];
			
			// relevant points that the player can interact with on the map
			// they mark NPCS, transition points from map to map
			this.interactionPoints = [];
			
			/*
				the dictionary(object) of object templates
				
				where the key is the source of the json tileset workfile 
				corresponding to the object template
				
			*/
			this.objectTemplates = objectTemplates;
			
			// spawnPoint will be of the form
			// {x: xCoord, y: yCoord}
			this.spawnPoint = null;
			
			//true => we cannot walk on the tile 
			//false => no collision with the tile
			this.collisionMatrix = collisionMatrix;
			
			/*
				an array of animation arrays as it is defined in the tileset json
				workfile, with extra properties :
				
				matrixPosition - an object {i, j} with the position in the world
				currentId - the id of the current tile drawn
				currentFrame - the array index of the current frame drawn
			*/
			
			this.animationsArr = animationsArr;
			// animations are now processed in the mapParser
			// this.processAnimations();
			this.processObjects();
			
			//the map coordinates
			this.mapX = 0;
			this.mapY = 0;
			
			CanvasManagerFactory().addEventListener(
				CANVAS_RESIZE_EVENT, 
				this.updateViewportSize.bind(this)
			);
			
			this.updateViewportSize();
	}
}

MapInstance.TEMPLATE = "template";
MapInstance.SPAWN_POINT = "spawnpoint";

/*
	object with properties like this:
	
	{
		"map1Name": {
			"map2Name" : {
				x: coordX,
				y: coordY
			}
		}
	}
	
	where MapInstance.MAP_TRANSITION_POINTS[map1Name][map2Name] is the spawn point
					when moving from map1Name to map2Name 
*/
MapInstance.MAP_TRANSITION_POINTS = {};

_p = MapInstance.prototype;

//returns true if the coords and tileId match an animated tile 
_p.isAnimated = function(i, j, tileId) {
	for (let animationArr of this.animationsArr) {
		for (let animationObj of animationArr) {
			if (animationObj.tileid == tileId ) {
				if (animationArr[POSITION_IN_MATRIX].i == i 
					&& animationArr[POSITION_IN_MATRIX].j == j) {
						return true;
				}
			}
		}
		
	}
	
	return false;
}

_p.processObjects = function() {
	// bringing properties closer to be accessed easier
	for (let src in this.objectTemplates) {
		let obj = this.objectTemplates[src];
		
		obj.image = obj.jsonTemplateWorkfile.tileset.image;
		obj.JSONobject = obj.jsonTemplateWorkfile.tileset.JSONobject;
		
		obj.width = obj.JSONobject.tilewidth;
		obj.height = obj.JSONobject.tileheight;
		obj.tilesPerRow = obj.JSONobject[TILES_PER_ROW];
	}
	
	// for each real object we select only the ones that come from a template
	// (those are drawable) and compute the scrX and srcY coordinates of the 
	// object image in the whole tileset image
	for (let pos = this.objectsArr.length - 1; pos >= 0; pos--) {
		let obj = this.objectsArr[pos];
		
		if (MapInstance.TEMPLATE in obj) {
			let src = obj["template"],
				correspondingTemplate = this.objectTemplates[src],
				tileNo = correspondingTemplate.jsonTemplateWorkfile.object.gid - 
					correspondingTemplate.jsonTemplateWorkfile.tileset.firstgid,
				tilesPerRow = correspondingTemplate.tilesPerRow;
			
			obj.srcX = (tileNo % tilesPerRow) * correspondingTemplate.width;
			obj.srcY = Math.floor(tileNo / tilesPerRow) * correspondingTemplate.height;
			
			obj.x = Math.floor(obj.x);
			obj.y = Math.floor(obj.y);
			
			// we separate drawable objects from the rest of the objects	
			this.drawableObjects.push(obj);
			// remove drawable objects from the objectArr
			this.objectsArr.splice(pos, 1);
		}
	
		if ("type" in obj && obj["type"] === MapInstance.SPAWN_POINT) {
			obj.x = Math.floor(obj.x);
			obj.y = Math.floor(obj.y);
			
			this.spawnPoint = {
				x: obj.x,
				y: obj.y
			}
			
			if (!MapInstance.MAP_TRANSITION_POINTS[obj["name"]]) {
				MapInstance.MAP_TRANSITION_POINTS[obj["name"]] = {};
			}
			
			MapInstance.MAP_TRANSITION_POINTS[obj["name"]][this.mapName] = this.spawnPoint;
			
			// the only time we encounter this case where the name of the spawn point is the same as the name of the map
			// is on the MainMap. that is the spawn point for that map and it doesn't take the player to any other map
			
			// !!the rest of the spawn points are also transition points to other maps
			if (obj["name"] != this.mapName) {
				this.interactionPoints.push(obj);
			}
		}
	}
	
	// sorting the drawable objects by y and x so they are drawn in the correct order
	
	this.drawableObjects.sort(function cmp(a, b) {
		if (a.y === b.y) {
			return a.x - b.x;
		}
		
		return a.y - b.y;
	});
	
	console.log("non drawable objects: ", this.objectsArr);
}
 
_p.updateViewportSize = function() {
	//the size of the viewport in pixels
	this.viewportWidth = CanvasManagerFactory().canvas.width;
	this.viewportHeight = CanvasManagerFactory().canvas.height;
}

_p.moveMap = function(deltaX, deltaY) {
	var pixelsMapWidth = this.mapWidth * this.tileSize,
		pixelsMapHeight = this.mapHeight * this.tileSize;
	
	this.updateViewportSize();
	/* 
		if the map can be displayed entireley on the screen we just center it
	*/
	if (this.viewportWidth >= pixelsMapWidth) {
		this.mapX = Math.floor((this.viewportWidth - pixelsMapWidth) / 2);
	}
	
	else {
		this.mapX = Math.min(
			this.mapX + deltaX, 0
		);
		
		this.mapX = Math.max(
			- pixelsMapWidth + this.viewportWidth, this.mapX
		);
	}
	
	/* 
		if the map can be displayed entireley on the screen we just center it
	*/
	if (this.viewportHeight >= pixelsMapHeight) {
		this.mapY = Math.floor((this.viewportHeight - pixelsMapHeight) / 2);
	}
	
	else {
		this.mapY = Math.min(
			this.mapY +  deltaY, 0
		);

		this.mapY = Math.max(
			- pixelsMapHeight + this.viewportHeight, this.mapY
		);
	}
}

_p.getSpawnPoint = function() {
	if (!this.spawnPoint) {
		throw new Error("You are trying to get a spawnPoint that hasn't been initialised");
	}
	
	return this.spawnPoint;
}
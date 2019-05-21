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
			this.mapWidth = mapWidth;
			this.mapHeight = mapHeight;

			// make sure the Node class KNOWS THE SIZE OF THIS MAP
			Node.MAP_SIZES[mapName].WIDTH = mapWidth;
			Node.MAP_SIZES[mapName].HEIGHT = mapHeight;

			//the array of matrices of tile numbers
			//each matrix is a layer of tiles
			this.tilesMatrices = tilesMatrices;
			
			// the array of objects from the map.json file
			// the objects can be of more than one type -> spawn points, template, ...
			this.objectsArr = objectsArr;
			
			// the array of template objects that can be drawn (they have a tileset)
			this.drawableObjects = [];
			
			// relevant points that the player can interact with on the map
			// they mark NPCS, transition points from map to map
			this.interactionPoints = [];

			// all enemy spawn points are pushed here
			this.enemySpawnPoints = [];

			// we keep all the changeRoom points in interactionPoints and here separately
			this.roomChangePoints = [];

			// dungeon map and castle map have rooms. these rooms are delimited by special rectangle objects
			this.roomRectangles = [];
			
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

			this.processObjects();

			// if we found room rectangles then this map has rooms
			if (this.roomRectangles.length) {
				// a matrix of mapWidth * mapHeight that tells us for each tile
				// what room it belongs to
				this.tileToRooms = [];

				for (let i = 0; i < this.mapHeight; i++) {
					this.tileToRooms[i] = [];
				}

				this.checkTilesInRooms();
			}
			
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
MapInstance.ENEMY_SPAWN = "enemyspawn";
MapInstance.ENEMY_SPAWN_INTERVAL = "spawnInterval";
MapInstance.ENEMY_MAX_SPAWN = "maxEnemies";
MapInstance.CHANGE_ROOM_POINT = "changeroom";
MapInstance.ROOM_RECTANGLE = "room";

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

		/*
			handle points
		 */
		if ("point" in obj) {
			obj.x = Math.floor(obj.x);
			obj.y = Math.floor(obj.y);

			// handle SPAWN POINTS
			if ("type" in obj && obj["type"] === MapInstance.SPAWN_POINT) {
				this.spawnPoint = {
					x: obj.x,
					y: obj.y
				};

				if (!MapInstance.MAP_TRANSITION_POINTS[obj["name"]]) {
					MapInstance.MAP_TRANSITION_POINTS[obj["name"]] = {};
				}

				MapInstance.MAP_TRANSITION_POINTS[obj["name"]][this.mapName] = this.spawnPoint;

				// the only time we encounter this case where the name of the spawn point is the same as the name of the map
				// is on the MainMap. that is the spawn point for that map and it doesn't take the player to any other map

				// !!the rest of the spawn points are also transition points to other maps
				if (obj["name"] !== this.mapName) {
					this.interactionPoints.push(obj);
				}
			}
			// handle change room points
			if ("type" in obj && obj["type"] === MapInstance.CHANGE_ROOM_POINT) {
				// the identification number for this point
				obj.from = parseInt(obj["name"]);

				// searching what point this point takes the player to
				for (let prop of obj["properties"]) {
					if (prop["name"] === "to") {
						obj.to = prop["value"];
					}
				}

				this.interactionPoints.push(obj);
				this.roomChangePoints.push(obj);
			}

			// handle enemy spawn
			if ("type" in obj && obj["type"] === MapInstance.ENEMY_SPAWN) {
				// check for every enemy name if the current spawn point spawns it
				for (let prop of obj["properties"]) {
					for (let enemyName of ActorFactory.enemyNames) {
						// it spawns the enemy with enemyName if it also has the value "true"
						if (prop["name"] === enemyName && prop["value"] === true) {
							obj[enemyName] = prop["value"];
						}

						if (prop["name"] === MapInstance.ENEMY_SPAWN_INTERVAL) {
							obj[MapInstance.ENEMY_SPAWN_INTERVAL] = prop["value"];
						}

						if (prop["name"] === MapInstance.ENEMY_MAX_SPAWN) {
							obj[MapInstance.ENEMY_MAX_SPAWN] = prop["value"];
						}
					}
				}

				obj.active = true;
				// keep a reference to all spawned enemies
				obj.SPAWNED_ENEMIES = [];

				this.enemySpawnPoints.push(obj);
			}

			// deleting useless properties
			delete obj["properties"];
			delete obj["point"];
			delete obj["id"];
			delete obj["rotation"];
			delete obj["visible"];
			delete obj["width"];
			delete obj["height"];

			// remove points objects from the objectArr
			this.objectsArr.splice(pos, 1);
		}

		// handle the rectangles that define rooms boundaries
		if ("type" in obj && obj["type"] === MapInstance.ROOM_RECTANGLE) {
			// the object name is the number of the room it delimits
			obj.name = parseInt(obj.name);

			// remove useless properties
			delete obj["rotation"];
			delete obj["visible"];
			delete obj["id"];

			this.roomRectangles.push(obj);

			// remove rectangle objects from the objectArr
			this.objectsArr.splice(pos, 1);
		}
	}
	
	// sorting the drawable objects by y and x so they are drawn in the correct order
	
	this.drawableObjects.sort(function cmp(a, b) {
		if (a.y === b.y) {
			return a.x - b.x;
		}
		
		return a.y - b.y;
	});
	
	console.log("spawn points ", this.enemySpawnPoints);
}

// find each tile what room it belongs to
_p.checkTilesInRooms = function() {
	// check intersection between two rectangles -> top-left corner coords, right-bottom corner coords
	function rectIntersection(rectA, rectB) {
		// condition:
		if (rectA.left <= rectB.right && rectA.right >= rectB.left &&
			rectA.top <= rectB.bottom && rectA.bottom >= rectB.top ) {

			return rectIntArea(rectA, rectB);
		}
		return 0;
	}

	function rectIntArea(rectA, rectB) {
		let lx = Math.max(rectA.left, rectB.left), ty = Math.max(rectA.top, rectB.top),
			rx = Math.min(rectA.right, rectB.right), by = Math.min(rectA.bottom, rectB.bottom),
			width = rx - lx, height = by - ty;

		return width * height;
	}

	let tileSz = this.tileSize;

	// take each tile and check it against all room rectangles until we find what room each tile belongs to
	for (let tileY = 0; tileY < this.mapHeight; tileY++) {
		for (let tileX = 0; tileX < this.mapWidth; tileX++) {
			// for one tile we might have intersection with more rooms so we take all the rooms
			// and the winning one is the one with the greatest intersection area with our tile
			let foundRooms = [];

			for (let roomRect of this.roomRectangles) {
				let rectA = {
						top: tileY * tileSz,
						left: tileX * tileSz,
						right: (tileX + 1) * tileSz,
						bottom: (tileY + 1) * tileSz
					},
					rectB = {
						top: roomRect.y,
						left: roomRect.x,
						right: roomRect.x + roomRect.width,
						bottom: roomRect.y + roomRect.height
					},
					hasIntersection = rectIntersection(rectA, rectB);

				// if not 0 then the return value is the intersection area
				if (hasIntersection) {
					// push room number and intersection area
					foundRooms.push({no: roomRect.name, intersectionArea: hasIntersection});
				}
			}

			if (foundRooms.length) {
				// if more rooms are found get the one with the biggest intersection area
				let maxIdx = 0;
				for (let idx = 1; idx < foundRooms.length; idx++) {
					if (foundRooms[idx].intersectionArea > foundRooms[maxIdx].intersectionArea) {
						maxIdx = idx;
					}
				}

				this.tileToRooms[tileY][tileX] = foundRooms[maxIdx].no;
			}
			else {
				// doesn't belong to any room
				this.tileToRooms[tileY][tileX] = -1;
			}
		}
	}

	// same logic applies to drawable objects
	for (let obj of this.drawableObjects) {
		// for every drawable object find the room it belongs to
		for (let roomRect of this.roomRectangles) {
			// the x, y coords on the obj are the coords for the bottom-left corner
			let src = obj["template"],
				templateObj = this.objectTemplates[src],
				objWidth = templateObj.width, objHeight = templateObj.height,
				rectA = {
					top: obj.y - objHeight,
					left: obj.x,
					right: obj.x + objWidth,
					bottom: obj.y,
				},
				rectB = {
					top: roomRect.y,
					left: roomRect.x,
					right: roomRect.x + roomRect.width,
					bottom: roomRect.y + roomRect.height
				};

			if (rectIntersection(rectA, rectB)) {
				obj.roomNumber = roomRect.name;
				// found room number break out of inner loop
				break;
			}
		}
	}
};
 
_p.updateViewportSize = function() {
	//the size of the viewport in pixels
	this.viewportWidth = CanvasManagerFactory().canvas.width;
	this.viewportHeight = CanvasManagerFactory().canvas.height;
};

_p.moveMap = function(deltaX, deltaY) {
	var pixelsMapWidth = this.mapWidth * this.tileSize,
		pixelsMapHeight = this.mapHeight * this.tileSize;
	
	this.updateViewportSize();
	/* 
		if the map can be displayed entirely on the screen we just center it
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
		if the map can be displayed entirely on the screen we just center it
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
};

_p.getSpawnPoint = function() {
	if (!this.spawnPoint) {
		throw new Error("You are trying to get a spawnPoint that hasn't been initialised");
	}
	
	return this.spawnPoint;
};
"use strict";


class Player extends Actor {
    constructor(loadedPromisesArr, customResources, attackType) {
        super(loadedPromisesArr, customResources, attackType);
		// override actor values
        this.speed = 5;
		
		// make the player faster if we debug
		// don't wanna waste time walking slow
		/*
		if (DEBUGGING) {
			this.speed = 20;
		}
	    */
		
		// keeping the close interaction points so we can check every time if we are in proximity of any point
        this.visibleInteractionPoints = [];
		
		// a dictionary of registered handlers for accepting the interaction with a close point
		// the handlers will be registered while the player is in the proximity of a point
		// and then removed when the player has left the proximity of that point
		this.interactionHandlers = {};

		// a dictionary of spawning intervals which get registered when the player
	    // is close to an enemy spawn point, and then they get removed when the player gets further away
		this.spawnIntervals = {};

		// the player keeps count in which room it is now
	    // and informs the mapRenderer with the room
		this.currentRoom = -1;

		setInterval(function regen(self) {
			if (self.health < Player.HEALTH) {
				self.health++;
				// -(-1) actually gained health
				self.healthBar.tookDamage(-1);
			}
		}, Player.REGEN_TIME, this);
		
		let self = this;
		
		// the event comes with the type of the zoom -> in or out
		CanvasManagerFactory().addEventListener(CANVAS_RESIZE_EVENT, function() {
			if (!self.mapRenderer) {
				return;
			}
			
			self.updateCoordsOnResize();
		});
        
        window.addEventListener("mousedown", this.startAttack.bind(this));
		window.addEventListener("mousemove", this.computeDirection.bind(this));
        
		// window.addEventListener("mouseup", this.mouseRelease.bind(this));
	}

	initHealthBar() {
		this.health = Player.HEALTH;
		this.healthBarColor = "green";
	}
	
	// after setting the mapRenderer we register mapChange and redrawnOffscreen event handlers
	setMapRenderer(mapRenderer) {
		super.setMapRenderer(mapRenderer);
		
		this.mapRenderer.on(MapRenderer.CHANGED_MAP_EVENT, this.movePlayerToSpawnPoint.bind(this));
		// setting the close interaction points so we can check every time if we are in proximity of any point
		this.mapRenderer.on(MapRenderer.REDRAWN_OFFSCREEN, this.setVisibleInteractionPoints.bind(this));
	}
	
	setVisibleInteractionPoints(e) {
		this.visibleInteractionPoints = e.detail;
		
		// remove the handlers for the interaction with the old points
		this.removeInteractionHandlers();
		
		//check new proximity
		this.checkInteractionPointsProximity();
	}
	
	// the computeDirection just uses the computeDirection from the Actor class
	computeDirection(e) {
		let x = e.clientX, y = e.clientY;
		super.computeDirection(x, y);
	}
	
	startAttack(e) {
    	// if already initialised attack or died
    	if (this.attacking || this.died) {
    		return;
	    }
		this.computeDirection(e);
		super.startAttack();

		// checking if we hit any enemy
		for (let enemy of ENEMIES) {
			if (this.melee() && this.checkHitOnActor(enemy)) {
				enemy.bleed(this.attackDamage, this.direction, this.attackDuration * 2);
			}
		}
	}

	// this overridden function also check collision with enemies
	update() {
		this.checkEnemiesCollision();
		super.update();
	}
}

_p = Player.prototype;

Player.INTERACTION_BOX_TIME = 2000;

Player.ENEMYSPAWN_POINT_PROXIMITY = 1000;
Player.DEFAULT_ENEMYSPAWN_INTERVAL = 3000;
Player.MAX_SPAWNED_ENEMIES = 10;

Player.INTERACTION_POINT_PROXIMITY = 100;
Player.INTERACTION_KEY = "e";

Player.HEALTH = 250;

// regenerate player health every second
Player.REGEN_TIME = 1000;


/*
	every time we move we need to check if we left the old room
 */
_p.checkCurrentRoom = function() {
	if (!this.mapRenderer.mapHasRooms()) {
		if (this.currentRoom !== -1) {
			this.currentRoom = -1;
		}

		return;
	}

	let tileCoords = this.mapRenderer.screenCoordsToTileCoords({x: this.coordX, y: this.coordY}),
		newRoom = this.mapRenderer.getTilesToRooms()[tileCoords.y][tileCoords.x];

	// the room was changed
	if (this.currentRoom !== newRoom) {
		this.currentRoom = newRoom;
		this.mapRenderer.changedRoom();
	}
};

_p.handleAfterDeath = function(){
	var endScreen = document.createElement("div");
	endScreen.id = "end-screen";
	endScreen.textContent = "You Died";
	
	var retryButton = document.createElement("div");
	retryButton.textContent = "Retry";
	retryButton.id = "retry-button";
	retryButton.addEventListener("click", function(){
		window.location.href = "index.html?continue=true";
	})
	
	
	var menuButton = document.createElement("div");
	menuButton.textContent = "Main Menu";
	menuButton.id = "menu-button";
	menuButton.addEventListener("click", function(){
		window.location.href = "menu_test.html?";
	})
	
	document.body.appendChild(endScreen);
	document.body.appendChild(retryButton);
	document.body.appendChild(menuButton);
}

// we want to move the player to the spawn point of that map when the map gets changed
// FOR EXAMPLE: 
// if we came from dungeon back to mainMap we want to go at the transition point on the mainMap for the dungeon
//
// also remove all the old interaction points
_p.movePlayerToSpawnPoint = function(e) {
	let changeMapEv = e.detail,
		spawnPoint = MapInstance.MAP_TRANSITION_POINTS[changeMapEv.oldMap][changeMapEv.newMap];
	
	this.movePlayerToMapCoords(spawnPoint.x, spawnPoint.y);
	
	// remove the handlers for the interaction with the old points
	this.removeInteractionHandlers();
};

/*
	having given some map coordinates we move the map and compute player screen coords 
	such that the player will be at the given coords on the map
 */
_p.movePlayerToMapCoords = function(x, y) {
	var midX = this.canvas.width / 2, midY = this.canvas.height / 2,
		mapWidth = this.mapRenderer.getMapWidth(), mapHeight = this.mapRenderer.getMapHeight(),
		mapMovedX, mapMovedY;
	
	// set X COORDS
	if (x < midX) {
		mapMovedX = 0;
		this.coordX = x;
	}
	else if (x >= mapWidth - midX) {
		mapMovedX = mapWidth - this.canvas.width;
		this.coordX = x - mapMovedX;
	}
	else {
		mapMovedX = x - midX;
		this.resetXCoordsToCenter();
	}
	
	// set Y COORDS
	if (y < midY) {
		mapMovedY = 0;
		this.coordY = y;
	}
	else if (y >= mapHeight - midY) {
		mapMovedY = mapHeight - this.canvas.height;
		this.coordY = y - mapMovedY;
	}
	else {
		mapMovedY = y - midY;
		this.resetYCoordsToCenter();
	}
	
	// don't forget to update body coord
	this.coordBodyY = this.coordY - FRAME_HEIGHT / 5;
	
	this.mapRenderer.setMapCoords(- Math.round(mapMovedX), - Math.round(mapMovedY));
	
	this.updateMapCoords();
	this.checkInteractionPointsProximity();
	this.checkCurrentRoom();
};

/*
 * when the map changes or the screen size gets updated the screen coords change but the map coords 
 * should remain the same -> so we move the "camera" (actually the map). this way the player remains at the same map coords
 */ 
_p.updateCoordsOnResize = function() {
	this.movePlayerToMapCoords(this.mapCoordX, this.mapCoordY);
};

/*
	this functions checks the collision between the Player and visible game objects (drawn objects)
	it overrides the function in the Actor class because the player is always in the visible zone
	so it makes sense to check the collision only against currently drawn objects.

	for other actors (e.g. enemies) we have to check collision against all drawable objects
	since they might be out of sight
 */
_p.checkCollisionAgainstObjects = function(lftActorX, rightActorX, y) {
	/*
		the Player coords received by the function are screen coords
				so they need to be converted to map coords
	*/
	({x: lftActorX, y} = this.mapRenderer.screenCoordsToMapCoords({x : lftActorX, y}));
	({x: rightActorX} = this.mapRenderer.screenCoordsToMapCoords({x : rightActorX, y}));

	let visibleObjects = this.mapRenderer.getLastDrawnObjects(),
		templates = this.mapRenderer.getTemplateObjects();

	// checking against every object
	for (let obj of visibleObjects) {
		let src = obj["template"],
			correspondingTemplate = templates[src],
			width = correspondingTemplate.width,
			height = correspondingTemplate.height,
			lX = obj.x, rX = obj.x + width, bY = obj.y, uY = obj.y - height;

		if (rightActorX >= lX && lftActorX <= rX && y >= uY && y <= bY) {
			return true;
		}
	}

	return false;
};

_p.checkEnemiesCollision = function() {
	let playerRect = {
		top: this.mapCoordY - FRAME_HEIGHT / 5, // the coordBodyY equivalent in map coords,
		left: this.mapCoordX - ACTUAL_ACTOR_WIDTH / 2,
		right: this.mapCoordX + ACTUAL_ACTOR_WIDTH / 2,
		bottom: this.mapCoordY
	},
		collision = false;

	for (let enemy of ENEMIES) {
		let enemyRect = {
			top: enemy.mapCoordY - FRAME_HEIGHT / 5,
			left: enemy.mapCoordX - ACTUAL_ACTOR_WIDTH / 2,
			right: enemy.mapCoordX + ACTUAL_ACTOR_WIDTH / 2,
			bottom: enemy.mapCoordY
		};

		// the actors collide
		if (rectIntersection(playerRect, enemyRect)) {
			collision = true;
			this.bleed(this.collisionDamage);
			enemy.bleed(this.collisionDamage, this.direction);
		}
	}

	return collision;
};

_p.resetXCoordsToCenter = function() {
    this.coordX = Math.floor(this.canvas.width / 2);
};

_p.resetYCoordsToCenter = function() {
    this.coordY = Math.floor(this.canvas.height / 2);
    this.coordBodyY = this.coordY - FRAME_HEIGHT / 5;
};

// shouldCheckCollision is a flag used for performance reasons when we are sure there will be no collision
_p.moveUp = function(speed, shouldCheckCollision = true) {
	for(let i = speed; i >= 0; i--) {
        if (!shouldCheckCollision || !this.checkCollision(0, -i, this.coordBodyY, this.coordX)) { // if no collision
            // player movement
            if (this.mapRenderer.currentMapInstance.mapY === 0) { // canvas is at the top of the whole map
				this.coordBodyY = Math.max(this.coordBodyY - i, 4 * FRAME_HEIGHT / 5); // move only the player until it hits upper bound
				this.coordY = Math.max(this.coordY - i, FRAME_HEIGHT);
            }
            else {
                if (this.coordBodyY - i >= this.canvas.height / 2) { // player not centered on y-axis
                    this.coordBodyY -= i;
                    this.coordY -= i;
                }
                else {
                    this.resetYCoordsToCenter();
                    this.mapRenderer.moveMap(0, i);
                }   
            }
			
			this.updateMapCoords();
            return;
        }
    }
};

_p.moveDown = function(speed, shouldCheckCollision = true) {
	for(let i = speed; i >= 0; i--) {
        if(!shouldCheckCollision || !this.checkCollision(0, i)) { // if no collision
			// player movement
            let mapInstance = this.mapRenderer.currentMapInstance;
	        let lowerBound = this.canvas.height - mapInstance.mapHeight * mapInstance.tileSize; // pseudo bound
            if(mapInstance.mapY === lowerBound) { // if canvas at pseudo lower bound aka bottom of canvas is at bottom of whole map
				this.coordY = Math.min(this.coordY + i, this.canvas.height);// move player until it hits lower bound
				this.coordBodyY = Math.min(this.coordBodyY + i, this.canvas.height - FRAME_HEIGHT / 5);
            }
            else {
                if(this.coordY + i <= this.canvas.height / 2) { // player not centered on y-axis
                    this.coordY += i;
                    this.coordBodyY += i;
                }
                else {
                    this.resetYCoordsToCenter();
                    this.mapRenderer.moveMap(0, -i); 
                }    
            }
			
			this.updateMapCoords();
            return;
        }
    }
};

_p.moveLeft = function(speed, shouldCheckCollision = true) {
	for(let i = speed; i >= 0; i--) {
        if(!shouldCheckCollision || !this.checkCollision(-i, 0, this.coordY, this.coordX)) { // if no collision
            // player movement
            if(this.mapRenderer.currentMapInstance.mapX === 0) { // canvas is at the left of the whole map
                this.coordX = Math.max(this.coordX - i, FRAME_WIDTH / 2); // move only player until hits left bound
            }
            else {
                if(this.coordX - i >= this.canvas.width / 2) // player not centered on x-axis
                    this.coordX -= i;
                else {
                    this.resetXCoordsToCenter();
                    this.mapRenderer.moveMap(i, 0);
                }      
            }
			
			this.updateMapCoords();
            return;
		}
		
    }
};

_p.moveRight = function(speed, shouldCheckCollision = true) {
	for(let i = speed; i >= 0; i--) {
        if (!shouldCheckCollision || !this.checkCollision(i, 0, this.coordY, this.coordX)) { // if no collision
            // player movement
            let mapInstance = this.mapRenderer.currentMapInstance;
            let rightBound = this.canvas.width - mapInstance.mapWidth * mapInstance.tileSize; // pseudo bound
			
            if(mapInstance.mapX === rightBound) {// if canvas at pseudo right bound aka right bound of canvas is at right bound of whole map
				this.coordX = Math.min(this.coordX + i, this.canvas.width - FRAME_WIDTH / 2);// move player until hits right bound
            }
            else {
                if(this.coordX + i <= this.canvas.width / 2) // player not centered on x-axis
                    this.coordX += i;
                else {
                    this.resetXCoordsToCenter();
                    this.mapRenderer.moveMap(-i, 0);                
                }
            }
		}
			
		this.updateMapCoords();
        return;
    }
};

/*
	Just showing a DOM div a.k.a. a box with a text so the player knows to press "E" to interact
 */
_p.showInteractionMessage = function(text) {
	if (!this.interactionBox) {
		this.interactionBox = document.createElement("DIV");
		this.interactionBox.id = "interaction-box";
	}
	let timeFromLastShown = 0;

	if (this.interactionBoxShownTimer === undefined) {
		this.interactionBoxShownTimer = new Timer();
		timeFromLastShown = Player.INTERACTION_BOX_TIME;
	}
	else {
		timeFromLastShown = this.interactionBoxShownTimer.getDeltaTime();
		this.interactionBoxShownTimer.resetTimeNow();
	}

	if (timeFromLastShown < Player.INTERACTION_BOX_TIME ) {
		return;
	}

	this.interactionBoxShownTimer.lastUpdatedNow();

	if (!this.interactionInterval || text !== this.interactionBox.getElementsByTagName("P")[0].innerText) {
		let p = document.createElement("P");
		p.innerText = text;

		this.interactionBox.innerHTML = "";
		this.interactionBox.appendChild(p);
		this.interactionBox.style.opacity = "1";

		document.body.appendChild(this.interactionBox);

		this.interactionInterval = setInterval(function(self) {
			let currOpacity = String(parseFloat(self.interactionBox.style.opacity) - 0.1);

			//console.log(currOpacity)
			if (currOpacity > 0) {
				self.interactionBox.style.opacity = currOpacity;
			}
			else {
				clearInterval(self.interactionInterval);
				self.interactionInterval = null;

				document.body.removeChild(self.interactionBox);
			}
		}, 200, this);
	}
	else {
		this.interactionBox.opacity = 1;
	}
};

// if an interactionPointName is passed then only the handler for that interaction will be unsubscribed
// if no arguments are provided then all handlers are removed
_p.removeInteractionHandlers = function(interactionPointName) {
	if (interactionPointName) {
		window.removeEventListener("keydown", this.interactionHandlers[interactionPointName]);
		delete this.interactionHandlers[interactionPointName];
		return;
	}
	
	for (let pointName in this.interactionHandlers) {
		window.removeEventListener("keydown", this.interactionHandlers[pointName]);
		delete this.interactionHandlers[pointName];
	}
};

_p.checkEnemySpawnPointsProximity = function() {
	let spawnPoints = this.mapRenderer.getEnemySpawnPoints(),
		inProximityOfSpawnPoint = false;

	for (let point of spawnPoints) {
		let euclDist = euclideanDistance(point, {x: this.mapCoordX, y: this.mapCoordY}),
			uniqueKey = point.name + point.type,
			// if it has an interval property set use that time, else use the default spawn interval
			spawnInterval = point[MapInstance.ENEMY_SPAWN_INTERVAL]? point[MapInstance.ENEMY_SPAWN_INTERVAL] : Player.DEFAULT_ENEMYSPAWN_INTERVAL;

		// if no max spawned enemies specified then default is considered
		point[MapInstance.ENEMY_MAX_SPAWN] = point[MapInstance.ENEMY_MAX_SPAWN]? point[MapInstance.ENEMY_MAX_SPAWN] : Player.MAX_SPAWNED_ENEMIES;

		if (euclDist <= Player.ENEMYSPAWN_POINT_PROXIMITY
			&& this.mapRenderer.checkTwoPointsInSameRoom({x: this.mapCoordX, y: this.mapCoordY}, point)) {

			if (!this.spawnIntervals[uniqueKey]) {
				// call spawnEnemy regularly passing this spawn point along
				this.spawnIntervals[uniqueKey] = setInterval(ActorFactory().spawnEnemy, spawnInterval, point);
			}

			inProximityOfSpawnPoint = true;
		}
		else {

			// stop spawning for this spawn point
			if (this.spawnIntervals[uniqueKey]) {
				clearInterval(this.spawnIntervals[uniqueKey]);
				this.spawnIntervals[uniqueKey] = null;
			}
		}
	}

	if (this.healthBar.hidden && inProximityOfSpawnPoint) {
		this.healthBar.show();
	}
	if (!this.healthBar.hidden && !inProximityOfSpawnPoint) {
		this.healthBar.hide();
	}
};

_p.checkInteractionPointsProximity = function() {
	this.checkEnemySpawnPointsProximity();

	// for every point check if the player is close to it
	for (let point of this.visibleInteractionPoints) {
		let euclDist = euclideanDistance(point, {x: this.mapCoordX, y: this.mapCoordY});
		
		// concatenating point type and name to get a unique key in the handlers dictionary
		let uniqueKeyName = point.type + point.name;

		// if we are close to the interactionPoint we start listening for keydown
		if (euclDist <= Player.INTERACTION_POINT_PROXIMITY) {
			if (!("interact" in point)) {
				this.showInteractionMessage("PRESS E TO INTERACT");
			}

			if (this.interactionHandlers[uniqueKeyName]) {
				// handler already registered
				continue;
			}

			// we have different handlers depending on the type of the point
			let boundHandler;

			// this type of interaction is one that changes the map
			if (point.type === MapInstance.SPAWN_POINT) {
				boundHandler = this.interactWithMapTransitionPoint.bind(this, point.name);
			}
			else if (point.type === MapInstance.CHANGE_ROOM_POINT) {
				boundHandler = this.interactWithRoomTransitionPoint.bind(this, point);
			}
			else if (point.type === "npc") {
				boundHandler = this.interactWithNpcs.bind(this, point);
			}

			// registering a handler for the current interaction point
			// concatenating point type and name to get a unique key in the handlers dictionary
			this.interactionHandlers[uniqueKeyName] = boundHandler;
			window.addEventListener("keydown", this.interactionHandlers[uniqueKeyName]);
		}
		else {
			// unregistering the handler when we get further away from the point
			this.removeInteractionHandlers(uniqueKeyName);
		}
	}
};

_p.interactWithNpcs = function(point, e) {
	if (e.key.toLowerCase() === Player.INTERACTION_KEY) {
		StoryParser.getReference(new DialogueBox()).getQuest(point.npcId);
	}
};

/*
	handler for one type of interaction: the interaction with a map transition point
	it receives the mapName it should transition to and changes the map
 */
_p.interactWithMapTransitionPoint = function(mapName, e) {
	if (e.key.toLowerCase() === Player.INTERACTION_KEY) {
		this.mapRenderer.changeMap(mapName);
	}
};

_p.interactWithRoomTransitionPoint = function(point, e) {
	if (e.key.toLowerCase() !== Player.INTERACTION_KEY) {
		return;
	}

	// get all the other changeRoom points
	let allChangePoints = this.mapRenderer.getRoomChangingPoints();

	for (let otherPoint of allChangePoints) {
		// found the point that this point teleports the player to
		if (otherPoint.from === point.to) {
			this.movePlayerToMapCoords(otherPoint.x, otherPoint.y);
			return;
		}
	}
};

_p.onMovement = function() {
	this.walking = true;
	this.row = Actor.WALK_ROW + this.direction;

	this.updateMovementAnimation();
	this.checkInteractionPointsProximity();
	this.checkCurrentRoom();
};

_p.keyUp = function(e, speed = this.speed) {
	if (!this.attacking && !this.died) { // if player is attacking, can't move
		this.direction = Actor.UPWARD_DIRECTION;

        this.moveUp(speed);
        this.onMovement();
    }
};

_p.keyDown = function(e, speed = this.speed) {
    if (!this.attacking && !this.died) {
		this.direction = Actor.DOWNWARD_DIRECTION;

        this.moveDown(speed);
        this.onMovement();
    }
};

_p.keyLeft = function(e, speed = this.speed) {
    if (!this.attacking && !this.died) {
		this.direction = Actor.LEFT_DIRECTION;

        this.moveLeft(speed);
        this.onMovement();
    }
};

_p.keyRight = function(e, speed = this.speed) {
	if (!this.attacking && !this.died) {
		this.direction = Actor.RIGHT_DIRECTION;

        this.moveRight(speed);
        this.onMovement();
    }
};

_p.keyUpRight = function(e) {
    this.keyUp(e, Math.round(this.speed * 0.7));
    this.keyRight(e, Math.round(this.speed * 0.7));
};

_p.keyUpLeft = function(e) {
    this.keyUp(e, Math.round(this.speed * 0.7));
    this.keyLeft(e, Math.round(this.speed * 0.7));
};

_p.keyDownRight = function(e) {
    this.keyDown(e, Math.round(this.speed * 0.7));
    this.keyRight(e, Math.round(this.speed * 0.7));
};

_p.keyDownLeft = function(e) {
    this.keyDown(e, Math.round(this.speed * 0.7));
    this.keyLeft(e, Math.round(this.speed * 0.7));
};

/* when all keys have been released we have to stop all the moving */
_p.keyRelease = function() {
	this.stopWalking();
};
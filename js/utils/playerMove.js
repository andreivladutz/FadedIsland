const FRAME_WIDTH = 64, FRAME_HEIGHT = 64,
	  ACTUAL_PLAYER_WIDTH = 32,
      FRAME_ROW = 8, FRAME_COLUMN_MAX = 9;

var interval, counter = 0;


var RESOURCES = [
    {
        name: "Player",
        itemType: "img",
        url: "./img/player/sprite.png"
    },
    {
        name: "Attack",
        itemType: "img",
        url: "./img/player/spriteAttack.png"
    },
    {
        name: "BodyArmour",
        itemType: "img",
        url: "./img/armour/chest_male.png"
    },
    {
        name: "FeetArmour",
        itemType: "img",
        url: "./img/armour/golden_boots_male.png"
    },
    {
        name: "ArmsArmour",
        itemType: "img",
        url: "./img/armour/arms_male.png"
    },
    {
        name: "HeadArmour",
        itemType: "img",
        url: "./img/armour/golden_helm_male.png"
    },
];


class Player extends EventEmiter {
    constructor(canvas, loadedPromisesArr) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        this.speed = 16;
        this.power = 20; // attack power
		
		// coords corespond to feet area
		this.coordX = canvas.width / 2;
		this.coordY = canvas.height / 2;
        this.coordBodyY = this.coordY - FRAME_HEIGHT / 5; // y coord for body, collision when going up
        
        // loading player sprite
        this.resLoader = new ResourceLoader();
        this.resLoader.add(RESOURCES);
        
        // column, row for specific frame in sprite
        // expected order for frames top-down: up/0, left/1, down/2, right/3
        // default for down movement frame
        this.row = FRAME_ROW + 2;
        this.column = 0;

		
		// we keep the global promises array so we can use it in waitOn utility 
		this.globalPromisesArr = loadedPromisesArr;
		
		
		this.waitOn("Attack", "sprite");
		this.waitOn("BodyArmour");
		this.waitOn("FeetArmour");
		this.waitOn("ArmsArmour");
		this.waitOn("HeadArmour");

        
        this.resLoader.load();
        
        // add listeners for movement
        this.dict = {
            "up": "w", 
            "down": "s",
            "left": "a",
            "right": "d",
            "attack": "k"
        }
        this.keyEvents = new KeyEventEmitter(this.dict);
        this.keyEvents.addEventListener("keyrelease", this.keyRelease.bind(this));
        this.keyEvents.addEventListener("attack", this.attack.bind(this));
    }
}

_p = Player.prototype;

// small utility to transform a name like FooName to fooName
function getLowerCaseName(name) {
	return name.charAt(0).toLowerCase() + name.substr(1);
}

/*
	this utility promisifies a listener for a resource with resourceName,
	pushes it to the global waiting array of promises and resolves when loading
	has finished, adding the image object on this object under the name of propertyName
	
	by default the resourceName passed should be PascalCase and the property will be
	the camelCase version of the resourceName. you can also specify a different propertyName
*/
_p.waitOn = function(resourceName, propertyName = getLowerCaseName(resourceName)) {
	var self = this;
	
	function loadedResource(resolveFunc, rejectFunc) {
		self.resLoader.on("loaded" + resourceName, function(e) {
			// the image is also passed as an event so we don't 
			// need to call the get method on resLoader 
			self[propertyName] = e.detail;
			
			resolveFunc();
		});
		
		// the global promises array will reject with this error
		self.resLoader.on("error" + resourceName, function(err) {
			rejectFunc(err);
		});
	}
	
	this.globalPromisesArr.push(promisify(loadedResource));
}

_p.drawSpriteFrame = function(image) {
	var drawCoordX = Math.floor(this.coordX - FRAME_WIDTH / 2),
		drawCoordY = Math.floor(this.coordY - FRAME_HEIGHT);
	
	this.ctx.drawImage(image, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       drawCoordX, drawCoordY, FRAME_WIDTH, FRAME_HEIGHT);
}

_p.draw = function() {
    // draw player
	this.drawSpriteFrame(this.sprite);
	
    // draw armour
	this.drawSpriteFrame(this.bodyArmour);
	this.drawSpriteFrame(this.feetArmour);
	this.drawSpriteFrame(this.armsArmour);
	this.drawSpriteFrame(this.headArmour);

	/*
		some code that shows the collision area of the player
	
	var leftTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: this.coordX - ACTUAL_PLAYER_WIDTH / 2,
																	y: this.coordY}),
		rightTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: this.coordX + ACTUAL_PLAYER_WIDTH / 2,
																	 y: this.coordY});
	
	for (let tileX = leftTileCoords.x; tileX <= rightTileCoords.x; tileX++) {
		var screen = this.mapRenderer.tileCoordsToScreenCoords({x:tileX, y:0});
		this.ctx.fillRect(screen.x, this.coordY, 32, 32);
	}
	*/
}

_p.setMapRenderer = function(mapRenderer) {
    this.mapRenderer = mapRenderer;
}

// function to check if future tile to be walking on is obstacle or not
_p.checkCollision = function(x, y, cY = this.coordY, cX = this.coordX) { // x,y distance to be added | cX, cY coords to be added to
	/*
		player's feet make a segment and that segment can cross multiple tiles at once so we have
		to check the collision with all the crossed tiles at that moment
	*/
    var tileSize = this.mapRenderer.currentMapInstance.tileSize,
		leftTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x - ACTUAL_PLAYER_WIDTH / 2,
																	y: cY + y}),
		rightTileCoords = this.mapRenderer.screenCoordsToTileCoords({x: cX + x + ACTUAL_PLAYER_WIDTH / 2,
																	 y: cY + y}),
		matrixCols = this.mapRenderer.currentMapInstance.collisionMatrix[0].length,
		matrixRows = this.mapRenderer.currentMapInstance.collisionMatrix.length;
	
	// make sure tile coords aren't out of bounds
	if (leftTileCoords.x < 0 || rightTileCoords.x >= matrixCols || rightTileCoords.y >= matrixRows) {
		return true;
	}
	
	// check all the crossed tiles
	for (let tileX = leftTileCoords.x; tileX <= rightTileCoords.x; tileX++) {
		// the y is the same for all crossed tiles
		if (this.mapRenderer.currentMapInstance.collisionMatrix[leftTileCoords.y][tileX]) {
			//debugger;
			return true;
		}
	}
	// no collision with any tile was found
	return false;
}

_p.resetXCoordsToCenter = function() {
    this.coordX = Math.floor(this.canvas.width / 2);
}

_p.resetYCoordsToCenter = function() {
    this.coordY = Math.floor(this.canvas.height / 2);
}

_p.keyUp = function(e, speed = this.speed) {
    for(var i = 0; i < speed; i++) {
        if (!this.checkCollision(0, -1, this.coordBodyY)) { // if no collision
            // player movement
            if (this.mapRenderer.currentMapInstance.mapY == 0) { // canvas is at the top of the whole map
                if (this.coordY - 1 - FRAME_HEIGHT <= 0) // move only the player until it hits upper bound
                    this.coordY = 0 + FRAME_HEIGHT;
                else
                    this.coordY -= 1;
            }
            else {
                if (this.coordY - 1 >= this.canvas.height / 2) // player not centered on y-axis
                    this.coordY -= 1;
                else {
                    this.resetYCoordsToCenter();
                    this.mapRenderer.moveMap(0, 1);
                }   
            }
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 0;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyDown = function(e, speed = this.speed) {
    for(var i = 0; i < speed; i++) {
        if(!this.checkCollision(0, 1)) { // if no collision
            // player movement
            var mapInstance = this.mapRenderer.currentMapInstance;
            var lowerBound = this.canvas.height - mapInstance.mapHeight * mapInstance.tileSize; // pseudo bound
            if(mapInstance.mapY == lowerBound) { // if canvas at pseudo lower bound aka bottom of canvas is at bottom of whole map
                if(this.coordY + 1 >= this.canvas.height) // move player until it hits lower bound
                    this.coordY = this.canvas.height;
                else
                    this.coordY += 1;
            }
            else {
                if(this.coordY + 1 <= this.canvas.height / 2 ) // player not centered on y-axis
                    this.coordY += 1;
                else {
                    this.resetYCoordsToCenter();
                    this.mapRenderer.moveMap(0, -1); 
                }    
            }
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 2;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyLeft = function(e, speed = this.speed) {
    for(var i = 0; i < speed; i++) {
        if(!this.checkCollision(-1, 0, this.coordBodyY)) { // if no collision
            // player movement
            if(this.mapRenderer.currentMapInstance.mapX == 0) { // canvas is at the left of the whole map
                if(this.coordX - 1 - FRAME_WIDTH / 2 <= 0) // move only player until hits left bound
                    this.coordX = 0 + FRAME_WIDTH / 2;
                else
                    this.coordX -= 1;
            }
            else {
                if(this.coordX - 1 >= this.canvas.width / 2) // player not centered on x-axis
                    this.coordX -= 1;
                else {
                    this.resetXCoordsToCenter();
                    this.mapRenderer.moveMap(1, 0);
                }      
            }
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 1;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyRight = function(e, speed = this.speed) {
    for(var i = 0; i < speed; i++) {
        if (!this.checkCollision(1, 0, this.coordBodyY)) { // if no collision
            // player movement
            var mapInstance = this.mapRenderer.currentMapInstance;
            var rightBound = this.canvas.width - mapInstance.mapWidth * mapInstance.tileSize; // pseudo bound

            if(mapInstance.mapX == rightBound) {// if canvas at pseudo right bound aka right bound of canvas is at right bound of whole map
                if(this.coordX + 1 + FRAME_WIDTH / 2 >= this.canvas.width) // move player until hits right bound
                    this.coordX = this.canvas.width - FRAME_WIDTH / 2;
                else
                    this.coordX += 1;
            }
            else {
                if(this.coordX + 1 <= this.canvas.width / 2) // player not centered on x-axis
                    this.coordX += 1;
                else {
                    this.resetXCoordsToCenter();
                    this.mapRenderer.moveMap(-1, 0);                
                }
            }
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 3;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyUpRight = function(e) {
    this.keyUp(e, Math.floor(this.speed / 2));
    this.keyRight(e, Math.floor(this.speed / 2));
}

_p.keyUpLeft = function(e) {
    this.keyUp(e, Math.floor(this.speed / 2));
    this.keyLeft(e, Math.floor(this.speed / 2));
}

_p.keyDownRight = function(e) {
    this.keyDown(e, Math.floor(this.speed / 2));
    this.keyRight(e, Math.floor(this.speed / 2));
}

_p.keyDownLeft = function(e) {
    this.keyDown(e, Math.floor(this.speed / 2));
    this.keyLeft(e, Math.floor(this.speed / 2));
}

_p.keyRelease = function() {
    this.column = 0;
}

_p.attack = function() {
    this.row = 13;
    
    for(var i = 0; i < 6; i++) {
        setTimeout(this.animatE, 1000);
    }
}

_p.animatE = function() {
    this.column = (this.column + 1) % 6;
    this.draw();
}





























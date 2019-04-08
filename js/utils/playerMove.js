const FRAME_WIDTH = 64, FRAME_HEIGHT = 64, 
      FRAME_ROW = 8, FRAME_COLUMN_MAX = 9;

var RESOURCES = [
  {
    name: "Player",
    itemType: "img",
    url: "/img/player/sprite.png"
  },
];


class Player extends EventEmiter {
    constructor(canvas, loadedPromisesArr) {
        super();
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.speed = 32;
        
        // loading player sprite
        this.resLoader = new ResourceLoader();
        this.resLoader.add(RESOURCES);
        
        // column, row for specific frame in sprite
        // expected order for frames top-down: up/0, left/1, down/2, right/3
        // default for down movement frame
        this.row = FRAME_ROW + 2;
        this.column = 0;
        
        var self = this;
        
        function loadedPlayer(resolve, reject) {
            self.resLoader.on("loadedPlayer", function() {
                self.sprite = self.resLoader.get("Player");
                
                // coords corespond to feet area
                self.coordX = canvas.width / 2;
                self.coordY = canvas.height / 2 - 16;
                resolve();
            });
        }
        // push loading function to semaphore
        loadedPromisesArr.push(promisify(loadedPlayer));

        this.resLoader.load();
        
        // add listeners for movement
        this.dict = {
            "up": "w", 
            "down": "s",
            "left": "a",
            "right": "d"
        }
        this.keyEvents = new KeyEventEmitter(this.dict);
        this.keyEvents.addEventListener("up", this.keyUp.bind(this));
        this.keyEvents.addEventListener("down", this.keyDown.bind(this));
        this.keyEvents.addEventListener("left", this.keyLeft.bind(this));
        this.keyEvents.addEventListener("right", this.keyRight.bind(this));
        this.keyEvents.addEventListener("keyrelease", this.keyRelease.bind(this));
               
    }
}


_p = Player.prototype;

_p.draw = function() {
    this.ctx.drawImage(this.sprite, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       this.coordX - FRAME_WIDTH / 2, this.coordY - FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
	
	this.ctx.fillStyle = "red";
	this.ctx.fillRect(this.coordX, this.coordY, 2, 2);
}

_p.setMapRenderer = function(mapRenderer) {
    this.mapRenderer = mapRenderer;
}

// function to check if future tile to be walking on is obstacle or not
_p.checkCollision = function(x, y) { // x,y distance to be added
    var tileCoords = this.mapRenderer.screenCoordsToTileCoords({x: this.coordX + x, y: this.coordY + y}),
		matrixCols = this.mapRenderer.currentMapInstance.collisionMatrix[0].length,
		matrixRows = this.mapRenderer.currentMapInstance.collisionMatrix.length;
	
	// make sure tile coords aren't out of bounds
	if (tileCoords.x >= matrixCols || tileCoords.y >= matrixRows) {
		return false;
	}
	
    // return value from collisionMatrix in MapInstance
    return this.mapRenderer.currentMapInstance.collisionMatrix[tileCoords.y][tileCoords.x];
}

_p.resetXCoordsToCenter = function() {
    this.coordX = this.canvas.width / 2;
}

_p.resetYCoordsToCenter = function() {
    this.coordY = this.canvas.height / 2 - 16;
}

_p.keyUp = function() {
    
    if(!this.checkCollision(0, -this.speed)) { // if no collision
        // player movement
        if(this.mapRenderer.currentMapInstance.mapY == 0) { // canvas is at the top of the whole map
            if(this.coordY - this.speed - FRAME_HEIGHT <= 0) // move only the player until it hits upper bound
                this.coordY = 0 + FRAME_HEIGHT;
            else
                this.coordY -= this.speed;
        }
        else {
            if(this.coordY - this.speed >= this.canvas.height / 2) // player not centered on y-axis
                this.coordY -= this.speed;
            else {
                this.resetYCoordsToCenter();
                this.mapRenderer.moveMap(0, this.speed);
            }   
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 0;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyDown = function() {
    
    if(!this.checkCollision(0, this.speed)) { // if no collision
        // player movement
        var mapInstance = this.mapRenderer.currentMapInstance;
        var lowerBound = this.canvas.height - mapInstance.mapHeight * mapInstance.tileSize; // pseudo bound
        if(mapInstance.mapY == lowerBound) { // if canvas at pseudo lower bound aka bottom of canvas is at bottom of whole map
            if(this.coordY + this.speed >= this.canvas.height) // move player until it hits lower bound
                this.coordY = this.canvas.height;
            else
                this.coordY += this.speed;
        }
        else {
            if(this.coordY + this.speed <= this.canvas.height / 2) // player not centered on y-axis
                this.coordY += this.speed;
            else {
                this.resetYCoordsToCenter();
                this.mapRenderer.moveMap(0, -this.speed); 
            }    
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 2;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyLeft = function() {
    
    if(!this.checkCollision(-this.speed, 0)) { // if no collision
        // player movement
        if(this.mapRenderer.currentMapInstance.mapX == 0) { // canvas is at the left of the whole map
            if(this.coordX - this.speed - FRAME_WIDTH / 2 <= 0) // move only player until hits left bound
                this.coordX = 0 + FRAME_WIDTH / 2;
            else
                this.coordX -= this.speed;
        }
        else {
            if(this.coordX - this.speed >= this.canvas.width / 2) // player not centered on x-axis
                this.coordX -= this.speed;
            else {
                this.resetXCoordsToCenter();
                this.mapRenderer.moveMap(this.speed, 0);
            }      
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 1;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyRight = function() {
    
    if(!this.checkCollision(this.speed, 0)) { // if no collision
        // player movement
        var mapInstance = this.mapRenderer.currentMapInstance;
        var rightBound = this.canvas.width - mapInstance.mapWidth * mapInstance.tileSize; // pseudo bound

        if(mapInstance.mapX == rightBound) {// if canvas at pseudo right bound aka right bound of canvas is at right bound of whole map
            if(this.coordX + this.speed + FRAME_WIDTH / 2 >= this.canvas.width) // move player until hits right bound
                this.coordX = this.canvas.width - FRAME_WIDTH / 2;
            else
                this.coordX += this.speed;
        }
        else {
            if(this.coordX + this.speed <= this.canvas.width / 2) // player not centered on x-axis
                this.coordX += this.speed;
            else {
                this.resetXCoordsToCenter();
                this.mapRenderer.moveMap(-this.speed, 0);                
            }
        }
    }
    
    // sprite animation
    this.row = FRAME_ROW + 3;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyRelease = function() {
    this.column = 0;
}
































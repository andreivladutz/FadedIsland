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
        this.speed = 10;
        
        // loading player sprite
        this.resLoader = new ResourceLoader();
        this.resLoader.add(RESOURCES);

        // last movement direction
        this.lastDirection = "down";
        
        // column, row for specific frame in sprite
        // default for down movement frame
        this.row = FRAME_ROW + 2;
        this.column = 0;
        
        var self = this;
        
        function loadedPlayer(resolve, reject) {
            self.resLoader.on("loadedPlayer", function() {
                self.sprite = self.resLoader.get("Player");
                
                // coords corespond to feet area
                self.coordX = canvas.width / 2;
                self.coordY = canvas.height / 2;
                resolve();
            });
        }
        // push loading function to semaphore
        loadedPromisesArr.push(promisify(loadedPlayer));
<<<<<<< HEAD

=======
        
        // load armour
        function loadedBodyArmour(resolve, reject) {
            self.resLoader.on("loadedBodyArmour", function() {
                self.bodyArmour = self.resLoader.get("BodyArmour");
            });
        }
        
        function loadedFeetArmour(resolve, reject) {
            self.resLoader.on("loadedFeetArmour", function() {
                self.feetArmour = self.resLoader.get("FeetArmour");
            });
        }
        
        function loadedArmsArmour(resolve, reject) {
            self.resLoader.on("loadedArmsArmour", function() {
                self.armsArmour = self.resLoader.get("ArmsArmour");
            });
        }
        
        function loadedHeadArmour(resolve, reject) {
            self.resLoader.on("loadedHeadArmour", function() {
                self.headArmour = self.resLoader.get("HeadArmour");
            });
        }
        
        loadedPromisesArr.push(promisify(loadedBodyArmour));
        loadedPromisesArr.push(promisify(loadedFeetArmour));
        loadedPromisesArr.push(promisify(loadedArmsArmour));
        loadedPromisesArr.push(promisify(loadedHeadArmour));
        
>>>>>>> parent of 2a6e71c... Solved bug
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
        
               
    }
}


_p = Player.prototype;

_p.draw = function() {
    this.ctx.drawImage(this.sprite, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       this.coordX - FRAME_WIDTH / 2, this.coordY - FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
<<<<<<< HEAD
=======
    // draw armour
    this.ctx.drawImage(this.bodyArmour, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       this.coordX - FRAME_WIDTH / 2, this.coordY - FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
    
    this.ctx.drawImage(this.feetArmour, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       this.coordX - FRAME_WIDTH / 2, this.coordY - FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
    
    this.ctx.drawImage(this.armsArmour, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       this.coordX - FRAME_WIDTH / 2, this.coordY - FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
    
    this.ctx.drawImage(this.headArmour, this.column * FRAME_WIDTH, this.row * FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT, 
                       this.coordX - FRAME_WIDTH / 2, this.coordY - FRAME_HEIGHT, FRAME_WIDTH, FRAME_HEIGHT);
	
	this.ctx.fillStyle = "red";
	this.ctx.fillRect(this.coordX, this.coordY, 10, 10);
>>>>>>> parent of 2a6e71c... Solved bug
}

_p.setMapRenderer = function(mapRenderer) {
    this.mapRenderer = mapRenderer;
}

_p.keyUp = function() {
    this.lastDirection = "up";
    
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
        else
            this.mapRenderer.moveMap(0, this.speed);
    }
    
    // sprite animation
    this.row = FRAME_ROW + 0;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyDown = function() {
    this.lastDirection = "down";
    
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
        else
            this.mapRenderer.moveMap(0, -this.speed); 
    }
    
    // sprite animation
    this.row = FRAME_ROW + 2;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyLeft = function() {
    this.lastDirection = "left";
    
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
        else
            this.mapRenderer.moveMap(this.speed, 0);            
    }
    
    // sprite animation
    this.row = FRAME_ROW + 1;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}

_p.keyRight = function() {
    this.lastDirection = "right";
    
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
        else
            this.mapRenderer.moveMap(-this.speed, 0);

    }
    
    // sprite animation
    this.row = FRAME_ROW + 3;
    this.column = (this.column + 1) % FRAME_COLUMN_MAX;
}


































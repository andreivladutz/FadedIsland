class KeyEventEmitter extends EventEmiter {
    constructor(dict) {
        super();
        this.dict = dict;
        this.map = {}
        document.addEventListener("keydown", this.handleKeypress.bind(this));
        document.addEventListener("keyup", this.handleKeyup.bind(this));
    }
}

_p = KeyEventEmitter.prototype;

_p.moveUp = function(e) {
    this.emit("up", null);
}

_p.moveRight = function(e) {
    this.emit("right", null);
}

_p.moveDown = function(e) {
    this.emit("down", null);
}

_p.moveLeft = function(e) {
    this.emit("left", null);
}

_p.moveUpRight = function(e) {
    this.emit("upright", null);
}

_p.moveUpLeft = function(e) {
    this.emit("upleft", null);
}

_p.moveDownRight = function(e) {
    this.emit("downright", null);
}

_p.moveDownLeft = function(e) {
    this.emit("downleft", null);
}


_p.attack = function() {
    this.emit("attack", null);
}

_p.testKeys = function() {
    var keylist = arguments;
    for(var i = 0; i < keylist.length; i++) {
        if(!this.map[keylist[i]])
            return false;
    }
    return true;
}

_p.handleKeypress = function(e) {    
    this.map[e.key] = true; // remember current key as pressed
    
    if(this.testKeys(this.dict["up"], this.dict["right"]))
        this.moveUpRight(e);
    else
        if(this.testKeys(this.dict["up"], this.dict["left"]))
            this.moveUpLeft(e);
    else
        if(this.testKeys(this.dict["down"], this.dict["right"]))
            this.moveDownRight(e);
    else
        if(this.testKeys(this.dict["down"], this.dict["left"]))
            this.moveDownLeft(e);
    else
        if(this.testKeys(this.dict["up"]))
            this.moveUp(e);
    else
        if(this.testKeys(this.dict["down"]))
            this.moveDown(e);
    else
        if(this.testKeys(this.dict["right"]))
            this.moveRight(e);
    else
        if(this.testKeys(this.dict["left"]))
            this.moveLeft(e);
        
}

_p.handleKeyup = function(e) {
    if(e.key == this.dict["up"] || e.key == this.dict["down"] || e.key == this.dict["right"] || e.key == this.dict["left"])
        this.emit("keyrelease");
    this.map[e.key] = false; // release memory of key
}


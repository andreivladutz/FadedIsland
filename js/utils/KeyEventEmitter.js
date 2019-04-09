class KeyEventEmitter extends EventEmiter {
    constructor(dict) {
        super();
        this.dict = dict;
        document.addEventListener("keydown", this.handleKeypress.bind(this));
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

_p.handleKeypress = function(e) {
    switch(e.key) {
        case this.dict["up"]:
            this.moveUp(e);
            break;
        case this.dict["right"]:
            this.moveRight(e);
            break;
        case this.dict["down"]:
            this.moveDown(e);
            break;
        case this.dict["left"]:
            this.moveLeft(e);   
            break;
    }
}


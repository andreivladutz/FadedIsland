class MovementManager {
    constructor(playerObject) {

        if(MovementManager.selfReference !== null)
            return MovementManager.selfReference;

        MovementManager.selfReference = this;
        this.inputs = 0;
        this.longitudinalStack = [""];
        this.transversalStack = [""];
        this.__intervalReference = undefined;
        this.alreadyPressed = {
            w : 0,
            a : 0,
            s : 0,
            d : 0
        };

        this.getLSTop = function () {
            return this.longitudinalStack[this.longitudinalStack.length - 1];
        };
        this.getTSTop = function () {
            return this.transversalStack[this.transversalStack.length - 1];
        };

        this.applyInputs = function () {
            playerObject[MovementManager.selfReference.keyMap(MovementManager.selfReference.getLSTop()
                + MovementManager.selfReference.getTSTop())]();
        };
        this.keyMap = function (key) {
            if (key === "w")
                return "keyUp";
            if (key === "s")
                return "keyDown";
            if (key === "a")
                return "keyLeft";
            if (key === "d")
                return "keyRight";
            if (key === "wa")
                return "keyUpLeft";
            if (key === "wd")
                return "keyUpRight";
            if (key === "sa")
                return "keyDownLeft";
            if (key === "sd")
                return "keyDownRight";
        };

        this.startInterval = function () {
            this.__intervalReference = setInterval(this.applyInputs, 50);
        };
        this.stopInterval = function () {
            clearInterval(this.__intervalReference);
        };

        this.addInput = function (key) {

            let startTrigger = 0;
            if (this.inputs === 0)
                startTrigger = 1;

            this.inputs++;

            if ("ws".includes(key))
                this.longitudinalStack.push(key);
            else
                this.transversalStack.push(key);

            if (startTrigger)
                this.startInterval();

        };
        this.removeInput = function (key) {

            if ("ws".includes(key)) {
                if (this.getLSTop() !== key)
                    this.longitudinalStack[1] = this.longitudinalStack[2];
                this.longitudinalStack.pop();
            }
            else {
                if (this.getTSTop() !== key)
                    this.transversalStack[1] = this.longitudinalStack[2];
                this.transversalStack.pop();
            }
            this.inputs--;
            if (this.inputs === 0)
                this.stopInterval();

        };
    };

}

MovementManager.selfReference = null;

window.addEventListener("keydown",function(e) {
    if("wasd".includes(e.key.toLowerCase()) && !MovementManager.selfReference.alreadyPressed[e.key.toLowerCase()]) {
        MovementManager.selfReference.alreadyPressed[e.key.toLowerCase()] = 1;
        MovementManager.selfReference.addInput(e.key.toLowerCase());
    }
});
window.addEventListener("keyup",function(e) {

    if("wasd".includes(e.key.toLowerCase())) {
        MovementManager.selfReference.alreadyPressed[e.key.toLowerCase()] = 0;
        MovementManager.selfReference.removeInput(e.key.toLowerCase());
    }
});

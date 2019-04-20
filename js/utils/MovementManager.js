class MovementManager {
    constructor(playerObject) {  //IT RECEIVES A PLAYER REFERENCE TO APPLY THE FUNCTIONS ON

        MovementManager.selfReference = this;  //IT SELF REFERENCES ITSELF FOR APPLYING EVENTS ON ITSELF
        this.inputs = 0;   //NUMBER OF KEYS PRESSED AT ONCE
        this.longitudinalStack = [""];    //STACK FOR "W" AND "S" KEYS
        this.transversalStack = [""];     //STACK FOR "A" AND "D" KEYS
        this.__intervalReference = undefined;   //REFERENCE FOR THE INTERVAL THAT PROCESSES THE INPUTS
        this.alreadyPressed = {    //TRIGGER FOR ALREADY PRESSED KEYS SO THAT KEYDOWN EVENT WON'T FIRE MULTIPLE TIMES ON SAME INPUT
            w : 0,
            a : 0,
            s : 0,
            d : 0
        };

        this.getLSTop = function () {   //RETURNS KEY ON TOP OF "WS" STACK
            return this.longitudinalStack[this.longitudinalStack.length - 1];
        };
        this.getTSTop = function () {   //RETURNS KEY ON TOP OF "AD" STACK
            return this.transversalStack[this.transversalStack.length - 1];
        };
		
        this.applyInputs = function () {  //THE MAIN FUNCTION THAT COMPUTES THE INPUTS AND DECIDES WHAT MOVEMENT FUNCTION TO APPLY
            playerObject[MovementManager.keyMap(MovementManager.selfReference.getLSTop()   //WE USE THE SUPPORT FUNCTION "KEYMAP" DEFINED AND EXPLAINED BELOW
                + MovementManager.selfReference.getTSTop())]();    //WE GIVE IT THE TOP OF EACH STACK AS ARGUMENT
        };                                                         //THE REASONING BEHIND IT IS: KEYMAP RETURNS A FUNCTION NAME BASED ON THE KEYSTRING IT RECEIVES
																   //SO WE ALWAYS GIVE IT THE LAST "WS" KEY PRESSED AND LAST "AD" KEY PRESSED, OR EMPTY STRING IF ONE OF THEM IS NOT PRESSED
        this.startInterval = function () { //INTERVAL THAT CALLS THE FUNCTION THAT APPLIES MOVEMENT FUNCTIONS BASED ON KEYS PRESSED, EACH X SECONDS, DEFAULT CASE IS 50
            this.__intervalReference = setInterval(this.applyInputs, 0);
        };
        this.stopInterval = function () {  //FUNCTION TO STOP THE INTERVAL
            clearInterval(this.__intervalReference);
		};

        this.addInput = function (key) {  //FUNCTION THAT MANAGES THE TWO STACKS, THIS VARIANT ADDS THE INPUT IN THE STACK WHEN IT'S CALLED, WE ARE SURE WE ARE GIVEN A VALID "WASD" KEY

            let startTrigger = 0;  //WE CHECK IF THIS IS THE FIRST KEY PRESSED
            if (this.inputs === 0) //IF IT IS...
                startTrigger = 1;  //WE ACTIVATE THE START-INTERVAL TRIGGER

            this.inputs++;  //SINCE WE PRESSED A KEY, WE INCREMENT THE INPUTS QUANTITY

            if ("ws".includes(key))  //WE CHECK IF IT'S A "WS" KEY
                this.longitudinalStack.push(key);
            else
                this.transversalStack.push(key); //IF NOT, IT'S A "AD" KEY, NO OTHER CHOICES SINCE WE MADE SURE WHEN WE CALLED ADDINPUT THAT THE KEY IS IN "WASD"

            if (startTrigger)  //WE USE THE START TRIGGER FROM ABOVE, IT'S ONLY TRUE WHEN INPUTS WENT FROM 0 TO 1 IN THIS FUNCTION
                this.startInterval();  //WHEN THE FIRST KEY IS PRESSED, WE START THE INTERVAL

        };
        this.removeInput = function (key) {  //FUNCTION THAT MANAGES THE TWO STACKS, THIS VARIANT REMOVES THE INPUT FROM THE STACK WHEN IT'S CALLED, WE ARE SURE WE ARE GIVEN A VALID "WASD" KEY

            this.inputs--;  //WE RELEASED A KEY SO INPUT DECREMENTS
            if (this.inputs === 0) { //IF IT WAS LAST KEY PRESSED THAT WAS RELEASED
                this.stopInterval(); //STOP THE INTERVAL
            }

            if ("ws".includes(key)) {
                if (this.getLSTop() !== key)  //IF IT'S NOT THE LAST KEY PRESSED...
                    this.longitudinalStack[1] = this.longitudinalStack[2]; //WE SHIFT THE LAST KEY PRESSED ON TOP OF THE KEY WE RELEASED
                this.longitudinalStack.pop();  //WE POP THE LAST ELEMENT OF THE STACK
            }
            else {   //SAME AS ABOVE BUT FOR THE OTHER STACK
                if (this.getTSTop() !== key)
                    this.transversalStack[1] = this.transversalStack[2];
                this.transversalStack.pop();
            }
        };
    };
	static keyMap(key) {  //THIS FUNCTION TAKES A STRING ARGUMENT THAT IS EITHER ONE KEY OR "WS" KEY + "AD" KEY AND RETURNS THE RESPECTIVE MOVEMENT FUNCTION IMPLEMENTED IN PLAYEROBJECT'S PROTOTYPE            if (key === "w")
            if(key === "w")
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
}

MovementManager.selfReference = null;  //WE INITIALISE THE SELF REFERENCE TO NULL AT THE BEGINNING SINCE IT'S NOT POINTING TO ANYTHING

window.addEventListener("keydown",function(e) { //THIS IS THE KEYDOWN EVENT LINKED TO WINDOW SINCE IT MOST RELIABLY FIRES FROM WINDOW OBJECT
    if("wasd".includes(e.key.toLowerCase()) && !MovementManager.selfReference.alreadyPressed[e.key.toLowerCase()]) { //WE MAKE SURE WE HAVE A VALID "WASD" KEY, CAPS INSENSITIVE
        MovementManager.selfReference.alreadyPressed[e.key.toLowerCase()] = 1; //WE MAKE SURE IT CAN'T FIRE MULTIPLE TIMES FOR THE SAME KEY
        MovementManager.selfReference.addInput(e.key.toLowerCase());  //WE CALL ADDINPUT FUNCTION TO HANDLE THE KEY WE JUST PRESSED
    }
});
window.addEventListener("keyup",function(e) { //SAME AS ABOVE, EXCEPT IT'S KEYUP INSTEAD OF KEYDOWN

    if("wasd".includes(e.key.toLowerCase())) { //CHECK TO SEE IF IT'S FIRED FROM A "WASD" KEY
        MovementManager.selfReference.alreadyPressed[e.key.toLowerCase()] = 0;  //REMOVE THE TRIGGER SINCE IT'S NOT PRESSED ANYMORE
        MovementManager.selfReference.removeInput(e.key.toLowerCase()); //CALL REMOVEINPUT FUNCTION TO HANDLE THE KEY WE JUST RELEASED
    }
});

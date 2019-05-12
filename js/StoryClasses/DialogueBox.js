function showSomeBoxes() {
    var dialogue = new DialogueBox();
    dialogue.setQuestion("I am king kong, conqueror of my species I am king kong, conqueror of my species I am king kong, conqueror of my species ");
    dialogue.setOptions([{
        text: "sunt un prost si ma cac in gura mea",
        type: 1
    }, {
        text: "si eu la fel, bossulik",
        type: 2
    }, {
        text: "caca maca part muie dragnea psd sug coiu tau",
        type: 3
    }]);
   dialogue.waitOnInput();
}


class MonologueBox extends EventEmiter {
    constructor() {
        super();
        this.box = document.createElement("div");
        this.box.id = "dialogue-box";
        this.box.classList.add("no-options");

        this.content = document.createElement("div");
        this.content.id = "question";
        
        this.options = document.createElement("ul");
        this.options.id = "option-list";
        this.options.classList = "no-option-list";

        this.box.appendChild(this.content);
        this.box.appendChild(this.options);
        while(!window.document){};
        document.body.appendChild(this.box);
    }
}

_m = MonologueBox.prototype;

_m.setQuestion = function (text) {
    if (this.content.hasChildNodes()) {
        this.content.replaceChild(document.createTextNode(text), this.content.firstChild);
    } else {
        this.content.appendChild(document.createTextNode(text));
    }
}

_m.setOptions = function () {
    //removing old options, if there were any
    if (this.options.hasChildNodes()) {
        while (this.options.firstChild) {
            this.options.removeChild(this.options.firstChild);
        }
    }
    
    let newOption = document.createElement("li");
    newOption.classList.add("options");
    newOption.appendChild(document.createTextNode("press ENTER to continue..."));
    this.options.appendChild(newOption);
}

_m.waitOnInput = function () {
    window.addEventListener("keydown", function (e) {
        if (e.repeat) {
            return;
        }
        if (e.keyCode === 32 || e.keyCode === 13) {
            this.emit("confirmMonologue", null);
        }
    });
}

_m.remove = function () {
    StoryParser.getReference(null);
    document.body.removeChild(this.box);
}

class DialogueBox extends MonologueBox {
    constructor() {
        super();
        this.box.classList.remove("no-options");
        this.box.classList.add("four-options");
        
        this.options.classList.add("four-option-list");
        this.options.classList.remove("no-option-list");
    }
}

_d = DialogueBox.prototype;
/* Bugged
_d.setQuestion = function (text) {
    if (text.length > 100) {
        for (let pos = text.length - 2; pos > 0; pos--) {
            let separators = ".!?;, ";
            if (separators.includes(text[pos])) {
                _m.setQuestion.call(this, text.slice(0, pos));
                _m.setOptions.call(this);
                
                var self = this;
                this.on("confirmMonologue", function(e) {
                    //self.setQuestion(text.slice(pos));
                    
                    self.setOptions(dialogue.answers);
                    self.waitOnInput(npcId);
                });
                
                _m.waitOnInput();
                break;
            }
        }
    }
    else{
        _m.setQuestion.call(this);
        
    this.setOptions(dialogue.answers);
    this.waitOnInput(npcId);
    }

}
*/
_d.getOptions = function (quest, which) {
    let dialogue = new Dialogue(quest.texts[quest.stage],quest.answers[quest.stage]);
    this.setQuestion(dialogue.text);
    this.setOptions(dialogue.answers);
    this.waitOnInput(which);
}

_d.setOptions = function (options) {
    //removing old options, if there were any
    if (this.options.hasChildNodes()) {
        while (this.options.firstChild) {
            this.options.removeChild(this.options.firstChild);
        }
    }

    //small tweak to adequately display options
    if (options.length <= 2) {
        this.box.classList.remove("four-options");
        this.box.classList.add("two-options");

        this.options.classList.remove("four-option-list");
        this.options.classList.add("two-option-list");
    } else {
        this.box.classList.remove("two-options");
        this.box.classList.add("four-options");

        this.options.classList.remove("two-option-list");
        this.options.classList.add("four-option-list");
    }

    function isOverflown(element) {
        return element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth;
    }

    //adding new options onto screen
    for (let i = 0; i < options.length; i++) {
        let newOption = document.createElement("li");
        newOption.classList.add("options");
        newOption.appendChild(document.createTextNode(options[i].text));
        newOption.setAttribute("stage", options[i].stage);
        newOption.setAttribute("close", options[i].close);
        this.options.appendChild(newOption);

        let fontSize = parseInt(newOption.style.fontSize);
        for (let i = fontSize; i >= 0; i--) {
            let overflow = isOverflown(newOption);
            if (overflow) {
                fontSize--;
                newOption.style.fontSize = fontSize + "px";
            }
        }
    }
}

_d.waitOnInput = function (which) {
    var allOptions = this.options.childNodes;
    var currentPos = 0;
    allOptions[currentPos].classList.add("active");
    window.addEventListener("keydown", function handler(e) {
        //handles cases when user keeps pressing down
        if (e.repeat) {
            return;
        }
        //shuffling between different options (not needed if only one option exists)
        if (allOptions.length > 1) {
            //left
            if (e.keyCode === 37 && currentPos > 0) {
                allOptions[currentPos].classList.remove("active");
                currentPos--;
                allOptions[currentPos].classList.add("active");
            }
            //up
            if (e.keyCode === 38 && currentPos > 1 && allOptions.length > 2) {
                allOptions[currentPos].classList.remove("active");
                currentPos -= 2;
                allOptions[currentPos].classList.add("active");
            }
            //right
            if (e.keyCode === 39 && (currentPos < allOptions.length-1)) {
                allOptions[currentPos].classList.remove("active");
                currentPos++;
                allOptions[currentPos].classList.add("active");
            }
            //down
            if (e.keyCode === 40 && currentPos+2 < allOptions.length) {
                allOptions[currentPos].classList.remove("active");
                currentPos += 2;
                allOptions[currentPos].classList.add("active");
            }
            if (e.keyCode === 40 && allOptions.length === 3 && currentPos === 1) {
                allOptions[currentPos].classList.remove("active");
                currentPos += 1;
                allOptions[currentPos].classList.add("active");
            }
        }
        //confirm
        if (e.keyCode === 32 || e.keyCode === 13) {
            window.removeEventListener("keydown",handler);
            let parser = StoryParser.getReference();
            setTimeout(function(){
                parser.getAnswer(which, allOptions[currentPos].getAttribute("stage"),
                    allOptions[currentPos].getAttribute("close"));
            },100);
        }
        if (e.keyCode === 27)  {
            window.removeEventListener("keydown",handler);
            StoryParser.getReference().dialogueBox.remove();
        }
    });
}

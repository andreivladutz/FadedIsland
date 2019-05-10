class MonologueBox {
    constructor() {
        this.box = document.createElement("div");
        this.box.id = "dialogue-box";
        this.box.classList.add("no-options");


        this.content = document.createElement("div");
        this.content.id = "question";

        this.box.appendChild(this.content);
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

_m.waitOnInput = function () {
    window.addEventListener("keyup", function (e) {
        if (e.keyCode === 32 || e.keyCode === 13) {
            return 1;
        }
    });
}

_m.remove = function () {
    document.body.removeChild(this.box);
}

class DialogueBox extends MonologueBox {
    constructor() {
        super();
        this.box.classList.remove("no-options");
        this.box.classList.add("four-options");

        this.options = document.createElement("ul");
        this.options.id = "option-list";
        this.options.classList.add("four-option-list");

        this.box.appendChild(this.options);

        (function nuFacNimic() {

        })();
    }
}

_d = DialogueBox.prototype;

_d.getOptions = function (npcId, dialogue) {
    _d.setQuestion(dialogue.text);
    _d.setOptions(dialogue.answers);
    _d.waitOnInput(npcId);
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

    //adding new options onto screen
    for (let i = 0; i < options.length; i++) {
        var newOption = document.createElement("li");
        newOption.classList.add("options");
        newOption.appendChild(document.createTextNode(options[i].text));
        newOption.setAttribute("type", options[i].type);
        this.options.appendChild(newOption);
    }
}

_d.waitOnInput = function (npcId) {
    var allOptions = this.options.childNodes;
    var currentPos = 0;
    allOptions[currentPos].classList.add("active");
    window.addEventListener("keydown", function (e) {
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
            if (e.keyCode === 39 && ((currentPos < 3 && allOptions.length > 2) || (allOptions.length <= 2 && currentPos < 1))) {
                allOptions[currentPos].classList.remove("active");
                currentPos++;
                allOptions[currentPos].classList.add("active");
            }
            //down
            if (e.keyCode === 40 && currentPos < 2 && allOptions.length > 2) {
                allOptions[currentPos].classList.remove("active");
                currentPos += 2;
                allOptions[currentPos].classList.add("active");
            }
        }
        //confirm
        if (e.keyCode === 32 || e.keyCode === 13) {
            //new StoryParser().getAnswer(npcId, allOptions[currentPos].type)
        }
    });
}

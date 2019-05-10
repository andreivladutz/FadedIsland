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
            alert("A mers!");
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

_d.setOptions = function (...options) {
    if (this.options.hasChildNodes()) {
        while (this.options.firstChild) {
            this.options.removeChild(this.options.firstChild);
        }
    }
    for (let option in options) {
        var newOption = document.createElement("li");
        newOption.classList.add("options");
        newOption.appendChild(document.createTextNode(options[option]));

        this.options.appendChild(newOption);
    }
}

_d.waitOnInput = function () {

}

class YesNoBox extends DialogueBox {
    constructor() {
        super();
        this.box.classList.remove("four-options");
        this.box.classList.add("two-options");

        this.options.classList.add("two-option-list");
    }
}

_y = YesNoBox.prototype;

_y.setOptions = function (...options) {
    newOptions = options.slice(0, 2);
    _d.setOptions.call(this, ...newOptions);
}

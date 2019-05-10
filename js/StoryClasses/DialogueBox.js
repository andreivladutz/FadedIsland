class DialogueBox {
    constructor() {
        this.box = document.createElement("div");
        this.box.id = "dialogue-box";

        this.content = document.createElement("div");
        this.content.id = "question";

        this.options = document.createElement("ul");
        this.options.id = "option-list";

        this.box.appendChild(this.content);
        this.box.appendChild(this.options);
        document.body.appendChild(this.box);
    }
}

_p = DialogueBox.prototype;

_p.setQuestion = function (text) {
    if (this.content.hasChildNodes()) {
        this.content.replaceChild(document.createTextNode(text), this.content.firstChild);
    } else {
        this.content.appendChild(document.createTextNode(text));
    }
}

_p.setOptions = function (...options) {
    console.log(options);
    for (let option in options) {
        var newOption = document.createElement("li");
        newOption.classList.add("options");
        newOption.appendChild(document.createTextNode(options[option]));

        this.options.appendChild(newOption);
    }
}

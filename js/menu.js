class CharacterSelectMenu {
    constructor() {
        this.container = document.createElement("div");
        this.container.id = "character-container";
        this.container.classList.add("content-container");
        this.container.classList.add("adding");
        this.charTitle = document.createElement("h2");
        this.charTitle.appendChild(document.createTextNode("Choose your hero"));

        var char1 = document.createElement("img");
        char1.src = "img/menu/archer_icon.png";
        char1.name = "ARCHER";

        var char2 = document.createElement("img");
        char2.src = "img/menu/assassin_icon.png";
        char2.name = "ASSASSIN";
        
        var char3 = document.createElement("img");
        char3.src = "img/menu/warrior_icon.png";
        char3.name = "WARRIOR";
        
        this.characters = [char1, char2, char3];

        this.container.appendChild(this.charTitle);
        for (let i = 0; i < this.characters.length; i++) {
            this.container.appendChild(this.characters[i]);
        }
        
        this.make_clickable();

    }
}

_char = CharacterSelectMenu.prototype;

_char.toggle = function () {
    var self = this;
    var cont = document.getElementById("main_menu_container");
    var check = self.inDOM();
    if (check === null) {
        cont.appendChild(self.container);
    } else {
        check.classList.remove("adding");
        check.classList.add("removing");
        setTimeout(function(){
            cont.removeChild(self.container);   
            check.classList.remove("removing");
            check.classList.add("adding");
        }, 1000)
    }
}

_char.inDOM = function(){
    var check = document.getElementById("character-container");
    return check;
}

_char.make_clickable = function(){
    let self = this;
    for (let i of self.characters){
        i.addEventListener("click", function(ev){
            CHOSEN = i.name;
        })
    }
}

class Credits{
    constructor(){
        this.container = document.createElement("div");
        this.container.id = "credits-container";
        this.container.classList.add("content-container");
        this.credTitle = document.createElement("h2");
        this.credTitle.appendChild(document.createTextNode("Credits"));
        
        this.authors = document.createElement("div");
        this.authors.appendChild(document.createTextNode("This game has been created by Vlad Dinca, Samuel Gustin, Mihai Purecel, Tudose Vlad. For more information about the project and to access the source-code, visit https://github.com/andreivladutz/FadedIsland"));
        
        this.container.appendChild(this.credTitle);
        this.container.appendChild(this.authors);
    }
}

_cred = Credits.prototype;

_cred.toggle = function(){
    var self = this;
    var cont = document.getElementById("main_menu_container");
    var check = self.inDOM();
    if (check === null) {
        cont.appendChild(self.container);
    } else {
        check.classList.remove("adding");
        check.classList.add("removing");
        setTimeout(function(){
            cont.removeChild(self.container);   
            check.classList.remove("removing");
            check.classList.add("adding");
        }, 1000)
    }
}

_cred.inDOM = function(){
    var check = document.getElementById("credits-container");
    return check;
}


class Menu {
    constructor() {
        this.optionList = document.getElementsByClassName("option");
        this.title = document.getElementById("title");

        this.charContainer = new CharacterSelectMenu();
        this.credits = new Credits();

        this.addHoveredEffect(this.optionList);
        
        this.audio = document.createElement("audio");
        this.audio.preload = "auto";
        this.audio.id = "click_sound";
       
        let audio_source = document.createElement("source");
        audio_source.src = "audio/Click.wav";
        audio_source.type = "audio/wav";
        
        this.audio.appendChild(audio_source);
        
        this.playSound(this.optionList, this.audio);
        this.playSound(this.charContainer.characters, this.audio);
        var self = this;
    }
}

_menu = Menu.prototype;

_menu.addHoveredEffect = function (list_items) {
    for (let i = 0; i < list_items.length; i++) {
        list_items[i].addEventListener("mouseover", function () {
            list_items[i].classList.add("hovered");
            list_items[i].addEventListener("mouseout", function () {
                list_items[i].classList.remove("hovered");
            })
        })
    }
}

_menu.getOptionMenu = function () {
    var check = this.credits.inDOM();
    if(check !== null){
        this.credits.toggle();    
    }
    this.charContainer.toggle();

}

_menu.playSound = function(list, audioSrc){
    for(let i of list){
        i.addEventListener("mouseenter", function(){
            let cpy = audioSrc.cloneNode(true);
            cpy.play();
        })
    }
}

_menu.getCredits = function (){
    var check = this.charContainer.inDOM();
    if(check !== null){
        this.charContainer.toggle();
    }
    this.credits.toggle();
}

init_menu = function () {
    menu = new Menu();
    CHOSEN = "WARRIOR";
}

function getCharacters() {
    menu.getOptionMenu();
}

function getCredits() {
    console.log("sal");
    menu.getCredits();
}

function eraseData(){
    alert("AM REUSIT!");
}

function newGame(){
    window.location.href = "index.html?continue=false&player="+CHOSEN;
}

function continueGame(){
    window.location.href = "index.html?continue=true", true;
}

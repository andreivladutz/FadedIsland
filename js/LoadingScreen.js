class LoadingScreen {
    constructor(){
        // initiating the background for the loading screen, as well as the container for its contents
    var load_screen = document.createElement("div"), loading_content = document.createElement("div"), load_screen_filter = document.createElement("div");
    load_screen.id = "load_screen";
    loading_content.id = "loading";
    load_screen_filter.id = "load_screen_filter";
    
    //adding loading screen into DOM
    load_screen.appendChild(loading_content);
    load_screen.appendChild(load_screen_filter);
    document.body.appendChild(load_screen);
    
    //configuring the inside of loading content
    var title = document.createElement("div");
    var load_bar = document.createElement("div");
    var load_details = document.createElement("div");
    loading_content.appendChild(title);
    loading_content.appendChild(load_bar);
    loading_content.appendChild(load_details);
    
    this.load_screen = load_screen;
    this.content = loading_content;
    this.title = title;
    this.load_bar = load_bar;
        
        //This creates the effect on the title screen
    this.generateTitle();
    //this.wiggleTitle();
    } 
}

_p = LoadingScreen.prototype;

_p.generateTitle = function(){
    this.title.classList.add("animate");
    text = "Loading...";
    for(let letter in text){
        let span = document.createElement("span");
        span.appendChild(document.createTextNode(text[letter]));
        this.title.appendChild(span);
    }
}
_p.wiggleTitle = function(){
    var self = this;
    setTimeout(function(){
        self.title.classList.remove("animate");
        self.title.classList.add("animate");
    }, 10000)
}

/*  OLD idea - got scrapped
_p.generateNewTitle = function(desiredText, pos, garbageLetters){
    var currentText = desiredText.substring(0,pos);
    for(let i = pos; i < desiredText.length; i++){
        let randomInt = Math.floor(Math.random()*(garbageLetters.length));
        let randomletter = garbageLetters[randomInt];
        currentText = currentText + randomletter;
    }
    return currentText;
}

_p.wiggleTitle = function(){
    var self = this;
    
    var desiredText = "Loading...";
    var garbageLetters = "-+*|}{[]~\\\":;?/.><=/+-_)(*&^%$#@!)}";
    
    //initiating title with some random text
    var currentText = this.generateNewTitle(desiredText, 0, garbageLetters);
    var currentTextInDOM = document.createTextNode(currentText);
    self.title.appendChild(currentTextInDOM);
    
    for(let i = 0; i < desiredText.length; i++){
        setTimeout(function(){
            console.log("hi");
            //var changeTitle = setInterval(function(){
                currentText = self.generateNewTitle(desiredText, i, garbageLetters)
                self.title.replaceChild(document.createTextNode(currentText), self.title.firstChild);
            //}, 200);    
        }, 500);
        
    }
    
}
*/




function removeLoadingScreen(){
    var load_screen = document.getElementById("load_screen");
    document.body.removeChild(load_screen);
}
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


function removeLoadingScreen(){
    var load_screen = document.getElementById("load_screen");
    document.body.removeChild(load_screen);
}
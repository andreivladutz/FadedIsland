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
    this.details = load_details;
        
    //This creates the effect on the title screen
    this.generateTitle();
    this.generateLoadBar();
    this.fetchInformation();
    
    //faking progress in the loading process
    this.updateStatus();
    }
}

_p = LoadingScreen.prototype;

_p.generateTitle = function(){
    var self = this.title;
    self.classList.add("animate");
    text = "Loading...";
    for(let letter in text){
        let span = document.createElement("span");
        span.appendChild(document.createTextNode(text[letter]));
        self.appendChild(span);
    }
}

_p.generateLoadBar = function(){
    var bar = document.createElement("div");
    this.load_bar.appendChild(bar);
    
    for(let i = 0; i<10; i++){
        var bar_line = document.createElement("div");
        bar_line.classList.add("load_bars");
        bar.appendChild(bar_line);
    }
}

_p.fetchInformation = function(){
    var self = this.details;
    self.appendChild(document.createTextNode("Gathering information..."));
}

_p.updateStatus = function(){
    var self = this;
    
    var statuses = ["Gathering information...", "Fetching resources...", "Rendering map..."];
    var timings = [1,3,7];
    var position = 0;
    loading_bars = self.load_bar.querySelectorAll(".load_bars");
    //cascading updates in the loading process (in reality, the main thread is occupied by actual resources being loaded, so this will only mimic some loading for a brief period of time)
    setTimeout(function(){
        for(let j = position; j < timings[0]; j++){
            loading_bars[j].style.background = "greenyellow";
            position = j;
        }
        self.details.replaceChild(document.createTextNode(statuses[0]), self.details.firstChild);
        setTimeout(function(){
            for(let j = position; j < timings[1]; j++){
                loading_bars[j].style.background = "greenyellow";
                position = j;
            }

            self.details.replaceChild(document.createTextNode(statuses[1]), self.details.firstChild);
            setTimeout(function(){
                for(let j = position; j < timings[2]; j++){
                    loading_bars[j].style.background = "greenyellow";
                    position = j;
                }

                self.details.replaceChild(document.createTextNode(statuses[2]), self.details.firstChild);

            }, 200);
        }, 200); 
    }, 200);
}

//remves the loading screen after a short delay
_p.removeLoadingScreen = function(){
    var self = this;
    //this acts as a transition
    setTimeout(function(){
        var loading_bar = self.load_bar.firstElementChild;
        loading_bar.style.background = "greenyellow";
        
        self.details.replaceChild(document.createTextNode("Almost ready..."), self.details.firstChild);
        setTimeout(function(){
            document.body.removeChild(self.load_screen);
        }, 200);
    }, 500);
}
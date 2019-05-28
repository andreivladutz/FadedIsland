function getPreferences(){
    let url = window.location.href;
    let preferences = url.split("?");
    if(preferences.length > 1){
        let params = preferences[1].split('&');
        console.log(params[0]);
        if(params[0] === "continue=false"){
            localStorage.clear();
            if(params.length > 1){
                switch(params[1]){
                    case "player=WARRIOR": return "player3";
                    case "player=ASSASSIN": return "player1";
                    case "player=ARCHER": return "player2";
                    default: return "player3";    
                }
                                }
        }
    }
    return "player3";
}
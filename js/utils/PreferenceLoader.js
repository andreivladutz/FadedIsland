function getPreferences(){
    let url = window.location.href;
    let preferences = url.split("?");
    if(preferences.length > 1){
        let params = preferences[1].split('&');
        if(params[0] === "false"){
            localStorage.clear();
            //change player model
        }
    }
}
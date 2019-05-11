"use strict";
/*
	Utility for testing if the localStorage is available
	
	Function taken from the MDN web docs
	https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API/Using_the_Web_Storage_API
 */
function storageAvailable(type = "localStorage") {
    var storage;
    try {
        storage = window[type];
        var x = '__storage_test__';
        storage.setItem(x, x);
        storage.removeItem(x);
        return true;
    }
    catch(e) {
        return e instanceof DOMException && (
            // everything except Firefox
            e.code === 22 ||
            // Firefox
            e.code === 1014 ||
            // test name field too, because code might not be present
            // everything except Firefox
            e.name === 'QuotaExceededError' ||
            // Firefox
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED') &&
            // acknowledge QuotaExceededError only if there's something already stored
            (storage && storage.length !== 0);
    }
}

/*
	StateSaver is a singleton class
	
	It has to know about the player and the mapRenderer internally so it automatically
	knows what values to save and where to get them from
 */
var StateSaverManager = (function() {
	var stateSaverReference = null;
	
	class StateSaver {
		constructor() {
			this.storageIsAvailable = storageAvailable();
			
			/* 
				these values get updated as we play.
				
				first we initialize them to the default values
			 */
			this.storedValues = {
				currentMap: MAIN_MAP,
				lastMapCoords: null
			}
			
			// if no storage is available leave the default values
			if (!this.storageIsAvailable) {
				return;
			}
			
			// for now it gets the global variables but everything should be refactored in a 
			// Game class that has getters for these references
			this.playerReference = player;
			this.mapLoader = mapLoader;
			// will be instantiated later from the mapLoader
			this.mapRenderer = null;
			
			/* 
			 *	if we find a value that has been previously saved we overwrite the default value
			 */
			let storedValue;
			
			(storedValue = localStorage.getItem("currentMap")) &&
				(this.storedValues.currentMap = storedValue);
			
			// lastMapCoords are saved as JSON string
			(storedValue = localStorage.getItem("lastMapCoords")) &&
				(this.storedValues.lastMapCoords = JSON.parse(storedValue));
			
			// sometimes they get messed up and set to 0
			if (this.storedValues.lastMapCoords 
				&& this.storedValues.lastMapCoords.x === 0 
				&& this.storedValues.lastMapCoords.y === 0) {
				
				this.storedValues.lastMapCoords = null;
				localStorage.removeItem("lastMapCoords");
			}
			
			// update coordinates on disk at a certain interval
			this.saveStateIntervalId = setInterval(
				function() {
					StateSaverManager().saveCoordinates();
				}, StateSaver.automaticSavingInterval
			);
		}
		
		setMapRenderer(mapRenderer) {
			this.mapRenderer = mapRenderer;
			
			// when the map changes we want to save the state to disk
			this.mapRenderer.on(MapRenderer.CHANGED_MAP_EVENT, this.saveState.bind(this));
		}
		
		saveState() {
			if (!this.storageIsAvailable || !this.mapRenderer) {
				return;
			}
			
			// first update the values so we make sure we save the current state 
			this.updateStoredValues();
			
			localStorage.setItem("currentMap", this.storedValues.currentMap);
			
			// update coords separately 
			this.saveCoordinates();
		}
		
		updateStoredValues() {
			this.storedValues.currentMap = this.mapRenderer.getCurrentMapName();
			
			/* Leaving this for later debugging
			console.log("UPDATED STORAGE VALUES:");
			console.log("CURRENT MAP NAME = ", this.storedValues.currentMap);
			*/
			
		}
		
		// the only saving that needs to be made at a certain interval
		saveCoordinates() {
			if (!this.storageIsAvailable || !this.mapRenderer) {
				return;
			}
			
			let playerCoords = this.playerReference.getMapCoords();
			
			if (!playerCoords) {
				return;
			}
			
			this.storedValues.lastMapCoords = playerCoords;
			localStorage.setItem("lastMapCoords", JSON.stringify(this.storedValues.lastMapCoords));
			
			/*
			console.log("UPDATED STORAGE VALUES:");
			console.log("PLAYER COORDS = ", this.storedValues.lastMapCoords);
			*/
		}
	}
	
	// save progress every 10 seconds
	StateSaver.automaticSavingInterval = 10000;
	
	// first call instantiates the stateSaver
	return function instantiator() {
		if (stateSaverReference === null) {
			stateSaverReference = new StateSaver();
		}
		
		return stateSaverReference;
	}
})();
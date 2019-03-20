/*
	Singleton factory => the first time it is called it instantiates
	the canvasManager, following calls to the factory return the same object
	
	example calls:
	
	- first call: cManager = CanvasManagerFactory(document.getElementById("gameCanvas"))
	- subsequent calls: cManager = CanvasManagerFactory()
*/
var CanvasManagerFactory = (function(canvasElement) {
	var canvasManager = null;
	
	
	/*
		the canvas has an offScreenBuffer for performance reasons.
		the first time a piece of the map is drawn, the tiles are
		rendered  on the offScreenBuffer.
		
		unless the piece of map currently drawn changes, every frame
		draws the content of the offScreenBuffer to the main canvas
	*/
	class CanvasManager {
		constructor(canvasElem) {
			this.canvas = canvasElem;
			this.ctx = this.canvas.getContext("2d");
			
			this.offScreenBuffer = document.createElement("canvas");
			this.offScreenCtx = this.offScreenBuffer.getContext("2d");
			
			this.initFullscreenCanvas();
		}
		
		initFullscreenCanvas() {
			this.resizeCanvas();
			
			window.addEventListener("resize", this.resizeCanvas.bind(this));
		}
		
		resizeCanvas() {
			var width = Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
				height = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
			
			this.canvas.width = width;
			this.canvas.height = height;
			
			this.offScreenBuffer.width = width;
			this.offScreenBuffer.height = height;
		}
	};
	
	return function instantiator(canvasElement = null) {
		if (!canvasElement && !canvasManager) {
			throw "First call to CanvasManagerFactory should be\
				with the canvasElement";
		}
		
		if (!canvasManager) {
			canvasManager = new CanvasManager(canvasElement);
		}
		
		return canvasManager;
	}
	
})();
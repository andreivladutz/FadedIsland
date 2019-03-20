const CANVAS_RESIZE_EVENT = "canvasResized";

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
	class CanvasManager extends EventEmiter {
		constructor(canvasElem) {
			super();
			
			this.canvas = canvasElem;
			this.ctx = this.canvas.getContext("2d");
			
			this.offScreenBuffer = document.createElement("canvas");
			this.offScreenCtx = this.offScreenBuffer.getContext("2d");
			
			//how much bigger should the offScreenBuffer be than the canvas
			this.addPixelsToWidth = 0;
			this.addPixelsToHeight = 0;
			
			this.initFullscreenCanvas();
		}
		
		initFullscreenCanvas() {
			this.resizeCanvas();
			
			window.addEventListener("resize", this.resizeCanvas.bind(this));
		}
		
		resizeCanvas() {
			var width = window.innerWidth,
				height = window.innerHeight;
			
			this.canvas.width = width;
			this.canvas.height = height;
			
			this.offScreenBuffer.width = width + this.addPixelsToWidth;
			this.offScreenBuffer.height = height + this.addPixelsToHeight;
			
			this.emit(CANVAS_RESIZE_EVENT, null);
		}
		
		//we have the option of making the offscreenBuffer bigger so it holds
		//more data than the visible canvas
		makeOffscreenBufferBigger(addPixelsWidth, addPixelsHeight) {
			this.addPixelsToWidth = addPixelsWidth;
			this.addPixelsToHeight = addPixelsHeight;
			
			this.resizeCanvas();
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
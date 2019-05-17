class Projectile {
	// receives the start coordinates and the angle at which it travels
	constructor(stX, stY, angle) {
		// adds itself to the array of drawn entities and remembers its own index in the array
		// so once it runs out of it's life cycle it is easier to remove it from the array
		DRAWABLE_ENTITIES.push(this);
		this.ownIndex = DRAWABLE_ENTITIES.length - 1;

		this.canvas = CanvasManagerFactory().canvas;
		this.ctx = CanvasManagerFactory().ctx;

		this.stX = stX;
		this.stY = stY;

		this.endX = stX + Projectile.DISTANCE_TRAVELED * Math.cos(angle);
		this.endY = stY + Projectile.DISTANCE_TRAVELED * Math.sin(angle);

		this.angle = angle;

		this.computeDirection();

		// flag to know if the project traveled the distance it had to travel
		// or if it collided and should be removed
		this.finishedAnimation = false;

		this.animationTimer = new Timer();
		this.animator = new Animator(Projectile.TRAVEL_TIME);

		// override hook function to finish animation properly
		this.animator._onLoopEnd = (function() {
			this.finishedAnimation = true;
		}).bind(this);
	}

	computeDirection() {
		/*
			different sprite image depending on the direction that the projectile has been launched in

			code copied from computeDirection in the Actor class. just added in between directions (for diagonals)
		 */

		// up, down, right, left just smaller intervals
		if (this.angle >= 3 * Math.PI / 8 && this.angle <= 5 * Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowDown"];
		}
		else if (this.angle >= - Math.PI / 8 && this.angle <= Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowRight"];
		}
		else if (Math.abs(this.angle) >= 7 * Math.PI / 8 && Math.abs(this.angle) <= Math.PI) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowLeft"];
		}
		else if (this.angle <= - 3 * Math.PI / 8 && this.angle >= - 5 * Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowUp"];
		}
		// added diagonals for the angle
		else if (this.angle >= - 3 * Math.PI / 8 && this.angle <= - Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowUpRight"];
		}
		else if (this.angle >= Math.PI / 8 && this.angle <= 3 * Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowDownRight"];
		}
		else if (this.angle >= 5 * Math.PI / 8 && this.angle <= 7 * Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowDownLeft"];
		}
		else if (this.angle >= - 7 * Math.PI / 8 && this.angle <= - 5 * Math.PI / 8) {
			this.spriteImg = Projectile.LOADED_RESOURCES["arrowUpLeft"];
		}
	}
}

Projectile.RESOURCES = [
	{
		name: "arrowUp",
		itemType: "img",
		url: "./img/projectile/arrowUp.png"
	},{
		name: "arrowUpRight",
		itemType: "img",
		url: "./img/projectile/arrowUpRight.png"
	},{
		name: "arrowUpLeft",
		itemType: "img",
		url: "./img/projectile/arrowUpLeft.png"
	},{
		name: "arrowDown",
		itemType: "img",
		url: "./img/projectile/arrowDown.png"
	},{
		name: "arrowDownRight",
		itemType: "img",
		url: "./img/projectile/arrowDownRight.png"
	},{
		name: "arrowDownLeft",
		itemType: "img",
		url: "./img/projectile/arrowDownLeft.png"
	},{
		name: "arrowLeft",
		itemType: "img",
		url: "./img/projectile/arrowLeft.png"
	},{
		name: "arrowRight",
		itemType: "img",
		url: "./img/projectile/arrowRight.png"
	},
];

// Loaded images will be added to this dictionary
Projectile.LOADED_RESOURCES = {};

Projectile.DISTANCE_TRAVELED = 300;
// travel time in ms
Projectile.TRAVEL_TIME = 50;

let _p = Projectile.prototype;
/*
	Trying to keep the same API as the Actor class
 */

_p.updatePosition = function() {
	if (!this.animator.isRunning()) {
		this.animator.start();
	}

	/*
		UPDATE position depending on passed time
	 */
	let fraction = this.animator.update(this.animationTimer);
	this.x = this.stX + fraction * (this.endX - this.stX);
	this.y = this.stY + fraction * (this.endY - this.stY);

	this.animationTimer.lastUpdatedNow();

	if (this.finishedAnimation) {
		return this.ownIndex;
	}
	else
		// haven't finished with it yet. do not remove it from the DRAWN_ENTITIES arr
		return -1;
};

_p.update = function() {
	return this.updatePosition();
};

_p.draw = function() {
	let width = this.spriteImg.width, height = this.spriteImg.height;
	this.ctx.drawImage(this.spriteImg, 0, 0, width, height, this.x, this.y, width, height);
};
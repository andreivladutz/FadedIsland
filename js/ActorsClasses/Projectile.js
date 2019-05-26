const REMOVE_ENTITY = 1, KEEP_ENTITY = -1;

class Projectile {
	// receives the start coordinates and the angle at which it travels
	constructor(stX, stY, angle, direction, parentReference, mapRenderer) {
		// adds itself to the array of drawn entities
		DRAWABLE_ENTITIES.push(this);
		PROJECTILES.push(this);

		this.mapRenderer = mapRenderer;

		// whose projectile is this? who does it do damage to?
		if (parentReference instanceof Player) {
			// we're looking to deal damage to any enemy
			this.opponentArr = ENEMIES;
		}
		else if (parentReference instanceof Enemy) {
			// just the player
			this.opponentArr = [player];
		}

		this.canvas = CanvasManagerFactory().canvas;
		this.ctx = CanvasManagerFactory().ctx;

		this.stX = stX;
		this.stY = stY;

		this.endX = stX + Projectile.DISTANCE_TRAVELED * Math.cos(angle);
		this.endY = stY + Projectile.DISTANCE_TRAVELED * Math.sin(angle);

		// need last values for collision checking (animator might skip some coords)
		this.lastFraction = 0;
		this.actualFraction = 0;

		this.angle = angle;
		// the direction of the actor that launched the projectile
		this.parentDirection = direction;
		// the sprite chosen depending on the direction of the projectile
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

Projectile.DISTANCE_TRAVELED = 400;
// travel time in ms
Projectile.TRAVEL_TIME = 50;
Projectile.FRACTION_STEP = 0.01;

let _p = Projectile.prototype;
/*
	Trying to keep the same API as the Actor class
 */

// removes itself from the arrays it's being kept in
_p.removeSelf = function() {
	DRAWABLE_ENTITIES.splice(DRAWABLE_ENTITIES.indexOf(this), 1);
	PROJECTILES.splice(PROJECTILES.indexOf(this), 1);
};

_p.updatePosition = function() {
	if (!this.animator.isRunning()) {
		this.animator.start();
	}

	/*
		UPDATE position depending on passed time
	 */
	this.lastFraction = this.actualFraction;

	this.actualFraction = this.animator.update(this.animationTimer);

	// if the animation has ended don't skip the last position
	if (this.finishedAnimation) {
		this.actualFraction = 1;
		this.checkCollision();
	}

	this.coordX = this.stX + this.actualFraction * (this.endX - this.stX);
	this.coordY = this.stY + this.actualFraction * (this.endY - this.stY);

	this.animationTimer.lastUpdatedNow();

	if (this.finishedAnimation) {
		return REMOVE_ENTITY;
	}
	else
		// haven't finished with it yet. do not remove it from the DRAWN_ENTITIES arr
		return KEEP_ENTITY;
};

_p.update = function() {
	// it hasn't finished travelling yet, maybe we collided with some opponent
	if (this.updatePosition() === KEEP_ENTITY && this.checkCollision() === KEEP_ENTITY) {
		return;
	}

	this.removeSelf();
};

_p.checkCollision = function() {
	for (let fraction = this.lastFraction; fraction <= this.actualFraction; fraction += Projectile.FRACTION_STEP) {
		let cX = this.stX + fraction * (this.endX - this.stX),
			cY = this.stY + fraction * (this.endY - this.stY),
			projectileTile = this.mapRenderer.screenCoordsToTileCoords({x: cX, y: cY});

		// encountered an unwalkable tile
		if (this.mapRenderer.currentMapInstance.collisionMatrix[projectileTile.y][projectileTile.x]) {
			return REMOVE_ENTITY;
		}

		for (let opponent of this.opponentArr) {
			if (opponent instanceof Enemy) {
				opponent.updateScreenCoords();
			}

			let projectileRect = {
				top: cY,
				left: cX,
				right: cX + this.spriteImg.width,
				bottom: cY + this.spriteImg.height
			}, opponentRect = {
				top: opponent.coordY - ACTUAL_ACTOR_HEIGHT,
				left: opponent.coordX - ACTUAL_ACTOR_WIDTH / 2,
				right: opponent.coordX + ACTUAL_ACTOR_WIDTH / 2,
				bottom: opponent.coordY
			};

			if (rectIntersection(projectileRect, opponentRect)) {
				opponent.bleed(Actor.BOW_DAMAGE, this.parentDirection, 0);

				return REMOVE_ENTITY;
			}
		}
	}

	return KEEP_ENTITY;
};

_p.draw = function() {
	let width = this.spriteImg.width, height = this.spriteImg.height;
	this.ctx.drawImage(this.spriteImg, 0, 0, width, height, this.coordX, this.coordY, width, height);
};
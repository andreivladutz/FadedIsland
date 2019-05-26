/*
	ACTOR HEALTH BARS. constructor takes total health
	and the update gets the damage taken as a parameter
 */
class HealthBar {
	constructor(fullHealth, barColor, actorReference) {
		this.ctx = CanvasManagerFactory().ctx;
		this.color = barColor;

		this.fullHealth = fullHealth;
		this.currHealth = fullHealth;
		this.fraction = 1;

		// GOTTA KNOW THE ACTOR POSITION
		this.actorReference = actorReference;

		this.hidden = false;
	}

	tookDamage(damage) {
		this.currHealth = Math.max(0, this.currHealth - damage);
		this.fraction = this.currHealth / this.fullHealth;
	}

	update() {
		this.middleX = this.actorReference.coordX;
		this.x = this.middleX - HealthBar.WIDTH / 2;
		this.y = this.actorReference.coordY - ACTUAL_ACTOR_HEIGHT - HealthBar.ACTOR_OFFSET;
	}

	draw() {
		if (this.hidden) {
			return;
		}

		this.ctx.strokeStyle = "black";
		this.ctx.lineWidth = HealthBar.STROKE_WIDTH;
		this.ctx.strokeRect(this.x, this.y, HealthBar.WIDTH, HealthBar.HEIGHT);

		let barWidth = HealthBar.WIDTH * this.fraction  - HealthBar.STROKE_WIDTH * 2;

		if (barWidth > 0) {
			this.ctx.fillStyle = this.color;
			this.ctx.fillRect(this.x + HealthBar.STROKE_WIDTH, this.y + HealthBar.STROKE_WIDTH,
				barWidth, HealthBar.HEIGHT - HealthBar.STROKE_WIDTH * 2);
		}
	}

	hide() {
		this.hidden = true;
	}

	show() {
		this.hidden = false;
	}
}

HealthBar.ACTOR_OFFSET = 30;
HealthBar.WIDTH = 80;
HealthBar.HEIGHT = 8;
HealthBar.STROKE_WIDTH = 1;
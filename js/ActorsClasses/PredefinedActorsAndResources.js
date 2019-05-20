/*
	The big array of png resources for the player and enemies
 */
const RESOURCES = [
	{
		name: "playerBody1",
		itemType: "img",
		url: "./img/player/playerBody1.png"
	},
	{
		name: "bodyArmour1",
		itemType: "img",
		url: "./img/armour/bodyArmour1.png"
	},
	{
		name: "bootsArmour1",
		itemType: "img",
		url: "./img/armour/bootsArmour1.png"
	},
	{
		name: "bootsArmour2",
		itemType: "img",
		url: "./img/armour/bootsArmour2.png"
	},
	{
		name: "armsArmour1",
		itemType: "img",
		url: "./img/armour/armsArmour1.png"
	},
	{
		name: "helmArmour1",
		itemType: "img",
		url: "./img/armour/helmArmour1.png"
	},
	{
		name: "pantsArmour1",
		itemType: "img",
		url: "./img/armour/pantsArmour1.png"
	},
	// WEAPONS
	{
		name: "bow",
		itemType: "img",
		url: "./img/weapons/recurvebow.png"
	},
	{
		name: "arrow",
		itemType: "img",
		url: "./img/weapons/arrow.png"
	},
	{
		name: "spear",
		itemType: "img",
		url: "./img/weapons/spear.png"
	},
	{
		name: "dagger",
		itemType: "img",
		url: "./img/weapons/dagger_male.png"
	},
	//ENEMIES
	{
		name: "skeletonBody",
		itemType: "img",
		url: "./img/enemies/skeletonBody.png"
	},
	{
		name: "darkElfBody",
		itemType: "img",
		url: "./img/enemies/darkElfBody.png"
	},
	{
		name: "elvenEarsDarkElf",
		itemType: "img",
		url: "./img/enemies/elvenEarsDarkElf.png"
	},
	{
		name: "tabardJacket",
		itemType: "img",
		url: "./img/armour/tabarnJacket.png"
	},
	{
		name: "clothHood",
		itemType: "img",
		url: "./img/armour/clothHood.png"
	},
	{
		name: "redEyes",
		itemType: "img",
		url: "./img/armour/redEyes.png"
	},
	{
		name: "brownLongsleeve",
		itemType: "img",
		url: "./img/armour/brownLongsleeve.png"
	},
	{
		name: "robeSkirt",
		itemType: "img",
		url: "./img/armour/robeSkirt.png"
	},
	{
		name: "dagger",
		itemType: "img",
		url: "./img/weapons/dagger_male.png"
	},
];

ActorFactory.predefinedActors = [
	{
		name: "player1",
		type: "player",
		resources: {
			"base" : "playerBody1",
			"hair" : null,
			"feetArmour" : "pantsArmour1",
			"bootsArmour" : "bootsArmour1",
			"bodyArmour" : "bodyArmour1",
			"armsArmour" : "armsArmour1",
			"headArmour" : "helmArmour1"
		},
		attackType: Actor.BOW
	},
	{
		name: "capedSkeleton",
		type: "enemy",
		resources: {
			"base" : "skeletonBody",
			"hair" : null,
			"feetArmour" : "robeSkirt",
			"bootsArmour" : null,
			"bodyArmour" : "brownLongsleeve",
			"armsArmour" : null,
			"headArmour" : "clothHood"
		},
		attackType: Actor.SPEAR
	},
	{
		name: "darkElf",
		type: "enemy",
		resources: {
			"base" : "darkElfBody",
			"hair" : "elvenEarsDarkElf",
			"feetArmour" : null,
			"bootsArmour" : null,
			"bodyArmour" : "tabardJacket",
			"armsArmour" : "dagger",
			"headArmour" : "redEyes"
		},
		attackType: Actor.DAGGER
	},
	{
		name: "rangedSkeleton",
		type: "enemy",
		resources: {
			"base" : "skeletonBody",
			"hair" : null,
			"feetArmour" : "pantsArmour1",
			"bootsArmour" : "bootsArmour2",
			"bodyArmour" : null,
			"armsArmour" : null,
			"headArmour" : null
		},
		attackType: Actor.BOW
	},
];

// keep the enemy names separate also for easier access
ActorFactory.enemyNames = ["rangedSkeleton", "darkElf", "capedSkeleton"];
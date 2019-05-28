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
		name: "playerBodyTanned",
		itemType: "img",
		url: "./img/player/playerBodyTanned.png"
	},
	{
		name: "playerBodyDark",
		itemType: "img",
		url: "./img/player/playerBodyDark.png"
	},
	{
		name: "bodyArmour1",
		itemType: "img",
		url: "./img/armour/bodyArmour1.png"
	},
	{
		name: "leatherBracers",
		itemType: "img",
		url: "./img/armour/leatherBracers.png"
	},
	{
		name: "maroonLongsleeve",
		itemType: "img",
		url: "./img/armour/maroonLongsleeve.png"
	},
	{
		name: "shouldersMale",
		itemType: "img",
		url: "./img/armour/shouldersMale.png"
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
		name: "brownShoes",
		itemType: "img",
		url: "./img/armour/brownShoes.png"
	},
	{
		name: "armsArmour1",
		itemType: "img",
		url: "./img/armour/armsArmour1.png"
	},
	{
		name: "leatherBraces",
		itemType: "img",
		url: "./img/armour/leatherBraces.png"
	},
	{
		name: "redPants",
		itemType: "img",
		url: "./img/armour/redPants.png"
	},
	{
		name: "helmArmour1",
		itemType: "img",
		url: "./img/armour/helmArmour1.png"
	},
	{
		name: "chainHat",
		itemType: "img",
		url: "./img/armour/chainHat.png"
	},
	{
		name: "leatherCap",
		itemType: "img",
		url: "./img/armour/leatherCap.png"
	},
	{
		name: "ravenHair",
		itemType: "img",
		url: "./img/armour/ravenHair.png"
	},
	{
		name: "messyHair",
		itemType: "img",
		url: "./img/armour/messyHair.png"
	},
	{
		name: "pantsArmour1",
		itemType: "img",
		url: "./img/armour/pantsArmour1.png"
	},
	{
		name: "tealPants",
		itemType: "img",
		url: "./img/armour/tealPants.png"
	},
	{
		name: "quiver",
		itemType: "img",
		url: "./img/armour/quiver.png"
	},
	{
		name: "shield",
		itemType: "img",
		url: "./img/armour/shield.png"
	},
	{
		name: "leatherBelt",
		itemType: "img",
		url: "./img/armour/leatherBelt.png"
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
			"hair" : "shouldersMale",
			"feetArmour" : "robeSkirt",
			"bootsArmour" : "brownShoes",
			"bodyArmour" : "brownLongsleeve",
			"armsArmour" : "leatherBraces",
			"headArmour" : "chainHat"
		},
		attackType: Actor.DAGGER
	},
	{
		name: "player2",
		type: "player",
		resources: {
			"base" : "playerBodyDark",
			"hair" : "ravenHair",
			"shoulders" : "shouldersMale",
			"bracers" : "leatherBracers",
			"quiver" : "quiver",
			"belt" : "leatherBelt",
			"feetArmour" : "tealPants",
			"bootsArmour" : "brownShoes",
			"bodyArmour" : "maroonLongsleeve",
			"armsArmour" : "leatherBraces",
			"headArmour" : "leatherCap"
		},
		attackType: Actor.BOW
	},
	{
		name: "player3",
		type: "player",
		resources: {
			"base" : "playerBodyTanned",
			"hair" : "messyHair",
			"shoulders" : "shouldersMale",
			"bracers" : "leatherBracers",
			"belt" : "leatherBelt",
			"feetArmour" : "redPants",
			"bootsArmour" : "brownShoes",
			"bodyArmour" : "bodyArmour1",
			"armsArmour" : "armsArmour1",
			"headArmour" : "leatherCap",
			"shield" : "shield"
		},
		attackType: Actor.SPEAR
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
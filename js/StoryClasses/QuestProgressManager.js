class QuestProgressManager extends EventTarget{

    constructor(quest, objectiveBox) {

        super();

        this.quest = quest;
		this.progress = 0;
        this.objectiveBox = objectiveBox;

		
		let obj = this;
        player.addEventListener(Enemy.KILLED_ENEMY_EVENT, function enemyKill(e) {	
          	console.log(obj.quest);
			if(obj.quest["quest"].monsters.includes(e.detail)) {
				console.log("sal");
                obj.progress++;
                obj.objectiveBox.updateQuestProgress();
            }
            if(obj.progress === obj.quest["quest"].quota) {
                obj.objectiveBox.removeQuestProgress();
				quest.stage++;
				quest.currentObjective++;
				objectiveBox.showObjective(StoryParser.getObjective());
                player.removeEventListener("killedEnemy", enemyKill); 	
            }

        })
    }

}

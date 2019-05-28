class QuestProgressManager extends EventTarget{

    constructor(monsters, progress, quantity, objectiveBox = null) {

        super();

        this.monsters = monsters;
        this.progress = progress;
        this.quantity = quantity;
        this.objectiveBox = objectiveBox;

        let obj = this;
        this.addEventListener("killedEnemy",function(name) {

            console.log("sal");
            if(obj.monsters.includes(name)) {
                obj.progress++;
                obj.objectiveBox.updateQuestProgress();
            }
            if(obj.progress === obj.quantity) {
                obj.objectiveBox.removeQuestProgress();
                obj.removeEventListener("killedEnemy");
            }

        })
    }

}

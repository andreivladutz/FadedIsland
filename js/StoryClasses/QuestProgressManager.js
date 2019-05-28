class QuestProgressManager extends EventTarget{

    constructor(monsters, progress, quantity) {

        super();

        this.monsters = monsters;
        this.progress = progress;
        this.quantity = quantity;

        let obj = this;
        this.addEventListener("killedEnemy",function(name) {

            console.log("sal");
            if(obj.monsters.includes(name)) {
                obj.progress++;
            }
            if(obj.progress === obj.quantity)
                obj.removeEventListener("killedEnemy");

        })
    }

}

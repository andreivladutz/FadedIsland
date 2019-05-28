class ObjectiveBox{
    constructor(){
        //Creating objective box container
        this.container = document.createElement("div");
        this.container.id = "obj-box";
        //Creating the holder for actual objective text
        this.currObjective = document.createElement("div");
        this.currObjective.id = "obj-box-text";
        this.container.appendChild(this.currObjective);
        //Creating holder for quest progress
        this.questProgress = document.createElement("div");
        this.questProgress.id = "obj-box-progress";
        this.container.appendChild(this.questProgress);
        //creep to kill
        this.questProgressName = document.createElement("div");
        this.questProgressName.id = "creep-name";
        //count of creeps killed/total
        this.questProgressCount = document.createElement("div");
        this.questProgressCount.id = "progress-count";
        this.questProgressCount.currNum = 0;
        this.questProgressCount.desiredNum = 0;
        //adding creepName and count to quest progress holder
        this.questProgress.appendChild(this.questProgressName);
        this.questProgress.appendChild(this.questProgressCount);
    }
}

_objbox = ObjectiveBox.prototype;

_objbox.displayBox = function(){
    document.body.appendChild(this.container);
}

_objbox.remove = function(){
    document.body.removeChild(this.container);
}

_objbox.toggleView = function(){
    let check = document.getElementById("obj-box");
    if(check === null){
        this.displayBox();
    }
    else{
        this.remove();
    }
}

_objbox.showObjective = function(objectiveText){
    this.currObjective.textContent = "\u2022 " + objectiveText;
}

_objbox.showQuestProgress = function(creepName, currNum, desiredNum){
    this.questProgressName.textContent = "\u2022 " + creepName;
    
    this.questProgressCount.currNum = currNum;
    this.questProgressCount.desiredNum = desiredNum;
    this.questProgressCount.textContent = currNum + "/" + desiredNum;
    
}

_objbox.updateQuestProgress = function(increment = 1){
    this.questProgressCount.currNum += increment;
    if(this.questProgressCount.currNum >= this.questProgressCount.desiredNum){
        //signal progress done
    }
    this.questProgressCount.textContent = Math.min(this.questProgressCount.currNum, this.questProgressCount.desiredNum) + "/" + this.questProgressCount.desiredNum;
}

_objbox.removeQuestProgress = function() {
    this.questProgressName.textContent = "";
    this.questProgressCount.textContent = "";
}
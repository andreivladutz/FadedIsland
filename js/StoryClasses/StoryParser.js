class Quest {
    constructor(npc_id, texts, answers, maxStage) {
        this.npc_id = npc_id;
        this.texts = texts;
        this.answers = answers;
        this.stage = 0;
        this.prevStage = 1;
        this.maxStage = maxStage;
        this.completed = false;
    }
}

class Dialogue {
    constructor(text, answers) {
        this.text = text;
        this.answers = answers;
    }
}

class StoryParser {

    static getQuestsProgress() {
        if(localStorage.getItem("questsProgress") !== null)
            return parseInt(localStorage.getItem("questsProgress"));
        else return 0;
    }

    static setQuestsProgress(value) {
        localStorage.setItem("questsProgress", value);
    }

    static upQuestsProgress(value) {
        let oldValue = parseInt(localStorage.getItem("questsProgress"));
            oldValue = isNaN(oldValue) ? 0 : oldValue;
        localStorage.setItem("questsProgress", oldValue + value);
    }

    static getReference(box = "default") {
        if(StoryParser.reference === undefined)
            StoryParser.reference = new StoryParser(box);
        else
            if(box !== "default")
                StoryParser.reference.dialogueBox = box;
        return StoryParser.reference;
    };

    static getPaths() {

        if(localStorage.getItem(("questPaths")) === null)
            localStorage.setItem("questPaths", [2,4,7]);

        let paths = localStorage.getItem("questPaths").split(",");
        if(paths[0] === "")
            paths = [];
        return paths;

    }

    static addPath(path) {

        let paths = StoryParser.getPaths();
        paths[paths.length] = path;
        localStorage.setItem("questPaths", paths);

    }

    constructor(dialogueBox) {

        this.dialogueBox = dialogueBox;

        this.loadQuests = function() {

            let object = this;

            let xobj = new XMLHttpRequest();
            xobj.overrideMimeType("application/json");
            xobj.open('GET', 'quests.json', true);
            xobj.onreadystatechange = function () {
                if (xobj.readyState === 4 && xobj.status == "200") {
                    let textsArray = JSON.parse(xobj.responseText);
                    let stagesArray = [];
                    let quests = [];

                    for(let i = 0; i < textsArray.length; i++) {
                        quests[i] = new Quest(textsArray[i].npc_id, textsArray[i].texts,
                            textsArray[i].answers, textsArray[i].maxStage);
                    }

                    for(let i = 0; i < textsArray.length; i++)
                        if(localStorage.getItem(`questStages|${i}`) !== null){
                            stagesArray[i] = JSON.parse(localStorage.getItem(`questStages|${i}`));
                            quests[i].stage = stagesArray[i].stage;
                            quests[i].prevStage = stagesArray[i].prevStage;
                            quests[i].completed = stagesArray[i].completed;
                        }
                    object.quests = quests;
                }

            };
            xobj.send(null);
        };

        this.loadQuests();

        this.getQuest = function(npc_id) {

            let i = parseInt(StoryParser.getQuestsProgress()) > this.quests.length - 1 ?
                this.quests.length - 1 : parseInt(StoryParser.getQuestsProgress());
            while(i >= 0)
                if(this.quests[i].npc_id !== npc_id)
                    i--;
            else break;
            if(i >= 0)
                this.dialogueBox.getOptions(this.quests[i], i);
            else
                this.dialogueBox.remove();

        };

        this.getAnswer = function(which, stage, close = false, addPath) {

            stage = parseInt(stage);
            close = close === "true";

            let quest = this.quests[which];

            quest.stage = stage;

            if(stage === quest.maxStage && quest.completed === false) {
                quest.completed = true;
                StoryParser.upQuestsProgress(1);
                counter++;
            }
            if(addPath) {
                StoryParser.addPath(addPath);
            }
            if(close)
                this.dialogueBox.remove();
            else
                StoryParser.getReference().dialogueBox.getOptions(quest, which);

        }
    }
}
let x = [0,1,2,1,3,3,1,4,1,3,5,3,1,2,1,6,6,7,1];
let counter = 1;
localStorage.clear();
StoryParser.getReference(null);
setTimeout(function(){
    StoryParser.upQuestsProgress(18);
    window.addEventListener("keydown",function(e) {
        if(e.key.toLowerCase() === "e") {
            if (StoryParser.getReference().dialogueBox === null) {
                StoryParser.getReference(new DialogueBox()).getQuest(1);
            }
        }
    })
},200);

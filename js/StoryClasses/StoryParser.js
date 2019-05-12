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
        localStorage.setItem("questsProgress", localStorage.getItem("questsProgress") + value);
    }

    static getReference(box = "default") {
        if(StoryParser.reference === undefined)
            StoryParser.reference = new StoryParser(box);
        else
            if(box !== "default")
                StoryParser.reference.dialogueBox = box;
        return StoryParser.reference;
    };

    constructor(dialogueBox) {

        this.dialogueBox = dialogueBox;

        this.loadQuests = function(obj) {
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
                    obj.quests = quests;
                }

            };
            xobj.send(null);
        };

        this.quests = null;
        this.loadQuests(this);

        this.getQuest = function(npc_id) {

            let i = StoryParser.getQuestsProgress();
            while(this.quests[i].npc_id !== npc_id && i >= 0)
                i--;
            if(i >= 0)
                this.dialogueBox.getOptions(this.quests[i], i);
            else
                this.dialogueBox.remove();

        };

        this.getAnswer = function(which, stage, close = false, prevStage = null) {

            stage = parseInt(stage);
            close = close === "true";

            let quest = this.quests[which];

            quest.stage = stage;
            if(prevStage)
                quest.prevStage += parseInt(prevStage);
            if(stage === quest.maxStage) {
                quest.completed = true;
                StoryParser.upQuestsProgress(1);
            }
            if(close)
                this.dialogueBox.remove();
            else
                StoryParser.getReference().dialogueBox.getOptions(quest, which);

        }
    }
}
localStorage.clear();
StoryParser.getReference(null);
setTimeout(function(){
    StoryParser.upQuestsProgress(1);
    window.addEventListener("keydown",function(e) {
        if(e.key.toLowerCase() === "e") {
            if (StoryParser.getReference().dialogueBox === null) {
                StoryParser.getReference(new DialogueBox()).getQuest(0);
            }
        }
    })
},200);

class Quest {
    constructor(npc_id, texts, answers) {
        this.npc_id = npc_id;
        this.texts = texts;
        this.answers = answers;
        this.stage = 0;
        this.prevStage = 1;
    }
}

class Dialogue {
    constructor(text, answers) {
        this.text = text;
        this.answers = answers;
    }
}

class StoryParser {

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
                        quests[i] = new Quest(i, textsArray[i].texts, textsArray[i].answers);
                    }

                    for(let i = 0; i < textsArray.length; i++)
                        if(localStorage.getItem(`questStages|${i}`) !== null){
                        stagesArray[i] = JSON.parse(localStorage.getItem(`questStages|${i}`));
                        quests[i].stage = stagesArray[i].stage;
                        quests[i].prevStage = stagesArray[i].prevStage;
                    }
                    obj.quests = quests;
                }

            };
            xobj.send(null);
        };

        this.quests = null;
        this.loadQuests(this);

        this.getQuest = function(npc_id) {
            let quest = this.quests[npc_id];
            StoryParser.reference.dialogueBox.getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
        };

        this.getAnswer = function(npc_id, type) {

            type = parseInt(type);

            let quest = this.quests[npc_id];

            if(quest.stage === 0 || quest.stage === 1) {
                if(type === 1) {
                    quest.prevStage = 3;
                    quest.stage = 3;
                    localStorage.setItem(`questStages|${npc_id}`,JSON.stringify({stage: quest.stage, prevStage: quest.prevStage}));
                    StoryParser.reference.dialogueBox.getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
                }
                else if(type === 2) {
                    quest.stage = 1;
                    localStorage.setItem(`questStages|${npc_id}`,JSON.stringify({stage: quest.stage, prevStage: quest.prevStage}));
                    StoryParser.reference.dialogueBox.remove();
                }
                else {
                    quest.stage = 2;
                    localStorage.setItem(`questStages|${npc_id}`,JSON.stringify({stage: quest.stage, prevStage: quest.prevStage}));
                    StoryParser.reference.dialogueBox.getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
                }
            }
            else if(quest.stage === 2) {
                quest.stage = quest.prevStage;
                localStorage.setItem(`questStages|${npc_id}`,JSON.stringify({stage: quest.stage, prevStage: quest.prevStage}));
                StoryParser.reference.dialogueBox.getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
            }
            else if(quest.stage === 3) {
                quest.stage = 2;
                localStorage.setItem(`questStages|${npc_id}`,JSON.stringify({stage: quest.stage, prevStage: quest.prevStage}));
                StoryParser.reference.dialogueBox.getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
            }
            else if(quest.stage === 4) {
                quest.stage = 5;
                localStorage.setItem(`questStages|${npc_id}`,JSON.stringify({stage: quest.stage, prevStage: quest.prevStage}));
                StoryParser.reference.dialogueBox.remove();
            }
        }
    }
}
StoryParser.getReference(null);
localStorage.clear();
setTimeout(function(){
    window.addEventListener("keydown",function(e) {
        if(e.key.toLowerCase() === "e") {
            if (StoryParser.getReference().dialogueBox === null) {
                StoryParser.getReference(new DialogueBox()).getQuest(0);
            }
        }
    })
},200);

class Quest {
    constructor(npc_id, texts, answers) {
        this.npc_id = npc_id;
        this.texts = texts;
        this.answers = answers;
        this.stage = 1;
        this.prevStage = 2;
    }
}

class Dialogue {
    constructor(text, answers) {
        this.text = text;
        this.answers = answers;
    }
}

class StoryParser {
    constructor() {
        if(StoryParser.selfReference !== null)
            return StoryParser.selfReference;
        StoryParser.selfReference = this;
        this.loadQuests = function() {
            let xobj = new XMLHttpRequest();
            xobj.overrideMimeType("application/json");
            xobj.open('GET', 'quests.json', true);
            xobj.onreadystatechange = function () {
                if (xobj.readyState === 4 && xobj.status == "200") {
                    console.log(JSON.parse(xobj.responseText));
                    return JSON.parse(xobj.responseText);
                }
            };
            xobj.send(null);
        };

        this.quests = this.loadQuests();

        this.getQuest = function(npc_id) {

            let quest = StoryParser.selfReference.quests[npc_id];
            getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
        };

        this.getAnswer = function(npc_id, type) {

            let quest = StoryParser.selfReference.quests[npc_id];
            if(quest.stage === 0 && quest.stage === 1) {
                if(type === 1) {
                    quest.prevStage = 3;
                    quest.stage = 3;
                    getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
                }
                else if(type === 2) {
                    quest.stage = 1;
                }
                else {
                    quest.stage = 2;
                    getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
                }
            }
            else if(quest.stage === 2) {
                quest.stage = quest.prevStage;
                getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
            }
            else if(quest.stage === 3) {
                quest.stage = 2;
                getOptions(npc_id, new Dialogue(quest.texts[quest.stage], quest.answers[quest.stage]));
            }
            else if(quest.stage === 4) {
                quest.stage = 5;
            }
        }
    }
}
StoryParser.selfReference = null;
new StoryParser().loadQuests();
const Alexa = require("ask-sdk");
const https = require("https");
const mqtt = require ("mqtt");

const invocationName = "bpa projekt";

function getMemoryAttributes() {   const memoryAttributes = {
       "history":[],

        // The remaining attributes will be useful after DynamoDB persistence is configured
       "launchCount":0,
       "lastUseTimestamp":0,

       "lastSpeechOutput":{},
       "nextIntent":[]
   };
   return memoryAttributes;
};

const maxHistorySize = 20; // remember only latest 20 intents 

// 1. Intent Handlers =============================================

const AMAZON_FallbackIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.FallbackIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let previousSpeech = getPreviousSpeechOutput(sessionAttributes);

        return responseBuilder
            .speak('Sorry I didnt catch what you said, ' + stripSpeak(previousSpeech.outputSpeech))
            .reprompt(stripSpeak(previousSpeech.reprompt))
            .getResponse();
    },
};

const AMAZON_CancelIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.CancelIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Okay, wir reden dann später! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_HelpIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.HelpIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let intents = getCustomIntents();
        let sampleIntent = randomElement(intents);

        let say = 'You asked for help. '; 

        say += ' Here something you can ask me, ' + getSampleUtterance(sampleIntent);

        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const AMAZON_StopIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.StopIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();


        let say = 'Okay. Bis bald! ';

        return responseBuilder
            .speak(say)
            .withShouldEndSession(true)
            .getResponse();
    },
};

const AMAZON_NavigateHomeIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'AMAZON.NavigateHomeIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        let say = 'Hello from AMAZON.NavigateHomeIntent. ';


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .getResponse();
    },
};

const CreatUserIntent_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'IntentRequest' && request.intent.name === 'CreatUserIntent' ;
    },
    handle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        const responseBuilder = handlerInput.responseBuilder;
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes();

        // delegate to Alexa to collect all the required slots 
        const currentIntent = request.intent; 
        if (request.dialogState && request.dialogState !== 'COMPLETED') { 
            return handlerInput.responseBuilder
                .addDelegateDirective(currentIntent)
                .getResponse();

        } 
        let say = 'Super! Du bist angemeldet. ';

        let slotStatus = '';
        let resolvedSlot;

        let slotValues = getSlotValues(request.intent.slots); 
        // getSlotValues returns .heardAs, .resolved, and .isValidated for each slot, according to request slot status codes ER_SUCCESS_MATCH, ER_SUCCESS_NO_MATCH, or traditional simple request slot without resolutions

        // console.log('***** slotValues: ' +  JSON.stringify(slotValues, null, 2));
        //   SLOT: Username 
        if (slotValues.Username.heardAs) {
            slotStatus += 'Dein Benutzername lautet ' + slotValues.Username.heardAs + '. ';
        } else {
            slotStatus += 'slot Username is empty. ';
        }
        if (slotValues.Username.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.Username.resolved !== slotValues.Username.heardAs) {
                slotStatus += 'synonym for ' + slotValues.Username.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.Username.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.Username.heardAs + '" to the custom slot type used by slot Username! '); 
        }

        if( (slotValues.Username.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.Username.heardAs) ) {
            slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('CreatUserIntent','Username'), 'or');
        }
        //   SLOT: Userage 
        if (slotValues.Userage.heardAs) {
            slotStatus += 'Dein Alter ist ' + slotValues.Userage.heardAs + ' Jahre. ';
        } else {
            slotStatus += 'slot Userage is empty. ';
        }
        if (slotValues.Userage.ERstatus === 'ER_SUCCESS_MATCH') {
            slotStatus += 'a valid ';
            if(slotValues.Userage.resolved !== slotValues.Userage.heardAs) {
                slotStatus += 'synonym for ' + slotValues.Userage.resolved + '. '; 
                } else {
                slotStatus += 'match. '
            } // else {
                //
        }
        if (slotValues.Userage.ERstatus === 'ER_SUCCESS_NO_MATCH') {
            slotStatus += 'which did not match any slot value. ';
            console.log('***** consider adding "' + slotValues.Userage.heardAs + '" to the custom slot type used by slot Userage! '); 
        }
        if( (slotValues.Userage.ERstatus === 'ER_SUCCESS_NO_MATCH') ||  (!slotValues.Userage.heardAs) ) {
            slotStatus += 'A few valid values are, ' + sayArray(getExampleSlotValues('CreatUserIntent','Userage'), 'or');
        }
        
        var userName = slotValues.Username.heardAs;
        var userAge = slotValues.Userage.heardAs;

        sendData(userName, userAge);


        say += slotStatus;
        let say1 = 'Was kann ich noch für Sie tun?';
        say += say1;

        return responseBuilder
            .speak(say)
            .reprompt('Sorry, ich habe dich nicht verstanden, versuchen Sie noch mal. ' + say1)
            .getResponse();
    },
};

const LaunchRequest_Handler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const responseBuilder = handlerInput.responseBuilder;

        let say = 'Willkommen beim Quizspiel Eins, Zwei oder Drei. Was kann ich für Sie tun?';

        let skillTitle = capitalize(invocationName);


        return responseBuilder
            .speak(say)
            .reprompt('try again, ' + say)
            .withStandardCard('Quizspiel 1, 2 oder 3!', 
              'Hallo!\nDies ist ein Alexa Skill für das Spiel "1, 2 oder 3", die im ZDFtivi, KiKA und okidoki auf ORF eins (bis 2006 auch SF) ausgestrahlt wird. Der Skillname ist ' + skillTitle,
               welcomeCardImg.smallImageUrl, welcomeCardImg.largeImageUrl)
            .getResponse();
    },
};

const SessionEndedHandler =  {
    canHandle(handlerInput) {
        const request = handlerInput.requestEnvelope.request;
        return request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`Session ended with reason: ${handlerInput.requestEnvelope.request.reason}`);
        return handlerInput.responseBuilder.getResponse();
    }
};

const ErrorHandler =  {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const request = handlerInput.requestEnvelope.request;

        console.log(`Error handled: ${error.message}`);
        // console.log(`Original Request was: ${JSON.stringify(request, null, 2)}`);

        return handlerInput.responseBuilder
            .speak('Fehler! Ich habe es nicht verstehen können.  Bitte sagen Sie noch mal.')
            .reprompt('Fehler! Ich habe es nicht verstehen können.  Bitte sagen Sie noch mal')
            .getResponse();
    }
};


// 2. Constants ===========================================================================

    // Here you can define static data, to be used elsewhere in your code.  For example: 
    //    const myString = "Hello World";
    //    const myArray  = [ "orange", "grape", "strawberry" ];
    //    const myObject = { "city": "Boston",  "state":"Massachusetts" };


// 3.  Helper Functions ===================================================================

function sendData (userName, userAge) {
     
    var client  = mqtt.connect('mqtt://34.230.40.176'); //Brocker ip
    client.on('connect', function () {
      client.subscribe('SendPlayerData'); //Topic name 
      console.log('client has subscribed successfully');
    });
    
    var current_time = (new Date).getTime();
    var userName; 
    var userAge;
    
    var json = {
        type : "sign_up",
        time : current_time,
        username : userName,
        userage : userAge
    };
    var str = JSON.stringify(json);
    console.log(str);
    client.on('connect', function(){
      client.publish('SendPlayerData', str);
      client.end();
    });
  }

function capitalize(myString) {

     return myString.replace(/(?:^|\s)\S/g, function(a) { return a.toUpperCase(); }) ;
}

 
function randomElement(myArray) { 
    return(myArray[Math.floor(Math.random() * myArray.length)]); 
} 
 
function stripSpeak(str) { 
    return(str.replace('<speak>', '').replace('</speak>', '')); 
}  
 
function getSlotValues(filledSlots) { 
    const slotValues = {}; 
 
    Object.keys(filledSlots).forEach((item) => { 
        const name  = filledSlots[item].name; 
 
        if (filledSlots[item] && 
            filledSlots[item].resolutions && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0] && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status && 
            filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
            switch (filledSlots[item].resolutions.resolutionsPerAuthority[0].status.code) { 
                case 'ER_SUCCESS_MATCH': 
                    slotValues[name] = { 
                        heardAs: filledSlots[item].value, 
                        resolved: filledSlots[item].resolutions.resolutionsPerAuthority[0].values[0].value.name, 
                        ERstatus: 'ER_SUCCESS_MATCH' 
                    }; 
                    break; 
                case 'ER_SUCCESS_NO_MATCH': 
                    slotValues[name] = { 
                        heardAs: filledSlots[item].value, 
                        resolved: '', 
                        ERstatus: 'ER_SUCCESS_NO_MATCH' 
                    }; 
                    break; 
                default: 
                    break; 
            } 
        } else { 
            slotValues[name] = { 
                heardAs: filledSlots[item].value, 
                resolved: '', 
                ERstatus: '' 
            }; 
        } 
    }, this); 
 
    return slotValues; 
} 
 
function getExampleSlotValues(intentName, slotName) { 
 
    let examples = []; 
    let slotType = ''; 
    let slotValuesFull = []; 
 
    let intents = model.interactionModel.languageModel.intents; 
    for (let i = 0; i < intents.length; i++) { 
        if (intents[i].name == intentName) { 
            let slots = intents[i].slots; 
            for (let j = 0; j < slots.length; j++) { 
                if (slots[j].name === slotName) { 
                    slotType = slots[j].type; 
 
                } 
            } 
        } 
         
    } 
    let types = model.interactionModel.languageModel.types; 
    for (let i = 0; i < types.length; i++) { 
        if (types[i].name === slotType) { 
            slotValuesFull = types[i].values; 
        } 
    } 
 
 
    examples.push(slotValuesFull[0].name.value); 
    examples.push(slotValuesFull[1].name.value); 
    if (slotValuesFull.length > 2) { 
        examples.push(slotValuesFull[2].name.value); 
    } 
 
 
    return examples; 
} 
 
function sayArray(myData, penultimateWord = 'and') { 
    let result = ''; 
 
    myData.forEach(function(element, index, arr) { 
 
        if (index === 0) { 
            result = element; 
        } else if (index === myData.length - 1) { 
            result += ` ${penultimateWord} ${element}`; 
        } else { 
            result += `, ${element}`; 
        } 
    }); 
    return result; 
} 
function supportsDisplay(handlerInput) // returns true if the skill is running on a device with a display (Echo Show, Echo Spot, etc.) 
{                                      //  Enable your skill for display as shown here: https://alexa.design/enabledisplay 
    const hasDisplay = 
        handlerInput.requestEnvelope.context && 
        handlerInput.requestEnvelope.context.System && 
        handlerInput.requestEnvelope.context.System.device && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces && 
        handlerInput.requestEnvelope.context.System.device.supportedInterfaces.Display; 
 
    return hasDisplay; 
} 
 
 
const welcomeCardImg = { 
    smallImageUrl: "https://www.webertainment.de/images/screens/original/11312086427.jpg", 
    largeImageUrl: "https://www.webertainment.de/images/screens/original/11312086427.jpg" 
 
}; 
 
function getCustomIntents() { 
    const modelIntents = model.interactionModel.languageModel.intents; 
 
    let customIntents = []; 
 
 
    for (let i = 0; i < modelIntents.length; i++) { 
 
        if(modelIntents[i].name.substring(0,7) != "AMAZON." && modelIntents[i].name !== "LaunchRequest" ) { 
            customIntents.push(modelIntents[i]); 
        } 
    } 
    return customIntents; 
} 
 
function getSampleUtterance(intent) { 
 
    return randomElement(intent.samples); 
 
} 
 
function getPreviousSpeechOutput(attrs) { 
 
    if (attrs.lastSpeechOutput && attrs.history.length > 1) { 
        return attrs.lastSpeechOutput; 
 
    } else { 
        return false; 
    } 
 
} 
 
const InitMemoryAttributesInterceptor = { 
    process(handlerInput) { 
        let sessionAttributes = {}; 
        if(handlerInput.requestEnvelope.session['new']) { 
 
            sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
            let memoryAttributes = getMemoryAttributes(); 
 
            if(Object.keys(sessionAttributes).length === 0) { 
 
                Object.keys(memoryAttributes).forEach(function(key) {  // initialize all attributes from global list 
 
                    sessionAttributes[key] = memoryAttributes[key]; 
 
                }); 
 
            } 
            handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
 
        } 
    } 
}; 
 
const RequestHistoryInterceptor = { 
    process(handlerInput) { 
 
        const thisRequest = handlerInput.requestEnvelope.request; 
        let sessionAttributes = handlerInput.attributesManager.getSessionAttributes(); 
 
        let history = sessionAttributes['history'] || []; 
 
        let IntentRequest = {}; 
        if (thisRequest.type === 'IntentRequest' ) { 
 
            let slots = []; 
 
            IntentRequest = { 
                'IntentRequest' : thisRequest.intent.name 
            }; 
 
            if (thisRequest.intent.slots) { 
 
                for (let slot in thisRequest.intent.slots) { 
                    let slotObj = {}; 
                    slotObj[slot] = thisRequest.intent.slots[slot].value; 
                    slots.push(slotObj); 
                } 
 
                IntentRequest = { 
                    'IntentRequest' : thisRequest.intent.name, 
                    'slots' : slots 
                }; 
 
            } 
 
        } else { 
            IntentRequest = {'IntentRequest' : thisRequest.type}; 
        } 
        if(history.length > maxHistorySize - 1) { 
            history.shift(); 
        } 
        history.push(IntentRequest); 
 
        handlerInput.attributesManager.setSessionAttributes(sessionAttributes); 
 
    } 
 
}; 
 
// 4. Exports handler function and setup ===================================================
const skillBuilder = Alexa.SkillBuilders.standard();
exports.handler = skillBuilder
    .addRequestHandlers(
        AMAZON_FallbackIntent_Handler, 
        AMAZON_CancelIntent_Handler, 
        AMAZON_HelpIntent_Handler, 
        AMAZON_StopIntent_Handler, 
        AMAZON_NavigateHomeIntent_Handler, 
        CreatUserIntent_Handler, 
        LaunchRequest_Handler, 
        SessionEndedHandler
    )
    .addErrorHandlers(ErrorHandler)
    .addRequestInterceptors(InitMemoryAttributesInterceptor)
    .addRequestInterceptors(RequestHistoryInterceptor)

    .lambda();

// End of Skill code -------------------------------------------------------------
// Static Language Model for reference

const model = {
  "interactionModel": {
    "languageModel": {
      "invocationName": "bpa projekt",
      "intents": [
        {
          "name": "AMAZON.FallbackIntent",
          "samples": []
        },
        {
          "name": "AMAZON.CancelIntent",
          "samples": []
        },
        {
          "name": "AMAZON.HelpIntent",
          "samples": []
        },
        {
          "name": "AMAZON.StopIntent",
          "samples": []
        },
        {
          "name": "AMAZON.NavigateHomeIntent",
          "samples": []
        },
        {
          "name": "CreatUserIntent",
          "slots": [
            {
              "name": "Username",
              "type": "AMAZON.SearchQuery",
              "samples": [
                "Ich heiße {Username}",
                "Der Nutzername ist {Username}",
                "Der Nutzername lautet {Username}",
                "Mein Name lautet {Username}",
                "Ich bin {Username}",
                "{Username}"
              ]
            },
            {
              "name": "Userage",
              "type": "AMAZON.NUMBER",
              "samples": [
                "{Userage}",
                "Ich bin {Userage}"
              ]
            }
          ],
          "samples": [
            "ich brauche einen Benutzername",
            "erstelle einen neuen Benutzer",
            "ich brauche eine Benutzername",
            "Ich möchte mich registrieren",
            "Ich möchte mich anmelden"
          ]
        },
        {
          "name": "LaunchRequest"
        }
      ],
      "types": []
    },
    "dialog": {
      "intents": [
        {
          "name": "CreatUserIntent",
          "confirmationRequired": false,
          "prompts": {},
          "slots": [
            {
              "name": "Username",
              "type": "AMAZON.SearchQuery",
              "confirmationRequired": false,
              "elicitationRequired": true,
              "prompts": {
                "elicitation": "Elicit.Slot.192563791835.1498884520022"
              }
            },
            {
              "name": "Userage",
              "type": "AMAZON.NUMBER",
              "confirmationRequired": false,
              "elicitationRequired": true,
              "prompts": {
                "elicitation": "Elicit.Slot.192563791835.827857667954"
              }
            }
          ]
        }
      ],
      "delegationStrategy": "ALWAYS"
    },
    "prompts": [
      {
        "id": "Elicit.Slot.192563791835.827857667954",
        "variations": [
          {
            "type": "PlainText",
            "value": "Wie alt bist du?"
          }
        ]
      },
      {
        "id": "Elicit.Slot.192563791835.1498884520022",
        "variations": [
          {
            "type": "PlainText",
            "value": "Wie lautet dein Benutzername?"
          },
          {
            "type": "PlainText",
            "value": "Wie ist dein Name?"
          },
          {
            "type": "PlainText",
            "value": "Wie heißt du?"
          }
        ]
      },
      {
        "id": "Confirm.Slot.496353064623.993877206541",
        "variations": [
            {
                "type": "PlainText",
                "value": "{Username}, ist das richtig?"
            },
            {
                "type": "PlainText",
                "value": "Dein Name habe ich als {Username} erkannt, korrekt?"
            }
        ]
      },
      {
        "id": "Confirm.Slot.496353064623.1229072626099",
        "variations": [
            {
                "type": "PlainText",
                "value": "{Username}, du bist {Userage} Jahre alt, korrekt?"
            },
            {
                "type": "PlainText",
                "value": "{Username} , ich habe dein Alter als {Userage} erkannt, korrekt?"
            }
        ]
      }
    ]
  }
};

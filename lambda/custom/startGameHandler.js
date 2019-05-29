const https = require('https');
const TestDaten = require('./TestDatena')
const language = require('./language');

exports.StartGameHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'StartGameIntent';
    },
    async handle(handlerInput) {
        const filledSlots = handlerInput.requestEnvelope.request.intent.slots;
        const NumberOfQuestions = filledSlots.NumberofQuestions.value;

        if (typeof NumberOfQuestions === 'undefined' || NumberOfQuestions === '?' || NumberOfQuestions < 1) {
            NumberOfQuestions = 5;
        }

        // const data = await getRecords(NumberOfQuestions);
        
        let speechText;
        let letters = ['A','B','C']
        speechText = language.deData.translation.START_MESSAGE + '<break time=".5s"/>';
        for (let i = 0; i < NumberOfQuestions; i++) {
            speechText += 'Frage ' + (i + 1) + '<break time=".2s"/>' + TestDaten.TestDaten[i].Question + '?';
            for (let j = 0; j < 3; j++) {
                speechText += '<break time=".4s"/>'+ letters[j] + '<break time=".2s"/>' + TestDaten.TestDaten[i].Answers[j];
            }
            speechText += '<break time=".8s"/>';
        }

        speechText += language.deData.translation.CLOSE_MESSAGE;

        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};

function getRecords(recType, ticketNumbers, timespan) {
    const hdrAuth = "Bearer " // + accessToken;
    let sort = 'DESC';

    if (timespan === "ältesten" || timespan === "älteste" || timespan === "spätesten" || timespan === "spätesteste") {
        sort = 'ASC';
    }

    return new Promise(((resolve, reject) => {
        const serviceNowInstance = constants.servicenow.instance;

        const options = {
            hostname: serviceNowInstance,
            port: 443,
            path: '/api/now/table/' + recType + '?sysparm_query=ORDERBY' + sort + 'sys_updated_on&sysparm_limit=' + ticketNumbers,
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                Authorization: hdrAuth
            }
        };

        const request = https.request(options, (response) => {
            response.setEncoding('utf8');
            let returnData = '';

            if (response.statusCode < 200 || response.statusCode >= 300) {
                return reject(new Error(`${response.statusCode}: ${response.req.getHeader('host')} ${response.req.path}`));
            }

            response.on('data', (chunk) => {
                returnData += chunk;
            });

            response.on('end', () => {
                resolve(JSON.parse(returnData));
            });

            response.on('error', (error) => {
                reject(error);
            });
        });
        request.end();
    }));
}
const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const dialogflow = require('dialogflow');

const uuidv4 = require('uuid/v4');

var sessions = {};

const piadinaTypes = [
  'normale',
  'integrale',
  'di farro',
  'ai 5 cereali'
];
const piadinaCondiment1 = [
  'salame tipo Milano',
  'salame nostrano',
  'prosciutto',
  'lonza',
  'mortadella',
  'fesa di tacchino'
];
const piadinaCondiment2 = [
  'pecorino',
  'caciotta',
  'Emmenthal',
  'gorgonzola',
  'fontina',
  'mozzarella',
  'stracchino',
  'squaquerone'
];
const piadinaCondiment3 = [
  'pomodoro',
  'rucola',
  'insalata condita',
  'melanzane grigliate',
  'verdure grigliate'
];
const piadinaComponents = [ piadinaTypes, piadinaCondiment1, piadinaCondiment2, piadinaCondiment3 ];

function printPiadina(piadinaExpression) {
  if(piadinaExpression.length != 4)
    throw "Piadina expression must have length 4";
    
  const result = piadinaExpression.split('').map((c, index) => {
    const components = piadinaComponents[index];
    var cIndex = parseInt(c, 10);
    
    // If no valid character for first value, default to 1
    if(isNaN(cIndex) && index == 0) {
      cIndex = 1;
    }
    
    // Return null for invalid characters, will get filtered by filter() below
    if(isNaN(cIndex)) {
      return null;
    }
    
    return components[(cIndex - 1) % components.length];
  }).filter(ele => ele != null);
  
  return 'Piadina ' + result[0] + ' con ' + result.slice(1, result.length - 1).join(', ') + ' e ' + result[result.length - 1];
}

app.get('/', (req, res) => {
  res.type('text/plain').send('Hello piadina! 🌮');
});

app.get('/piadina/:code', (req, res) => {
  if(!req.params.code || req.params.code.length != 4) {
    res.status(400).send("Piadina code must be 4 characters long");
  }
  else {
    res.type('text/plain').send(printPiadina(req.params.code));
  }
});

app.post('/send', async (req, res) => {
  console.log('Received text: ' + req.query.text);
  
  const sessionId = (req.query.sessionId && req.query.sessionId.match(/^[0-9A-F]{8}-[0-9A-F]{4}-[4][0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)) ? req.query.sessionId : uuidv4();
  console.log('Session ID: ' + sessionId);
  
  res.header('Access-Control-Allow-Origin', '*');
  
  const inputText = req.query.text;
  if(inputText) {
    const sessionClient = new dialogflow.SessionsClient();
    const sessionPath = sessionClient.sessionPath(process.env.GOOGLEFLOW_PROJECT_ID, sessionId);
    
    const request = {
      session: sessionPath,
      queryInput: {
        text: {
          text: inputText,
          languageCode: 'it-IT',
        },
      },
    };
    
    console.log('Detecting intent...');
    
    const responses = (await sessionClient.detectIntent(request)).filter(r => r != null);
    console.log('Responses: ' + JSON.stringify(responses));
    if(responses.length <= 0) {
      res.status(500).type('text/plain').send("Whops, no DialogFlow responses");
      return;
    }
    
    const responseTexts = responses[0].queryResult.fulfillmentMessages.filter(ele => ele.platform == 'PLATFORM_UNSPECIFIED');
    if(responseTexts.length <= 0) {
      res.status(500).type('text/plain').send("Whops, no fulfillment messages");
      return;
    }
    
    const texts = responseTexts[0].text.text;
    const pickedText = texts[Math.floor(Math.random() * texts.length)];

    res.status(200).type('application/json').send({
      sessionId: sessionId,
      text: pickedText
    });
  }
  else {
    res.status(400).send('Text query string parameter needed');
  }
});

app.post('/webhook', (req, res) => {
  console.log('Webhook contents: ' + JSON.stringify(req.body));
  
  const sessionId = req.body.session.substring(req.body.session.lastIndexOf('/') + 1);
  const sessionData = sessions[sessionId] || {};
  console.log('Session data: ' + JSON.stringify(sessionData));
  
  sessionData.lastCall = Date.now();
  sessions[sessionId] = sessionData;
  
  res.type('application/json').send({
    'fulfillment_text': 'Questa è la risposta del bot'
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

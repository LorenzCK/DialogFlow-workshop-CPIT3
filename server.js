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

function newPiadina() {
  var piadina = '';
  for(var i = 0; i < 4; ++i) {
    piadina += Math.floor(Math.random() * 9.0) + 1;
  }
  console.log('Piadina: ' + piadina);
  return piadina;
}

function piadinaExpressionToComponents(piadinaExpression) {
  if(piadinaExpression.length != 4)
    throw "Piadina expression must have length 4";
  
  return piadinaExpression.split('').map((c, index) => {
    const components = piadinaComponents[index];
    var cIndex = parseInt(c, 10);
    
    // If no valid character for first value, default to 1
    if(isNaN(cIndex) && index == 0) {
      cIndex = 1;
    }
    
    // Return null for invalid characters, will get eventually filtered
    if(isNaN(cIndex)) {
      return null;
    }
    
    return components[(cIndex - 1) % components.length];
  });
}

function isPiadinaCompatible(piadinaExpression, sessionData) {
  const components = piadinaExpressionToComponents(piadinaExpression);
  console.log('Piadina ' + piadinaExpression + ' = components: ' + JSON.stringify(components));
  
  const result = !(components.some(ele => ele == sessionData.prohibit));
  
  console.log('Piadina ' + piadinaExpression + ' compatible: ' + result + ' with session data: ' + JSON.stringify(sessionData));
  
  return result;
}

function printPiadina(piadinaExpression) {
  const result = piadinaExpressionToComponents(piadinaExpression).filter(ele => ele != null);
  
  return 'Piadina ' + result[0] + ' con ' + result.slice(1, result.length - 1).join(', ') + ' e ' + result[result.length - 1];
}

function processIntent(req, sessionData) {
  if(req.body.queryResult.intent.name) {
    switch(req.body.queryResult.intent.name) {
      case 'projects/newagent-yoreuj/agent/intents/220a900f-2ddc-4be4-81fd-5c9b1770fb15':
        // Genera piadina
        do {
          var p = newPiadina();
        }
        while(!isPiadinaCompatible(p, sessionData));
        
        sessionData.lastPiadina = p;
          
        return 'Che ne dici di questa: ' + printPiadina(p) + '?';
        break;
        
      case 'projects/newagent-yoreuj/agent/intents/f81c8af0-d4d7-473c-a303-bee885ba1082':
        // DoNotLike intent
        if(req.body.queryResult.parameters.Condiment) {
          const prohibitedCondiment = req.body.queryResult.parameters.Condiment;
          sessionData.prohibit = prohibitedCondiment;
          
          return 'OK, niente ' + prohibitedCondiment + ' per te!';
        }
        else {
          return 'Non ho capito cosa non ti piace.';
        }
        break;
        
      case 'projects/newagent-yoreuj/agent/intents/bcc775a0-3cbe-45ac-88fe-d83bacc646fd':
        // Do like
        return 'Benissimo, mi fa piacere! 👌';
        break;
        
      case 'projects/newagent-yoreuj/agent/intents/fdfee888-c0b3-4dc8-808c-ab41938f7d41':
        // Do not like
        return 'Mi dispiace. 😔';
    }
  }
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
  
  const responseText = processIntent(req, sessionData);
  console.log('Intent ' + req.body.queryResult.intent.name + ' => text: ' + responseText);
  
  sessionData.lastCall = Date.now();
  sessions[sessionId] = sessionData;
  
  res.type('application/json').send({
    'fulfillment_text': responseText
  });
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

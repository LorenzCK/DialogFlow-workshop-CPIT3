const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.json());

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
    return components[parseInt(c, 10) % components.length];
  });
  
  return 'Piadina ' + result[0] + ' con ' + result.slice(1, result.length - 1).join(', ') + ' e ' + result[result.length - 1];
}

app.get('/', (req, res) => {
  res.type('text/plain').send(printPiadina('1234'));
});

app.post('/send', (req, res) => {
  console.log('Received text: ' + req.query.text);
  
  res.header('Access-Control-Allow-Origin', '*');
  
  const inputText = req.query.text;
  if(inputText) {
    res.type('text/plain').send("Ciao Gianma, hai scritto: " + inputText + "!");
  }
  else {
    res.type('text/plain').send("Ciao Gianma!");
  }
});

app.post('/webhook', (req, res) => {
  console.log('Webhook contents: ' + JSON.stringify(req.body));
  
  const sessionId = req.body.session.substring(req.body.session.lastIndexOf('/') + 1);
  const sessionData = sessions[sessionId] || {};
  console.log('Session data: ' + JSON.stringify(sessionData));
  
  sessionData.lastCall = Date.now();
  sessions[sessionId] = sessionData;
});

// listen for requests :)
const listener = app.listen(process.env.PORT, function() {
  console.log('Your app is listening on port ' + listener.address().port);
});

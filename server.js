const WebSocketServer = require('ws').Server,
  express = require('express'),
  https = require('https'),
  app = express(),
  fs = require('fs');

const pkey = fs.readFileSync('./ssl/key.pem'),
  pcert = fs.readFileSync('./ssl/cert.pem'),
  options = {key: pkey, cert: pcert, passphrase: '123456789'};
var wss = null, sslSrv = null;
 
// use express static to deliver resources HTML, CSS, JS, etc)
// from the public folder 
app.use(express.static('public'));

app.use(function(req, res, next) {
  if(req.headers['x-forwarded-proto']==='http') {
    return res.redirect(['https://', req.get('Host'), req.url].join(''));
  }
  next();
});

sslSrv = https.createServer(options, app).listen(8008);
console.log("The HTTPS server is up and running");

// create the WebSocket server
wss = new WebSocketServer({server: sslSrv});
console.log("WebSocket Secure server is up and running.");

/** successful connection */
wss.on('connection', function (wcs) {
  console.log("A new WebSocket client was connected.");
  // my code here
  wcs.on('message', function(message){
    message = JSON.parse(message);
    
    console.log("Received: "+message);

    if(message.type == "info"){
      wcs.ClientName = message.Name;
      wcs.ClientRoom = message.Room;
      console.log("Client: "+wcs.ClientName+" connected. Room:"+wcs.ClientRoom);
    }

    if(message.sdp){
      // console.log("sdp message working");
      // broadcast to the clients connected to the same room
      wss.clients.forEach(function e(client) {
        if(client != wcs && wcs.ClientRoom == client.ClientRoom) client.send(JSON.stringify({"sdp": message.sdp}));
      });  
    }

    if(message.candidate){
      // console.log("candidate message working");
      // broadcast to the clients connected to the same room
      wss.clients.forEach(function e(client) {
        if(client != wcs && wcs.ClientRoom == client.ClientRoom) client.send(JSON.stringify({"candidate": message.candidate}));
      });  
    }

    if(message.closeConnection){
      // console.log("candidate message working");
      // broadcast to the clients connected to the same room
      wss.clients.forEach(function e(client) {
        if(wcs.ClientRoom == client.ClientRoom) client.send(JSON.stringify({"closeConnection": message.closeConnection}));
      });  
    }

  });
});
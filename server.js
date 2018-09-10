// server.js
// where your node app starts

// init project
var express = require('express');
var app = express();
var server = require('http').createServer(app)
var io = require('socket.io')(server)

var redis_client = require('redis').createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

var zeros = require("zeros")
var savePixels = require('save-pixels')

const SIZE = 900 / 15 

var image = new Uint32Array(SIZE * SIZE)
image.fill(0xffffff, 0, SIZE * SIZE)

redis_client.get('history3', function (err, reply) {
  console.log(err)
  if(reply) {
    image = new Uint32Array(JSON.parse(reply))
  }
})

// we've started you off with Express, 
// but feel free to use whatever libs or frameworks you'd like through `package.json`.

// http://expressjs.com/en/starter/static-files.html
app.use('/build', express.static('build'));
app.use('/assets', express.static('assets'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/index.html');
});

app.get('/image', (request, response) => {
  var arr = zeros([SIZE, SIZE, 3])
  image.forEach((element, id) => {
    const i = id % SIZE
    const j = Math.floor(id / SIZE)
    for(var c=0; c<3; c++) {
      arr.set(i, j, c, (element >> 8*(2-c)) & 0xFF)
    }
  })
  savePixels(arr, 'png').pipe(response);
});

app.get('/reset', (request, response) => {
  image.fill(0xffffff, 0, SIZE * SIZE)
  io.emit('image', image)
  response.end();
})

app.get('/save', (request, response) => {
  redis_client.set('history3', JSON.stringify(Array.from(image)))
  response.end();
})

io.on('connection', function(socket){

  console.log('user connected')
  socket.emit('image', Array.from(image))

  socket.on('color', (event) => {
    image[event.i + event.j * SIZE] = event.color
    io.emit('newPaint', event)
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })
})

// listen for requests :)
const listener = server.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});

process.on('SIGTERM', () => {
  console.log('Saving history')
  redis_client.set('history2', JSON.stringify(Array.from(image)))
  console.log('History saved')
  server.close.bind(server)
})
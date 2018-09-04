const express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io')(server)
var redis_client = require('redis').createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

// const ndarray = require('ndarray')
const zeros = require('zeros')
const savePixels = require('save-pixels')

const SIZE   = 20
const GRID   = 20
const RATIO  = SIZE / GRID

var colorHistory = []
var image = zeros([SIZE, SIZE, 3], 'uint8')
for(var i=0; i<SIZE; i++) {
  for(var j=0; j<SIZE; j++) {
    for(var c=0; c<3; c++){
      image.set(i, j, c, 0xFF)
    }
  }
}

const saveEvent = (event) => {
  const color = event.color.match(/\d+/g)
  for(var k=0; k<RATIO; k++) {
    for(var l=0; l<RATIO; l++) {
      for(var c=0; c<3; c++){
        image.set(event.i*RATIO+k, event.j*RATIO+l, c, color[c])
      }
    }
  }
}

redis_client.get('history', function (err, reply) {
  console.log(err)
  if(reply) {
    colorHistory = JSON.parse(reply)
    colorHistory.forEach(event => saveEvent(event))
  }
})

io.on('connection', function(socket){

  if(colorHistory.length){
    io.emit('history', colorHistory)
  }

  socket.on('color', (event) => {
    colorHistory.push(event)
    saveEvent(event)
    io.emit('newPaint', event)
  })

  socket.on('disconnect', () => {
    console.log('user disconnected')
  })

})

app.use(express.static('public'))

app.get('/image', (request, response) => {
  savePixels(image, 'png').pipe(response)
})

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000')
})

process.on('SIGTERM', () => {
  console.log('Saving history')
  redis_client.set('history', JSON.stringify(colorHistory))
  console.log('History saved')
  server.close.bind(server)
})

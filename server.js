const express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io')(server)
var redis_client = require('redis').createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

// const ndarray = require('ndarray')
const zeros = require('zeros')
const savePixels = require('save-pixels')

const SIZE   = 20

var colorHistory = []
var image = zeros([300, 300, 3], 'uint8')
for(var i=0; i<300; i++) {
  for(var j=0; j<300; j++) {
    for(var c=0; c<3; c++){
      image.set(i, j, 0, 0xFF)
    }
  }
}

const saveEvent = (event) => {
  const color = event.color.match(/\d+/g)
  for(var k=0; k<300/SIZE; j++) {
    for(var l=0; l<300/SIZE; j++) {
      for(var c=0; c<3; c++){
        image.set(event.i+k, event.j+l, c, color[c])
      }
    }
  }
  image.set(event.i, event.j, 0, color[0])
  image.set(event.i, event.j, 1, color[1])
  image.set(event.i, event.j, 2, color[2])
}

redis_client.get('history', function (err, reply) {
  console.log(err)
  if(reply) {
    colorHistory = JSON.parse(reply)
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

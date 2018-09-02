const express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io')(server)

var zeros = require('zeros')
var savePixels = require('save-pixels')

var colorHistory = [];
io.on('connection', function(socket){

  if (colorHistory.length){
    colorHistory.forEach(function(color){
      io.emit('newPaint', color)
    })
  }

  socket.on('color', function(event){
    colorHistory.push(event)
    io.emit('newPaint', event)
  })

  socket.on('disconnect', function(){
    console.log('user disconnected')
  })
})

app.use(express.static('public'))

app.get('/image', (request, response) => {

  var image = zeros([20, 20, 3])

  colorHistory.forEach(e => {
    const color = e.color.match(/\d+/g)
    image.set(e.i, e.j, 0, color[0])
    image.set(e.i, e.j, 1, color[1])
    image.set(e.i, e.j, 2, color[2])

  });
 
  //Save to a file
  savePixels(image, 'png').pipe(response)
})

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000')
})

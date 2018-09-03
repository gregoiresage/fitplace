const express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io')(server)
var fs = require('fs');

const zeros = require('zeros')
const savePixels = require('save-pixels')

const S3_BUCKET = process.env.S3_BUCKET;
const aws = require('aws-sdk');
aws.config.region = 'us-east-2';

const s3 = new aws.S3()
const historyfile = 'history.json'

var image = zeros([20, 20, 4])

var colorHistory = [];

s3.getObject({Bucket: S3_BUCKET, Key: historyfile}, (err, data) => {
  if (err) {
    // an error occurred
    console.log(err, err.stack)
  }
  else {
    colorHistory = JSON.parse(data.Body.toString())
  }
})

io.on('connection', function(socket){

  if(colorHistory.length){
    colorHistory.forEach(function(event){
      io.emit('newPaint', event)
    })
  }

  socket.on('color', function(event){
    colorHistory.push(event)

    console.log(event)

    const color = event.color.match(/\d+/g)
    image.set(event.i, event.j, 0, color[0])
    image.set(event.i, event.j, 1, color[1])
    image.set(event.i, event.j, 2, color[2])
    image.set(event.i, event.j, 3, 255)
    
    io.emit('newPaint', event)
  })

  socket.on('disconnect', function(){
    console.log('user disconnected')
  })

})

app.use(express.static('public'))

app.get('/image', (request, response) => savePixels(image, 'png').pipe(response))

server.listen(process.env.PORT || 3000, () => {
  console.log('listening on *:3000')
})

app.get('/upload', (request, response) => {
  s3.putObject({
    Bucket: S3_BUCKET,
    Key: historyfile,
    Body: JSON.stringify(colorHistory), 
    ContentType: "application/json"
  },
  function(err,data){
    console.log(JSON.stringify(err)+" "+JSON.stringify(data));
  });

  return response.end();
})

process.on('SIGTERM', () => {
  console.log("BYEBYEBYEBYEYBEY")
  server.close.bind(server)
})

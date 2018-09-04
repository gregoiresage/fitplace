const express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io')(server)

// const ndarray = require('ndarray')
const zeros = require('zeros')
const savePixels = require('save-pixels')

// const S3_BUCKET = process.env.S3_BUCKET
// const aws = require('aws-sdk')
// aws.config.region = 'us-east-2'

var redis = require('redis');
var client = redis.createClient(process.env.REDISCLOUD_URL, {no_ready_check: true});

const SIZE   = 20

// const s3 = new aws.S3()
// const objectConfig = {Bucket: S3_BUCKET, Key: 'history.json'}

var colorHistory = []
var image = zeros([SIZE, SIZE, 3], 'uint8')
for(var i=0; i<SIZE; i++) {
  for(var j=0; j<SIZE; j++) {
    image.set(i, j, 0, 0xFF)
    image.set(i, j, 1, 0xFF)
    image.set(i, j, 2, 0xFF)
  }
}

const saveEvent = (event) => {
  const color = event.color.match(/\d+/g)
  image.set(event.i, event.j, 0, color[0])
  image.set(event.i, event.j, 1, color[1])
  image.set(event.i, event.j, 2, color[2])
}

client.get('history', function (err, reply) {
  console.log(err)
  console.log(reply); // Will print `bar`
});

// s3.getObject(
//   objectConfig,
//   (err, data) => {
//     if (err) {
//       console.log(err, err.stack)
//     }
//     else {
//       colorHistory = JSON.parse(data.Body.toString())
//       colorHistory.forEach(event => saveEvent(event))
//     }
//   }
// )

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

app.get('/upload', (request, response) => {
  client.set('history', JSON.stringify(colorHistory));
  // s3.putObject(
  //   { 
  //     ...objectConfig,
  //     Body: JSON.stringify(colorHistory),
  //     ContentType: 'application/json'
  //   },
  //   (resp, error) => {
  //     console.log(resp)
  //     console.log(error)
  //   }
  // )
  return response.end()
})

process.on('exit', () => {
  console.log('exiiiiiiiiiiiiiit')
})

process.on('SIGTERM', () => {
  console.log('Saving history')
  console.log(JSON.stringify(colorHistory))
  client.set('history', JSON.stringify(colorHistory));
  // const config = { ...objectConfig, Body: JSON.stringify(colorHistory), ContentType: 'application/json' }
  // s3.putObject(
  //   { ...objectConfig, Body: JSON.stringify(colorHistory), ContentType: 'application/json' },
  //   (resp, error) => {
  //     console.log('History saved')
  //   }
  // )
  server.close.bind(server)
})

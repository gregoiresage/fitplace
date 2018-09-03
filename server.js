const express = require('express')
var app = express()
var server = require('http').createServer(app)
var io = require('socket.io')(server)
var fs = require('fs');

const zeros = require('zeros')
const savePixels = require('save-pixels')


const aws = require('aws-sdk');
aws.config.region = 'us-east-2';

var s3Stream = require('s3-upload-stream')(new aws.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
}))

var image = zeros([20, 20, 4])

var colorHistory = [];
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

const S3_BUCKET = process.env.S3_BUCKET;

console.log(process.env.AWS_ACCESS_KEY_ID)

app.get('/upload', (request, response) => {
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: "image.png",
    Expires: 60,
    ContentType: 'image/png',
    ACL: 'public-read'
  };
  var upload = s3Stream.upload(s3Params);
   
  // Optional configuration
  upload.maxPartSize(20971520); // 20 MB
  upload.concurrentParts(5);

  // const fileName = 'image.png'
  // const ws = fs.createWriteStream(fileName)
  savePixels(image, 'png').pipe(upload)

  console.log("Done");
  return response.end();

  // const s3 = new aws.S3();
  // const s3Params = {
  //   Bucket: S3_BUCKET,
  //   Key: fileName,
  //   Expires: 60,
  //   ContentType: 'image/png',
  //   ACL: 'public-read'
  // };

  // s3.getSignedUrl('putObject', s3Params, (err, data) => {
  //   if(err){
  //     console.log(err);
  //     return response.end();
  //   }
  //   const returnData = {
  //     signedRequest: data,
  //     url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
  //   };
  //   response.write(JSON.stringify(returnData));
  //   response.end();
  // });
})

process.on('SIGTERM', () => {
  console.log("BYEBYEBYEBYEYBEY")
  server.close.bind(server)
})

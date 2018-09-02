var cols;
var rows;
w = 30;
var grid;

var myColor = 'rgb(255, 255, 255)'

var ctn = document.querySelector('.palette')
var palette = document.querySelectorAll('.color');
palette.forEach(function(color) {
  color.addEventListener('click', function(){
    // update myColor
    var c = window.getComputedStyle(color, null).backgroundColor
    myColor = c;
    ctn.style.backgroundColor = c;
  })
})

function make2DArray(cols, rows) {
  var arr = new Array(cols);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(rows)
  }
  return arr;
}

function mousePressed(){
  for (var i = 0; i < cols; i++) {
    for (var j = 0; j < rows; j++) {
      if (grid[i][j].contains(mouseX, mouseY)) {
        // grid[i][j].updateColor(myColor)
        socket.emit('color', { i, j, color: myColor})
      }
    }
  }
}

function setup(){
  var canvas = createCanvas(601, 601);
  canvas.parent("p5canvas");

  cols = floor(width / w);
  rows = floor(height / w);

  grid = make2DArray(cols,rows);

  for (var i = 0; i < cols; i++) {
    for (var j = 0; j < rows; j++) {
      grid[i][j] = new Cell(i,j,w);
    }
  }
}

socket.on('newPaint', function(event){
  console.dir(event)
  grid[event.i][event.j].updateColor(event.color)
})

// socket.on('setup', function(event){
//   // get initial grid state
// })

function draw(){
  background(255);


  for (var i = 0; i < cols; i++) {
    for (var j = 0; j < rows; j++) {
      grid[i][j].show()
    }
  }
}

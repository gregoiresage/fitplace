/*
* make8bitart.com
* author: jenn schiffer
* turn down for #butts
*/

$(function() {

  /*** VARIABULLS ***/

  var ctx, pickerPaletteCtx, leftSide, topSide, xPos, yPos, resetSelectStart, saveSelection, rect, historyPointer;
  var undoRedoHistory = [];
  var drawHistory = [];

  var classes = {
    selectionCanvas : 'selectionCanvas',
    current: 'current',
    currentTool: 'current-tool',
    dropperMode: 'dropper-mode',
    wait: 'wait',
    tipText: 'tip-text',
    color: 'color',
    transparent: 'transparent',
    activeTab: 'active'
  };

  var DOM = {
    $window : $(window),
    $body : $('body'),
    
    $header : $('#header'),
    $whatbox : $('#what'),
    $toolbox : $('#toolbox'),
    $savebox : $('#savebox'),
    $colorbox : $('#colorbox'),
    $waiting : $('#wait'),

    $tabs : $('.tabs'),
    
    $color : $('.color'),
    $colorHistoryModule : $('#color-history'),
    $colorHistoryPalette : $('.color-history-list'),
    $colorCustomPalette : $('.color-custom-list'),
    $pickers : $('#pickers'),
    $customPalettes : $('#custom-palettes'),
    $defaultPalettes : $('#default-palettes'),
    $8bitPicker : $('#eight-bit-colors'),
    $colorPickerDemo : $('.color-demo'),
    $hex : $('#hex-color'),
    $dropper : $('#color-dropper'),
    
    $pencil : $('#pencil'),
    $paint : $('#paint'),

    $buttonNewCanvas : $('#new-canvas'),
    $buttonSaveFull : $('#save-full'),
    $buttonSaveSelection : $('#save-selection'),
    $buttonSaveImgur : $('#save-imgur'),
        
    $pixelSizeInput : $('.pixel-size-input'),
    $pixelSizeDemoDiv : $('#pixel-size-demo'),
    
    $minimizedToolsList : $('#minimized-tools-list'),
    $draggydivs : $('.draggy'),
    $tips : $('.tip'),
    $saveInstruction : $('.instructions').slideUp(),
    
    $undo : $('#undo'),
    $redo : $('#redo'),
    
    $saveModalContainer : $('#save-modal-container'),
    $saveImg : $('#finished-art'),
    $saveExit : $('#save-modal .ui-hider'),
    $linkImgur : $('#link-imgur'),

    $colorHistoryTools : {
      clearPalette: $('#color-history-tools .clear'),
      exportPalette: $('#color-history-tools .export'),
    },
    
    $colorCustomTools : {
      clearPalette: $('#color-custom-tools .clear'),
      importPalette: $('#color-custom-tools .import')
    }
  };
  
  var mode = {
    dropper : false,
    drawing : false,
    save : false,
    paint : false,
    trill : true
  };
  
  var action = {
    draw : 'draw',
    fill : 'fill',
    index : 0
  };

  var windowCanvas = {
    height: DOM.$window.height(),
    width: DOM.$window.width(),
    background: 'url("assets/bg.png")'
  };

  var copy = {
    selectionOff : 'turn off selection',
    selectionOn : 'selection',
    fullPage : 'full page'
  };
  
  var pixel = {
    color: 'rgba(0, 0, 0, 1)',
  };
  
  // to work, register your own imgur app here https://api.imgur.com/ and enter your info
  var imgur = {
    clientId: '11112830fafe58a',
  };

  
  /*** OUTSIDE LIBRARY STUFF - DRAGGYDIVS ***/
  var onMinimizeToolsListClick = function(e) {
    var $this = $(this);
    var $elm = $this.data('draggy');
    $elm.draggyBits('restore');
    $this.parent().remove();
  };

  var onMinimize = function($elm) {
    var $a = $('<a href="#' + $elm.attr('data-title') + '">').html($elm.attr('title')).on('click', onMinimizeToolsListClick).data('draggy', $elm);
    $('<li></li>').append($a).appendTo(DOM.$minimizedToolsList);
  };
  
  DOM.$draggydivs.draggyBits({onMinimize:onMinimize});

  // if mouse up is on toolboxes, don't keep drawing
  DOM.$draggydivs.mouseup(function() {
    DOM.$canvas.off('mousemove');
  });

  
  
  /*** DRAGGY POSITIONS ***/
  
  DOM.$header.css({
    left: '260px',
    top : '20px'
  });
  DOM.$whatbox.css({
    left : '560px',
    top : '120px'
  });
  DOM.$toolbox.css({
    left : '30px',
    top : '120px'
  });
  DOM.$colorbox.css({
    left : '750px',
    top : '50px'
  });
  DOM.$savebox.css({
    top : '255px',
    left : '234px'
  });

  

  /*** FUNCTIONS WOWOWOW ***/
  
  /* canvas & drawing */

  var generateCanvas = function() {
    
    // drawing
    DOM.$canvas = $('<canvas id="canvas" width="' + windowCanvas.width + '" height="' + windowCanvas.height + '">Your browser doesn\'t support canvas. Boo-hiss.</canvas>');
    DOM.$body.prepend( DOM.$canvas );
    ctx = DOM.$canvas[0].getContext('2d');
    
    // selection save overlay
    DOM.$overlay = $('<canvas id="overlay" width="' + windowCanvas.width + '" height="' + windowCanvas.height + '"></canvas>');
    DOM.$overlay.css({
      background : 'none',
      position : 'absolute',
      top : 0,
      left : 0,
      display : 'none'
    });
    DOM.$body.prepend( DOM.$overlay );
    ctxOverlay = DOM.$overlay[0].getContext('2d');
    ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
    
    // restore webstorage data
    if ( canStorage() ) {
      drawFromLocalStorage();
    }
  };
  
  var resetCanvas = function(background) {
    
    if ( window.confirm('You cannot undo canvas resets. Are you sure you want to erase this entire drawing?') ) {
      ctx.clearRect(0, 0, DOM.$canvas.width(), DOM.$canvas.height());
      
      if ( background && background != 'rgba(0, 0, 0, 0)') {
        ctx.fillStyle = background;
        ctx.fillRect(0,0,DOM.$canvas.width(),DOM.$canvas.height());
      }
      
      // reset history
      undoRedoHistory = [];
      historyPointer = -1;
      DOM.$redo.attr('disabled', 'disabled');
      DOM.$undo.attr('disabled', 'disabled');
    }
  };
  
  var initpixel = function(size) {
    pixel.size = size;
    DOM.$pixelSizeDemoDiv.css({
      width : pixel.size,
      height: pixel.size
    });
    DOM.$pixelSizeInput.val(pixel.size);
  };

  var drawPixel = function(xPos, yPos, color, size) {
    ctx.beginPath();
    xPos = ( Math.ceil(xPos/size) * size ) - size;
    yPos = ( Math.ceil(yPos/size) * size ) - size;
    ctx.moveTo (xPos, yPos);
    ctx.fillStyle = color;
    ctx.lineHeight = 0;
    
    if ( color == 'rgba(0, 0, 0, 0)' ) {
      ctx.clearRect(xPos,yPos,size,size);
    }
    else {
      ctx.fillRect(xPos,yPos,size,size);
    }
    
  };
  
  var drawOnMove = function(e) {
    var hoverData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
    var hoverRGB = getRGBColor(hoverData);
    
    if ( !areColorsEqual( hoverRGB, pixel.color, pixel.size) ) {
      drawPixel(e.pageX, e.pageY, pixel.color, pixel.size);
      pushToHistory(action.index, action.draw, e.pageX, e.pageY, hoverRGB, pixel.color, pixel.size);
    }
  };

  var touchDraw = function(e) {
    // for each finger in your fingers
    for ( var i = 0; i < e.touches.length; i++ ) {
      drawOnMove(e.touches[i]);
    }
  };
  
  var paint = function(x, y, paintColor, initColor) {
    // thanks to Will Thimbleby http://will.thimbleby.net/scanline-flood-fill/
    
    x = ( Math.ceil(x/pixel.size) * pixel.size ) - pixel.size;
    y = ( Math.ceil(y/pixel.size) * pixel.size ) - pixel.size;
    
    // xMin, xMax, y, down[true] / up[false], extendLeft, extendRight
    var ranges = [[x, x, y, null, true, true]],
    w = windowCanvas.width;

    // get data array from ImageData object
    var img = ctx.getImageData(0, 0, windowCanvas.width, windowCanvas.height),
    imgData = img.data;  
    if (paintColor[0] === '#') {
      paintColor = hexToRgba(paintColor);
    }
    var paintColorArray = paintColor.substring(5, paintColor.length -1).split(',');

    // lookup pixel colour from x & y coords
    function getColorForCoords (x, y) {
      var index = 4 * (x + y * windowCanvas.width);
      var indices = [index, index + 1, index + 2, index + 3];
      var values = indices.map(function(i){
        return imgData[i];
      });
      return getRGBColor(values);
    }

    // set pixel colour in imgData array
    function markPixel(x, y) {
      var index = 4 * (x + y * w);
      
      var alpha = parseInt(paintColorArray[3]) === 0 ? 0 : 255;
      console.log(paintColorArray[3], alpha);

      for (var j = index; j < index + pixel.size * 4; j+=4) {
        imgData[j] = paintColorArray[0];
        imgData[j + 1] = paintColorArray[1];
        imgData[j + 2] = paintColorArray[2];
        imgData[j + 3] = alpha;      

        for (var k = j; k < j + pixel.size * (w * 4); k+= w * 4) {
          imgData[k] = paintColorArray[0];
          imgData[k + 1] = paintColorArray[1];
          imgData[k + 2] = paintColorArray[2];
          imgData[k + 3] = alpha;        
        }
      }
      pushToHistory(action.index, action.fill, x + pixel.size, y + pixel.size, initColor, paintColor, pixel.size);
    }

    function addNextLine(newY, isNext, downwards) {
      var rMinX = minX;
      var inRange = false;

      for(var x = minX; x <= maxX; x+= pixel.size) {
        // skip testing, if testing previous line within previous range
        var empty = (isNext || (x < current[0] || x > current[1])) && areColorsEqual(getColorForCoords(x, newY), initColor);
        if(!inRange && empty) {
          rMinX = x;
          inRange = true;
        }
        else if(inRange && !empty) {
          ranges.push([rMinX, x-pixel.size, newY, downwards, rMinX == minX, false]);
          inRange = false;
        }
        if(inRange) {
          markPixel(x, newY, paintColor, 1);
        }
        // skip
        if(!isNext && x == current[0]) {
          x = current[1];
        }
      }
      if(inRange) {
        ranges.push([rMinX, x-pixel.size, newY, downwards, rMinX == minX, true]);
      }
    }

    initColor = getColorForCoords(x, y);

    markPixel(x, y, paintColor, 1);

    while(ranges.length) {
      var current = ranges.pop();
      var down = current[3] === true;
      var up =   current[3] === false;

      var minX = current[0];
      y = current[2];

      if(current[4]) {
        while(minX > 0 && areColorsEqual(getColorForCoords(minX - pixel.size, y), initColor)) {
          minX-=pixel.size;
          markPixel(minX, y, paintColor, 1);
        }
      }

      var maxX = current[1];
      if(current[5]) {
        while(maxX < windowCanvas.width - pixel.size && areColorsEqual(getColorForCoords(maxX + pixel.size, y), initColor)) {
          maxX+=pixel.size;
          markPixel(maxX, y, paintColor, 1);
        }
      }

      current[0]-=pixel.size;
      current[1]+=pixel.size;

      if(y < windowCanvas.height) {
        addNextLine(y + pixel.size, !up, true);
      }
      if(y > 0) {
        addNextLine(y - pixel.size, !down, false);
      }
    }

    img.data = imgData;

    // replace entire canvas
    ctx.putImageData(img, 0, 0);

  };

  var canStorage = function() {
    try {
      return 'localStorage' in window && window.localStorage !== null;
    }
    catch (e) {
      return false;
    }
  };
  
  var drawFromLocalStorage = function() {
    var savedCanvas = localStorage.make8bitartSavedCanvas;
    if ( savedCanvas ) {
      var img = new Image();
      img.onload = function() {
        ctx.drawImage(img,0,0);
      };
      img.src = savedCanvas;
    }
  };
  
  var pushToHistory = function( actionIndex, actionType, x, y, rgbOriginal, rgbNew, pixelSize) {
    // push to undoRedoHistory
    var pixelDrawn = {
      index : actionIndex,
      action : actionType,
      xPos : x,
      yPos : y,
      originalColor : rgbOriginal,
      newColor : rgbNew,
      pixelSize: pixelSize
    };
    undoRedoHistory.push(pixelDrawn);
    drawHistory.push(pixelDrawn);
    historyPointer++;
    DOM.$undo.removeAttr('disabled');
  };

  var undoRedo = function(pointer, undoFlag) {
    var undoRedoColor, nextPointer;
    if ( undoFlag ) {
      undoRedoColor = undoRedoHistory[pointer].originalColor;
      nextPointer = pointer - 1;
    }
    else {
      undoRedoColor = undoRedoHistory[pointer].newColor;
      nextPointer = pointer + 1;
    }
    
    if ( undoRedoHistory[pointer].action == action.fill && undoRedoHistory[nextPointer] && undoRedoHistory[pointer].index == undoRedoHistory[nextPointer].index ) {
      if ( undoFlag ) {
        historyPointer--;
      }
      else {
        historyPointer++;
      }
      undoRedo(historyPointer, undoFlag);
    }

    drawPixel(undoRedoHistory[pointer].xPos, undoRedoHistory[pointer].yPos, undoRedoColor, undoRedoHistory[pointer].pixelSize);
  };
  
  var resetModes = function() {
    if ( mode.dropper ) {
      DOM.$dropper.removeClass(classes.currentTool).removeAttr('style');
      DOM.$canvas.removeClass(classes.dropperMode);
      mode.dropper = false;
            
      if ( pixel.color != 'rgba(0, 0, 0, 0)' ) {
        backgroundIMG = 'none';
      }
      
      DOM.$pixelSizeDemoDiv.css('background-image', backgroundIMG);
      DOM.$colorPickerDemo.css({
        'background-image' : backgroundIMG,
        'background-color' : pixel.color
      });
      DOM.$hex.val(rgbToHex(pixel.color));
    }
    else if ( mode.save ) {
      DOM.$buttonSaveSelection.click();
    }
    mode.paint = false;
    DOM.$paint.removeClass(classes.currentTool);
    DOM.$pencil.removeClass(classes.currentTool);
  };
  
  var init8bitPicker = function() {
    // turns palette into canvas
    pickerPaletteCtx = DOM.$8bitPicker[0].getContext('2d');
    var img = new Image();
      img.onload = function() {
        pickerPaletteCtx.drawImage(img,0,0);
      };
      // NOTE: original png is assets/customcolors.png. using data uri so it works in different directories
      img.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMMAAADDCAIAAACwHTL9AAAACXBIWXMAAAsTAAALEwEAmpwYAAA4KmlUWHRYTUw6Y29tLmFkb2JlLnhtcAAAAAAAPD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4KPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMwMTQgNzkuMTU2Nzk3LCAyMDE0LzA4LzIwLTA5OjUzOjAyICAgICAgICAiPgogICA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPgogICAgICA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIgogICAgICAgICAgICB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmRjPSJodHRwOi8vcHVybC5vcmcvZGMvZWxlbWVudHMvMS4xLyIKICAgICAgICAgICAgeG1sbnM6cGhvdG9zaG9wPSJodHRwOi8vbnMuYWRvYmUuY29tL3Bob3Rvc2hvcC8xLjAvIgogICAgICAgICAgICB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIKICAgICAgICAgICAgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIKICAgICAgICAgICAgeG1sbnM6dGlmZj0iaHR0cDovL25zLmFkb2JlLmNvbS90aWZmLzEuMC8iCiAgICAgICAgICAgIHhtbG5zOmV4aWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20vZXhpZi8xLjAvIj4KICAgICAgICAgPHhtcDpDcmVhdG9yVG9vbD5BZG9iZSBQaG90b3Nob3AgQ0MgMjAxNCAoTWFjaW50b3NoKTwveG1wOkNyZWF0b3JUb29sPgogICAgICAgICA8eG1wOkNyZWF0ZURhdGU+MjAxNS0wMS0yM1QxMjoyOToxOC0wNTowMDwveG1wOkNyZWF0ZURhdGU+CiAgICAgICAgIDx4bXA6TW9kaWZ5RGF0ZT4yMDE1LTAyLTA1VDIyOjU0OjQwLTA1OjAwPC94bXA6TW9kaWZ5RGF0ZT4KICAgICAgICAgPHhtcDpNZXRhZGF0YURhdGU+MjAxNS0wMi0wNVQyMjo1NDo0MC0wNTowMDwveG1wOk1ldGFkYXRhRGF0ZT4KICAgICAgICAgPGRjOmZvcm1hdD5pbWFnZS9wbmc8L2RjOmZvcm1hdD4KICAgICAgICAgPHBob3Rvc2hvcDpDb2xvck1vZGU+MzwvcGhvdG9zaG9wOkNvbG9yTW9kZT4KICAgICAgICAgPHhtcE1NOkluc3RhbmNlSUQ+eG1wLmlpZDpkYTY2ZTJlYi1lOWZlLTQwZjQtOTk3NC0xYmRmYWM3YzM2MTc8L3htcE1NOkluc3RhbmNlSUQ+CiAgICAgICAgIDx4bXBNTTpEb2N1bWVudElEPnhtcC5kaWQ6ZGE2NmUyZWItZTlmZS00MGY0LTk5NzQtMWJkZmFjN2MzNjE3PC94bXBNTTpEb2N1bWVudElEPgogICAgICAgICA8eG1wTU06T3JpZ2luYWxEb2N1bWVudElEPnhtcC5kaWQ6ZGE2NmUyZWItZTlmZS00MGY0LTk5NzQtMWJkZmFjN2MzNjE3PC94bXBNTTpPcmlnaW5hbERvY3VtZW50SUQ+CiAgICAgICAgIDx4bXBNTTpIaXN0b3J5PgogICAgICAgICAgICA8cmRmOlNlcT4KICAgICAgICAgICAgICAgPHJkZjpsaSByZGY6cGFyc2VUeXBlPSJSZXNvdXJjZSI+CiAgICAgICAgICAgICAgICAgIDxzdEV2dDphY3Rpb24+Y3JlYXRlZDwvc3RFdnQ6YWN0aW9uPgogICAgICAgICAgICAgICAgICA8c3RFdnQ6aW5zdGFuY2VJRD54bXAuaWlkOmRhNjZlMmViLWU5ZmUtNDBmNC05OTc0LTFiZGZhYzdjMzYxNzwvc3RFdnQ6aW5zdGFuY2VJRD4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OndoZW4+MjAxNS0wMS0yM1QxMjoyOToxOC0wNTowMDwvc3RFdnQ6d2hlbj4KICAgICAgICAgICAgICAgICAgPHN0RXZ0OnNvZnR3YXJlQWdlbnQ+QWRvYmUgUGhvdG9zaG9wIENDIDIwMTQgKE1hY2ludG9zaCk8L3N0RXZ0OnNvZnR3YXJlQWdlbnQ+CiAgICAgICAgICAgICAgIDwvcmRmOmxpPgogICAgICAgICAgICA8L3JkZjpTZXE+CiAgICAgICAgIDwveG1wTU06SGlzdG9yeT4KICAgICAgICAgPHRpZmY6T3JpZW50YXRpb24+MTwvdGlmZjpPcmllbnRhdGlvbj4KICAgICAgICAgPHRpZmY6WFJlc29sdXRpb24+NzIwMDAwLzEwMDAwPC90aWZmOlhSZXNvbHV0aW9uPgogICAgICAgICA8dGlmZjpZUmVzb2x1dGlvbj43MjAwMDAvMTAwMDA8L3RpZmY6WVJlc29sdXRpb24+CiAgICAgICAgIDx0aWZmOlJlc29sdXRpb25Vbml0PjI8L3RpZmY6UmVzb2x1dGlvblVuaXQ+CiAgICAgICAgIDxleGlmOkNvbG9yU3BhY2U+NjU1MzU8L2V4aWY6Q29sb3JTcGFjZT4KICAgICAgICAgPGV4aWY6UGl4ZWxYRGltZW5zaW9uPjE5NTwvZXhpZjpQaXhlbFhEaW1lbnNpb24+CiAgICAgICAgIDxleGlmOlBpeGVsWURpbWVuc2lvbj4xOTU8L2V4aWY6UGl4ZWxZRGltZW5zaW9uPgogICAgICA8L3JkZjpEZXNjcmlwdGlvbj4KICAgPC9yZGY6UkRGPgo8L3g6eG1wbWV0YT4KICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAKICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIAogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgCiAgICAgICAgICAgICAgICAgICAgICAgICAgICAKPD94cGFja2V0IGVuZD0idyI/PoWqTskAAAAgY0hSTQAAeiUAAICDAAD5/wAAgOkAAHUwAADqYAAAOpgAABdvkl/FRgAAAbxJREFUeNrs29GpxCAQhlGNlpKW0ldKTgdRcAgTPOd5WWT5+O/DcGuZcgV9bPw9Z6lxT4p59tyTri+fHfcrhT37KBBBSSgJJaEkUBJKQkkoCZSEkvirXk4/AjYJJaEkUBJKQkkoCZSEklASSgIlkYILLjYJJaEkUBJKQkkoCZSEklASe3MtwSahJJQESkJJKAklgZJQEkpCSbDO3Q2bhJJQEigJJaEklARKQkkoCSWBksjCBRebhJJQEigJJaEklARKQkkoCSXBOnc3bBJKQkmgJJSEklASKAkloSSUBEoiCxdcbBJKQkmgJJSEklASKAkloST21u+e60EJjzeeZJNQEkpCSaAklISSQEkoCSWhJBjxX0rYJJSEkkBJKAkloSRQEkpCSSgJlEQWLrjYJJSEkkBJKAkloSRQEkpCSSgJ1rm7YZNQEkoCJaEklISSQEkoCSWhJFjn7oZNQkkoCZSEklASSgIloSSUhJJASWThgotNQkkoCZSEklASSgIloSSUxN5cS7BJKAklgZJQEkpCSaAklISSUBIoiSxccBlrzSbhrxtKQkmgJJSEkkBJKAkloSR49wAAAP//AwCyeAkNkRFy4wAAAABJRU5ErkJggg==';
  };

  var initColorHistoryPalette = function() {
    if ( colorHistory.length === 0 ) {
      return;
    }
    else {
      // make all color history values consistently hex without hash
      var sanitizedColors = sanitizeColorArray(colorHistory);

      sanitizedColors.forEach(function(color){
        var latestColorButton = $('<li><a class="button color" style="background-color:#' + color + '" title="history:#' + color + '" data-color="#' + color + '" /> </a></li>');
        DOM.$colorHistoryPalette.append(latestColorButton);
      });

      // bind click to color buttons
      DOM.$color = $('.'+classes.color);
      DOM.$color.click(bindColorClick);
    }
  };

  // builds a 2x2 grid of grey and white "pixels" to match pixel size
  var generateBackgroundGrid = function(pixelSize) {
    var bgCanvas = document.createElement('canvas'),
      bgCtx = bgCanvas.getContext('2d'),
      width = pixelSize * 2,
      height = pixelSize * 2;

    bgCanvas.width = width;
    bgCanvas.height = height;

    bgCtx.fillStyle = '#fff';
    bgCtx.fillRect(0, 0, width, height);

    bgCtx.fillStyle = '#ccc';
    bgCtx.fillRect(0, 0, pixelSize, pixelSize);
    bgCtx.fillRect(pixelSize, pixelSize, pixelSize, pixelSize);

    return bgCanvas.toDataURL();
  };

  
  /* saving */

  var roundToNearestPixel = function(n) {
    var canRound = (0 === pixel.size || void(0) !== pixel.size);
    return canRound ? Math.round(n / pixel.size) * pixel.size : n;
  };

  var startSaveSelection = function(e) {
    saveSelection = {
      startX : roundToNearestPixel(e.pageX),
      startY : roundToNearestPixel(e.pageY)
    };
  };
  
  var generateSaveSelection = function(e) {

    saveSelection.endX = roundToNearestPixel(e.pageX);
    saveSelection.endY = roundToNearestPixel(e.pageY);

    generateSelectionCanvas(saveSelection);
    DOM.$buttonSaveSelection.click();
  };
  
  var generateSelectionCanvas = function(coords) {
    
    // temporary canvas to save image
    DOM.$body.append('<canvas id="' + classes.selectionCanvas + '"></canvas>');
    var tempCanvas = $('#' + classes.selectionCanvas);
    var tempCtx = tempCanvas[0].getContext('2d');

    // set dimensions and draw based on selection
    var width = Math.abs(coords.endX - coords.startX);
    var height = Math.abs(coords.endY - coords.startY);
    tempCanvas[0].width = width;
    tempCanvas[0].height = height;

    var startX = Math.min( coords.startX, coords.endX );
    var startY = Math.min( coords.startY, coords.endY );

    if ( width && height ) {
      tempCtx.drawImage(DOM.$canvas[0],startX, startY, width, height, 0, 0, width, height);
    
      // write on screen
      var img = tempCanvas[0].toDataURL('image/png');
      displayFinishedArt(img);
    }
    
    // remove tempCanvas
    tempCanvas.remove();
  };

  var drawSelection = function(e) {
    rect.w = roundToNearestPixel((e.pageX - this.offsetLeft) - rect.startX);
    rect.h = roundToNearestPixel((e.pageY - this.offsetTop) - rect.startY);
    ctxOverlay.clearRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
    ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
    ctxOverlay.fillRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
    ctxOverlay.clearRect(rect.startX, rect.startY, rect.w, rect.h);
  };
  
  var displayFinishedArt = function(src) {
    DOM.$saveImg.attr('src', src);
    DOM.$saveImg.parent().attr('href', src);
    DOM.$saveModalContainer.show();
  };
  
  var saveToLocalStorage = function() {
    if ( canStorage() ) {
      savedCanvas = DOM.$canvas[0].toDataURL('image/png');
      localStorage.make8bitartSavedCanvas = savedCanvas;
    }
  };
  
  var uploadToImgur = function() {
    var imgDataURL = DOM.$saveImg.attr('src').replace(/^data:image\/(png|jpg);base64,/, '');
    $.ajax({
      method: 'POST',
      url: 'https://api.imgur.com/3/image',
      headers: {
        Authorization: 'Client-ID ' + imgur.clientId,
      },
      dataType: 'json',
      data: {
        image: imgDataURL,
        type: 'base64',
        title: 'made on make8bitart.com',
        description: 'made on make8bitart.com'
      },
      success: function(result) {
        var id = result.data.id;
        var url = 'https://imgur.com/gallery/' + id;
        DOM.$linkImgur.attr('href', url).text('click: ' + url);
        DOM.$buttonSaveImgur.hide();
      },
      error: function(result) {
        DOM.$linkImgur.text('There was an error saving to Imgur.');
      }
    });
  };
  
  
  /* colors */
  
  var getRGBColor = function(imageData) {
    var opacity = imageData[3]/255;
    return 'rgba(' + imageData[0] + ', ' + imageData[1] + ', ' + imageData[2] + ', ' + opacity + ')';
  };
  
  // get hex without '#'
  var rgbToHex = function( rgb ) {
    if ( rgb.length === 6 ) {
      return rgb;
    }
    else if ( rgb.charAt(0) === '#' && rgb.length === 7 ) {
      return rgb.slice(1,7);
    }
    else if ( rgb == 'transparent' ) {
      return null;
    }
    else {
      var startString = ( rgb.charAt(3) == 'a' ) ? 5 : 4;
      var rgbArray = rgb.substr(startString, rgb.length - 5).split(',');
      var hex = '';
      for ( var i = 0; i <= 2; i++ ) {
        var hexUnit = parseInt(rgbArray[i],10).toString(16);
        if ( hexUnit.length == 1 ) {
          hexUnit = '0' + hexUnit;
        }
        hex += hexUnit;
      }
      return hex;
    }
  };

  var hexToRgba = function( hex ) {
    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    var shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
      return r + r + g + g + b + b;
    });
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 'rgba(' + parseInt(result[1], 16) + ', ' + parseInt(result[2], 16) + ', ' +  parseInt(result[3], 16) + ', 1)'  : null;
  };

  var sanitizeColorArray = function( colorArray ) {
    for ( var i = 0; i < colorArray.length; i++ ) {
      colorArray[i] = rgbToHex(colorArray[i]);
    }
    return colorArray;
  };
  
  var setDropperColor = function( color ) {
    pixel.color = color;
    DOM.$pixelSizeDemoDiv.css('background-image', 'none');
    DOM.$colorPickerDemo.css('background-image', 'none');
    DOM.$pixelSizeDemoDiv.css('background-color', pixel.color);
    DOM.$colorPickerDemo.css('background-color', pixel.color);
    DOM.$hex.val(rgbToHex(DOM.$colorPickerDemo.css('background-color')));
    DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + pixel.color);
  };
  
  var hexColorChosen = function() {
    var newColor = '#' + DOM.$hex.val();
    $('.'+classes.current).removeClass(classes.current);
    DOM.$hex.addClass(classes.current);
    
    pixel.color = newColor;
    DOM.$colorPickerDemo.css('background-color', newColor);
    DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + newColor);
  };
  
  var areColorsEqual = function( alpha, beta ) {
    if ( ( alpha == 'rgba(0, 0, 0, 0)' && ( beta == '#000000' || beta == 'rgba(0, 0, 0, 1)' ) ) ||
      ( ( alpha == '#000000' || alpha == 'rgba(0, 0, 0, 1)' ) && beta == 'rgba(0, 0, 0, 0)' )  ||
       rgbToHex(alpha) != rgbToHex(beta) ) {
      return false;
    }
    else {
      return true;
    }
  };

  var updateColorHistoryPalette = function() {
    var hexColor = rgbToHex(pixel.color);
    var colorHistoryPos = colorHistory.indexOf(hexColor); 
    if ( colorHistoryPos == -1 ) {
      if ( colorHistory.length == 20 ) {
        colorHistory.pop();
        DOM.$colorHistoryPalette.find('li').eq(19).remove();
      }
    }
    else {
      colorHistory.splice(colorHistoryPos, 1);
      DOM.$colorHistoryPalette.find('li').eq(colorHistoryPos).remove();
    }

    colorHistory.unshift(hexColor);

    var latestColorButton = $('<li><a class="button color" style="background-color:#' + hexColor + '" title="history:#' + hexColor + '" data-color="#' + hexColor + '" /> </a></li>');
    DOM.$colorHistoryPalette.prepend(latestColorButton);
    latestColorButton.find('a').addClass(classes.current);

    // bind click to new colors
    DOM.$color = $('.'+classes.color);
    DOM.$color.click(bindColorClick);
    DOM.$colorHistoryModule.show();

    // save to local storage
    if ( canStorage() ) {
      localStorage.colorHistory = colorHistory;
    }
  };

    
  /*** EVENTS OH MAN ***/
  
  /* general */
  
  var onMouseDown = function(e) {
    e.preventDefault();
            
    var origData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
    var origRGB = getRGBColor(origData);
      
    if ( mode.dropper ) {
      mode.dropper = false;
      setDropperColor( origRGB );
      DOM.$canvas.removeClass(classes.dropperMode);
      DOM.$dropper.removeClass(classes.currentTool).removeAttr('style');
    }
    else if ( !mode.save ) {
    
      // reset history
      undoRedoHistory = undoRedoHistory.slice(0, historyPointer+1);
      DOM.$redo.attr('disabled','disabled');
        
      if ( mode.paint && !areColorsEqual( origRGB, pixel.color ) ) {
        action.index++;
        paint( e.pageX, e.pageY, pixel.color, origRGB );
      }
      else {
        // draw mode
        mode.drawing = true;
      
        action.index++;
        drawPixel(e.pageX, e.pageY, pixel.color, pixel.size);

        if ( !areColorsEqual( origRGB, pixel.color) ) {
          pushToHistory(action.index, action.draw, e.pageX, e.pageY, origRGB, pixel.color, pixel.size);
        }
        
        DOM.$canvas.on('mousemove', drawOnMove);
        
        // touch
        DOM.$canvas[0].addEventListener('touchmove', touchDraw, false);

        // update color history palette - shows latest 20 colors used
        if ( pixel.color !== 'rgba(0, 0, 0, 0)' ) {
          updateColorHistoryPalette();
        }
      }
      
    }
    else {
      // overlay stuff
      rect = {};
      startSaveSelection(e);
      rect.startX = roundToNearestPixel(e.pageX - this.offsetLeft);
      rect.startY = roundToNearestPixel(e.pageY - this.offsetTop);
      DOM.$overlay.on('mousemove', drawSelection);
      
      // touch
      DOM.$overlay[0].addEventListener('touchmove', drawSelection, false);
    }
    
  };
  
  var onMouseUp = function(e) {
    if ( !mode.save ) {
      DOM.$canvas.off('mousemove');
      mode.drawing = false;
      
      // save
      saveToLocalStorage();
    }
    else {
      DOM.$overlay.off('mousemove');
      ctxOverlay.clearRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
      generateSaveSelection(e);
      mode.save = false;
      rect = {};
    }
  };
    
  /* tools */
  
  // draw clicked
  DOM.$pencil.click(function(e) {
    e.preventDefault();
    resetModes();
    $(this).addClass(classes.currentTool);
  });
  
  // paint clicked
  DOM.$paint.click(function(e) {
    e.preventDefault();
    resetModes();
    $(this).addClass(classes.currentTool);
    mode.paint = true;
  });

  // pixel size slider changed
  DOM.$pixelSizeInput.change(function() {
    pixel.size = $(this).val();
    DOM.$pixelSizeDemoDiv.css({
      width : pixel.size,
      height : pixel.size
    });
    
    var img = new Image();
    img.src = generateBackgroundGrid(pixel.size);
    img.onload = function updateCanvasBackground() {
      DOM.$canvas.css('background','url(' + img.src + ')');
    };
    
    // set both inputs to be equal
    DOM.$pixelSizeInput.val(pixel.size);
  });
  
  // reset canvas 
  DOM.$buttonNewCanvas.click(function() {
    resetCanvas( pixel.color );
    saveToLocalStorage();
  });
  
  // save full canvas 
  DOM.$buttonSaveFull.click(function() {
    var savedPNG = DOM.$canvas[0].toDataURL('image/png');
    displayFinishedArt(savedPNG);
  });
  
  // save selection of canvas button clicked
  DOM.$buttonSaveSelection.click(function() {
    if ( mode.save ) {
      mode.save = false;
      DOM.$saveInstruction.slideUp();
      $(this).val(copy.selectionOn);
      DOM.$overlay.hide();
    }
    else {
      mode.save = true;
      DOM.$saveInstruction.slideDown();
      $(this).val(copy.selectionOff);
      ctxOverlay.fillRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
      DOM.$overlay.show();
    }
  });

  // ensure elements are enabled before triggering a click event
  var triggerClickForEnabled = function(elem) {
    return function() {
      // no-op if there is nothing to undo
      if (elem.is(':disabled')) {
        return;
      }
      
      // trigger the click
      elem.trigger('click');
    };
  };
  
  // undo
  DOM.$undo.click(function() {
    undoRedo(historyPointer, true);
    historyPointer--;
    
    DOM.$redo.removeAttr('disabled');
      
    if ( historyPointer < 0 ) {
      DOM.$undo.attr('disabled', 'disabled');
    }
  });
   
  // redo
  DOM.$redo.click(function() {
    historyPointer++;
    undoRedo(historyPointer, false);
    
    DOM.$undo.removeAttr('disabled');
    if ( historyPointer == undoRedoHistory.length - 1 ) {
      DOM.$redo.attr('disabled', 'disabled');
    }
  });
   
  // undo alias to ctrl+z, macs aliased to cmd+z
  key('ctrl+z, ⌘+z', triggerClickForEnabled(DOM.$undo));

  // redo alias to ctrl+y and mac aliased cmd+shift+z
  key('ctrl+y, ⌘+shift+z', triggerClickForEnabled(DOM.$redo));
  
  // close save modal alias to esc
  key('esc', function(){ DOM.$saveModalContainer.hide(); });

  // pencil tool (matches photoshop)
  key('B', triggerClickForEnabled(DOM.$pencil));

  // paint bucket tool (matches photoshop)
  key('G', triggerClickForEnabled(DOM.$paint));

  /* colors */
  
  // color click binding function
  var bindColorClick = function(){    
    var $newColor = $(this);
    var newColorLabel = $newColor.attr('data-color');
    var demoColor;
    
    $('.'+classes.current).removeClass(classes.current);
    $newColor.addClass(classes.current);
    pixel.color = newColorLabel;

    if ( pixel.color != 'rgba(0, 0, 0, 0)' ) {
      demoColor = pixel.color;
      DOM.$pixelSizeDemoDiv.css('background-image', 'none');
      DOM.$colorPickerDemo.css('background-image', 'none');
    }
    else {
      DOM.$pixelSizeDemoDiv.css('background-image', windowCanvas.background);
      DOM.$colorPickerDemo.css('background-image', windowCanvas.background);
      DOM.$hex.val('');
    }
    DOM.$pixelSizeDemoDiv.css('background-color', demoColor);
    DOM.$colorPickerDemo.css('background-color', demoColor);
    DOM.$hex.val(rgbToHex(DOM.$colorPickerDemo.css('background-color')));
    DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + newColorLabel);
  };

  // choose color
  DOM.$color.click(bindColorClick);

  
  // custom color hover
  DOM.$8bitPicker.mouseover( function(e) {
    $(this).mousemove( mousemovePickerPalette );
  });
  
  DOM.$8bitPicker.mouseout( function(e) {
    $(this).unbind('mouseover');
    DOM.$colorPickerDemo.css('background-color', pixel.color);
    DOM.$hex.val(rgbToHex(DOM.$colorPickerDemo.css('background-color')));
  });
  
  var mousemovePickerPalette = function(e) {
    var boundingRect = DOM.$8bitPicker.offset();
    var hoverData = pickerPaletteCtx.getImageData( e.pageX - boundingRect.left, e.pageY - boundingRect.top, 1, 1).data;
    var hoverRGB = getRGBColor(hoverData);
    DOM.$pixelSizeDemoDiv.css('background-image', 'none');
    DOM.$colorPickerDemo.css('background-image', 'none');
    DOM.$colorPickerDemo.css('background-color', hoverRGB);
    DOM.$hex.val(rgbToHex(hoverRGB));
  };
  
  // custom color chosen
  DOM.$8bitPicker.click(function(e) {
    var boundingRect = DOM.$8bitPicker.offset();
    var clickData = pickerPaletteCtx.getImageData( e.pageX - boundingRect.left, e.pageY - boundingRect.top, 1, 1).data;
    var newColor = getRGBColor(clickData);
    $('.'+classes.current).removeClass(classes.current);
    
    pixel.color = newColor;
    DOM.$colorPickerDemo.css('background-color', newColor);
    DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + newColor);
  });

  // hex color input change 
  DOM.$hex.keyup(hexColorChosen);
  DOM.$hex.focus(hexColorChosen);
  
  // color dropper clicked
  DOM.$dropper.click(function(e) {
    e.preventDefault();
    
    if ( DOM.$dropper.hasClass(classes.currentTool) ) {
      resetModes();
    }
    else {
      resetModes();
      mode.dropper = true;
      DOM.$dropper.addClass(classes.currentTool);
      DOM.$canvas.addClass(classes.dropperMode);
      
      DOM.$canvas.mousemove(function(e) {
        var hoverData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
        var hoverRGB = getRGBColor(hoverData);
        DOM.$dropper.css('background-color', hoverRGB);

        DOM.$pixelSizeDemoDiv.css('background-image', 'none');
        DOM.$colorPickerDemo.css({
          'background-image' : 'none',
          'background-color' : hoverRGB
        });
        DOM.$hex.val(rgbToHex(hoverRGB));
      });
    }
  });

  
  /* saving */

  // hide save modal container if exit button clicked
  DOM.$saveExit.click(function() {
    DOM.$saveModalContainer.hide();
    DOM.$linkImgur.attr('href', '').text('');
    DOM.$buttonSaveImgur.show();
  });
  
  // hide save modal container if clicking outside of modal
  DOM.$saveModalContainer.click(function(e) {
    var $target = $(e.target).context;
    if ( $target == DOM.$saveModalContainer[0] ) {
      $(this).hide();
    }
  });
  
  // save to imgur
  DOM.$buttonSaveImgur.click(function() {
    uploadToImgur();
  });

  
  /* misc */

  // tabs
  DOM.$tabs.children('li').click(function(e){
    var activeTab = $(this);
    var href = activeTab.attr('data-href');
    activeTab.siblings().removeClass(classes.activeTab);
    activeTab.addClass(classes.activeTab);

    var toHide = [];
    activeTab.siblings().each(function(){
      toHide.push($(this).attr('data-href'));
    });

    $(href).show();
    for ( var i = 0; i < toHide.length; i++ ) {
      $(toHide[i]).hide();
    }
  });

  // tooltip hover 
  DOM.$tips.hover(
    function() {
      $(this).find('.'+classes.tipText).stop().show();
    },
    function() {
      $(this).find('.'+classes.tipText).stop().hide();
    }
  );

  // canvas window size changes
  DOM.$window.resize(function() {
    if ( DOM.$window.width() <= windowCanvas.width && DOM.$window.height() <= windowCanvas.height ) {
      return;
    }
    else {
      // if local storage
      if ( !canStorage() || mode.save ) {
        return;
      }
      else {
        var newWidth = DOM.$window.width();
        var newHeight = DOM.$window.height();
        windowCanvas.width = newWidth;
        windowCanvas.height = newHeight;
        
        // save image
        saveToLocalStorage();
      
        DOM.$canvas
          .attr('width',newWidth)
          .attr('height',newHeight);
        DOM.$overlay
          .attr('width',newWidth)
          .attr('height',newHeight);
        ctxOverlay = DOM.$overlay[0].getContext('2d');
        ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
        
        // draw image
        drawFromLocalStorage();
      }
      
    }
  });

  // clear color history, palette and storage
  DOM.$colorHistoryTools.clearPalette.click(function(){
    colorHistory = [];
    DOM.$colorHistoryPalette.find('li').remove();
    localStorage.colorHistory = [];
    DOM.$colorHistoryModule.hide();
  });

  // export color history
  DOM.$colorHistoryTools.exportPalette.click(function(){
    console.log('export coming soon');
  });
  
  // clear custom colors palette
  DOM.$colorCustomTools.clearPalette.click(function(){
    DOM.$colorCustomPalette.find('li').remove();
  });
  
  // import custom colors palette
  DOM.$colorCustomTools.importPalette.on('change', function(e){
    
    // get the file submitted
    var file = $(this).prop('files')[0];
    
    // helper function to parse csv data
    var parseCSVData = function(data) {
      
      // since we have csv data, clear the current custom palette
      DOM.$colorCustomPalette.find('li').remove();
      
      // get csv text and parse
      var csv = data.target.result;
      var rows = csv.split(/\r\n|\n/);
      
      for ( var i = 0; i < rows.length; i++ ) {
        var dataPair = rows[i].split(',');
  
        // create button, set properties, and add to palette
        var $newCustomButton = $('<a>');
        $newCustomButton.attr({
          'class' : 'button color',
          'style' : 'background-color:#' + dataPair[1],
          'title' : dataPair[0],
          'data-color' : '#' + dataPair[1]
        });
        var $newCustomButtonContainer = $('<li>').append($newCustomButton);
        DOM.$colorCustomPalette.append($newCustomButtonContainer);
      }
      
      // set events to make these colors work
      DOM.$color = $('.'+classes.color);
      DOM.$color.click(bindColorClick);
    };

    // read the file if browser has the FileReader API
    if ( window.FileReader ) {

      fileReader = new FileReader();
      fileReader.readAsText(file);
      fileReader.onload = parseCSVData;
      fileReader.onerror = function() { alert('Unable to read file. Try again.'); };
    }
    else {
      alert('Your browser doesn\'t support FileReader, which is required for uploading custom palettes.');
    }
  });
  
  
  
  /*** INIT HA HA HA ***/
  DOM.$pickers.hide();
  DOM.$customPalettes.hide();
  generateCanvas();
  init8bitPicker();

  // check local storage for color history palette
  if ( canStorage() && localStorage.colorHistory ) {
    colorHistory = localStorage.colorHistory.split(',');
  }
  else {
    colorHistory = [];
    DOM.$colorHistoryModule.hide();
  }

  initColorHistoryPalette();
  initpixel(15);
  
  // init background
  var img = new Image();
  img.src = generateBackgroundGrid(pixel.size);
  img.onload = function updateCanvasBackground() {
    DOM.$canvas.css('background','url(' + img.src + ')');
  };

  // init hide toolboxes
  DOM.$whatbox.draggyBits('minimize');
  DOM.$savebox.draggyBits('minimize');
  
  historyPointer = -1;
  
  DOM.$canvas.mousedown(onMouseDown).mouseup(onMouseUp);
  DOM.$overlay.mousedown(onMouseDown).mouseup(onMouseUp);
  
  //touch
  DOM.$canvas[0].addEventListener('touchstart', onMouseDown, false);
  DOM.$canvas[0].addEventListener('touchend', onMouseUp, false);
  DOM.$overlay[0].addEventListener('touchstart', onMouseDown, false);
  DOM.$overlay[0].addEventListener('touchend', onMouseUp, false);
});

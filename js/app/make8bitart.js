/*
* make8bitart.com
* author: jenn schiffer
* turn down for #butts
*/

 (function($, key, window, document) {

  'use strict';

  var ctx, pickerPaletteCtx, savedCanvas, savedCanvasArray, clipboard, rectangleSelection, historyPointer, drawPathId, ctxOverlay, colorHistory;
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
    activeTab: 'active',
    hidden: 'hidden',
    local: 'local',
    deleteItem: 'delete'
  };

  var DOM = {
    $window : $(window),
    $body : $('body'),

    $header : $('#header'),
    $whatbox : $('#what'),
    $toolbox : $('#toolbox'),
    $filebox : $('#filebox'),
    $colorbox : $('#colorbox'),
    $waiting : $('#wait'),

    $tabs : $('.tabs button'),

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

    $toolButtons: $('.icon-button'),

    $pencil : $('#pencil'),
    $paint : $('#paint'),

    $buttonNewCanvas : $('#new-canvas'),
    $buttonSaveLocal : $('#save-local'),
    $buttonSaveFull : $('#save-full'),
    $buttonSaveSelection : $('#save-selection'),
    $buttonSaveImgur : $('#save-imgur'),
    $buttonOpenFile : $('#open-file'),
    $buttonOpenLocal : $('#open-local'),
    $buttonImportPXON : $('#import-pxon'),
    $buttonExportPXON : $('#export-pxon'),

    $pixelSizeInput : $('.pixel-size-input'),
    $pixelSizeDemoDiv : $('#pixel-size-demo'),

    $minimizedToolsList : $('#minimized-tools-list'),
    $draggydivs : $('.draggy'),
    $saveInstruction : $('.instructions.save'),
    $pasteInstructions : $('.instructions.paste'),

    $undo : $('#undo'),
    $redo : $('#redo'),

    $cut : $('#cut'),
    $copy : $('#copy'),
    $paste : $('#paste'),

    $modalContainers : $('.modal'),
    $modalExit : $('.modal .ui-hider'),

    $saveModalContainer : $('#save-modal-container'),
    $saveImg : $('#finished-art'),
    $linkImgur : $('#link-imgur'),

    $openLocalModalContainer : $('#open-modal-container'),
    $openFile: $('#open-file'),
    $openLocalForm : $('#open-local-form'),
    $openLocal: $('#open-local'),
    $openLocalGallery : $('#open-modal .gallery'),
    $openLocalGalleryItems : $('#open-modal .gallery li'),
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
    cut : 'cut',
    paste : 'paste',
    save : 'save',
    index : 0
  };

  var windowCanvas = {
    height: DOM.$window.height() - (DOM.$window.height() % 15),
    width: DOM.$window.width() - (DOM.$window.width() % 15),
    background: 'url("assets/bg.png")'
  };

  var copy = {
    selectionOff : 'turn off selection',
    selectionOn : 'save selection',
  };

  var pixel = {
    color: 'rgba(0, 0, 0, 1)',
  };

  var pxon = {
    exif: {
      software: 'http://make8bitart.com'
    },
    pxif: {
      pixels: []
    }
  };

  // you should register your own imgur app here https://api.imgur.com/
  var imgur = {
    clientId: '11112830fafe58a',
  };


  /*** OUTSIDE LIBRARY STUFF - DRAGGYDIVS ***/

  var onMinimizeToolsListClick = function(e) {
    var $this = $(this);
    var $elem = $this.data('draggy');
    $elem.draggyBits('restore');
    $this.parent().remove();
  };

  var onMinimize = function($elem) {
    var $a = $('<button role="button" tabindex="0" data-section="#' + $elem.attr('data-title') + '">').html($elem.attr('title')).on('click', onMinimizeToolsListClick).data('draggy', $elem);
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
  DOM.$filebox.css({
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
    })
    .addClass(classes.hidden);

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

      if ( background && background !== 'rgba(0, 0, 0, 0)') {
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

  var initPixel = function(size) {
    pixel.size = parseInt(size);
    DOM.$pixelSizeDemoDiv.css({
      width : pixel.size,
      height: pixel.size
    });
    DOM.$pixelSizeInput.val(pixel.size);

    var img = new Image();
    img.src = generateBackgroundGrid(pixel.size);
    img.onload = function updateCanvasBackground() {
      DOM.$canvas.css('background','url(' + img.src + ')');
    };
  };

  var drawPixel = function(x, y, color, size) {
    ctx.beginPath();
    x = ( Math.ceil(x/size) * size ) - size;
    y = ( Math.ceil(y/size) * size ) - size;
    ctx.moveTo (x, y);
    ctx.fillStyle = color;
    ctx.lineHeight = 0;

    if ( color === 'rgba(0, 0, 0, 0)' ) {
      ctx.clearRect(x,y,size,size);
    }
    else {
      ctx.fillRect(x,y,size,size);
    }

    return {
      x: x,
      y: y
    };
  };

  var drawOnMove = function(e) {
    var hoverData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
    var hoverRGB = getRGBColor(hoverData);

    if ( !areColorsEqual( hoverRGB, pixel.color, pixel.size) ) {
      drawPixel(e.pageX, e.pageY, pixel.color, pixel.size);
      pushToHistory(action.index, action.draw, e.pageX, e.pageY, hoverRGB, pixel.color, pixel.size, drawPathId, null, null);
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
      pushToHistory(action.index, action.fill, x + pixel.size - 1, y + pixel.size - 1, initColor, paintColor, pixel.size, null, null);
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
          ranges.push([rMinX, x-pixel.size, newY, downwards, rMinX === minX, false]);
          inRange = false;
        }
        if(inRange) {
          markPixel(x, newY, paintColor, 1);
        }
        // skip
        if(!isNext && x === current[0]) {
          x = current[1];
        }
      }
      if(inRange) {
        ranges.push([rMinX, x-pixel.size, newY, downwards, rMinX === minX, true]);
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

  var drawToCanvas = function(src, x, y, clear) {
    if ( clear ) {
      ctx.clearRect(0, 0, DOM.$canvas.width(), DOM.$canvas.height());
    }

    var img = new Image();
    img.onload = function() {
      ctx.drawImage(img, x, y);
    };
    img.src = src;
  };

  var drawFromLocalStorage = function() {
    var savedCanvas = localStorage.make8bitartSavedCanvas;
    if ( savedCanvas ) {
      drawToCanvas(savedCanvas, 0, 0, true);
    }
  };

  var pushToHistory = function( actionIndex, actionType, x, y, rgbOriginal, rgbNew, pixelSize, drawPathId, srcOriginal, srcNew) {
    // push to undoRedoHistory, will also become pxon.pxif.pixels
    var pixelDrawn = {
      index: actionIndex,
      action: actionType,
      x: x,
      y: y,
      originalColor: rgbOriginal,
      color: rgbNew,
      size: pixelSize,
      drawPathId: drawPathId,
      originalSrc: srcOriginal,
      src: srcNew
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
      undoRedoColor = undoRedoHistory[pointer].color;
      nextPointer = pointer + 1;
    }

    if ( undoRedoHistory[pointer].action === action.cut || undoRedoHistory[pointer].action === action.paste ) {
      // for cut and paste, original color is original canvas, color is new canvas lol sorry
      if ( undoFlag ) {
        drawToCanvas(undoRedoHistory[pointer].originalSrc, 0, 0, true);
      }
      else {
        drawToCanvas(undoRedoHistory[pointer].src, 0, 0, true);
      }
      return;
    }

    if ( undoRedoHistory[pointer].action === action.fill && undoRedoHistory[nextPointer] && undoRedoHistory[pointer].index === undoRedoHistory[nextPointer].index ) {
      if ( undoFlag ) {
        historyPointer--;
      }
      else {
        historyPointer++;
      }
      undoRedo(historyPointer, undoFlag);
    }

    drawPixel(undoRedoHistory[pointer].x, undoRedoHistory[pointer].y, undoRedoColor, undoRedoHistory[pointer].size);

    if (undoRedoHistory[pointer].drawPathId &&
        undoRedoHistory[nextPointer] &&
        undoRedoHistory[nextPointer].drawPathId === undoRedoHistory[pointer].drawPathId) {
      if (undoFlag) {
        undoRedo(--historyPointer, undoFlag);
      }
      else {
        undoRedo(++historyPointer, undoFlag);
      }
    }
  };

  var resetModes = function() {
    if ( mode.dropper ) {
      DOM.$dropper.removeAttr('style');
      DOM.$canvas.removeClass(classes.dropperMode);
      mode.dropper = false;
      var backgroundIMG;

      if ( pixel.color !== 'rgba(0, 0, 0, 0)' ) {
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
    else if ( mode.copy || mode.cut ) {
      DOM.$overlay.addClass(classes.hidden);
    }
    else if ( mode.paste ) {
      DOM.$pasteInstructions.addClass(classes.hidden);
    }

    for (var prop in mode) {
      if ( mode.hasOwnProperty(prop) ){
        mode[prop] = false;
      }
    }

    DOM.$toolButtons.removeClass(classes.currentTool);
  };

  var init8bitPicker = function() {
    // turns palette into canvas
    pickerPaletteCtx = DOM.$8bitPicker[0].getContext('2d');
    var img = new Image();
      img.onload = function() {
        pickerPaletteCtx.drawImage(img,0,0);
      };
      // NOTE: original png is assets/customcolors.png. using data uri so it works in different directories
      img.src = 'data:image/png;base64,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';
  };

  var initColorHistoryPalette = function() {
    if ( colorHistory.length === 0 ) {
      return;
    }
    else {
      // make all color history values consistently hex without hash
      var sanitizedColors = sanitizeColorArray(colorHistory);

      sanitizedColors.forEach(function(color){
        var latestColorButton = $('<li><button role="button" class="button color" style="background-color:#' + color + '" title="history:#' + color + '" data-color="#' + color + '" /> </button></li>');
        DOM.$colorHistoryPalette.append(latestColorButton);
      });

      // bind click to color buttons
      DOM.$color = $('.'+classes.color);
      DOM.$color.click(bindColorClick);
    }
  };

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

  var generateSelection = function(e, mode) {
    rectangleSelection.endX = roundToNearestPixel(e.pageX);
    rectangleSelection.endY = roundToNearestPixel(e.pageY);

    // temporary canvas to save image
    DOM.$body.append('<canvas id="' + classes.selectionCanvas + '"></canvas>');
    var $tempCanvas = $('#' + classes.selectionCanvas);
    var tempCtx = $tempCanvas[0].getContext('2d');

    // set dimensions and draw based on selection
    var width = Math.abs(rectangleSelection.endX - rectangleSelection.startX);
    var height = Math.abs(rectangleSelection.endY - rectangleSelection.startY);
    $tempCanvas[0].width = width;
    $tempCanvas[0].height = height;

    var startX = Math.min( rectangleSelection.startX, rectangleSelection.endX );
    var startY = Math.min( rectangleSelection.startY, rectangleSelection.endY );

    if ( width && height ) {
      tempCtx.drawImage(DOM.$canvas[0], startX, startY, width, height, 0, 0, width, height);
      var img = $tempCanvas[0].toDataURL('image/png');

      if ( mode === action.save ) {
        displayFinishedArt(img);
        DOM.$buttonSaveSelection.click();
        DOM.$saveModalContainer.removeClass(classes.hidden);
      }
      else {
        clipboard = new Image();
        clipboard.src = img;

        if ( mode === action.cut ) {
          var originalImage = DOM.$canvas[0].toDataURL('image/png');
          ctx.clearRect(startX, startY, width, height);
          DOM.$cut.click();

          // add "cut" action to undo/redo array
          var newImage = DOM.$canvas[0].toDataURL('image/png');
          action.index++;
          drawPathId = Date();
          pushToHistory( action.index, action.cut, 0, 0, null, null, null, drawPathId, originalImage, newImage);

          // save to local storage
          saveToLocalStorage();
        }

        if ( mode === action.copy ) {
          // trigger copy click
          DOM.$copy.click();
        }
      }
    }

    // remove tempCanvas
    $tempCanvas.remove();
  };

  var drawSelection = function(e) {
    rectangleSelection.w = roundToNearestPixel((e.pageX - this.offsetLeft) - rectangleSelection.startX);
    rectangleSelection.h = roundToNearestPixel((e.pageY - this.offsetTop) - rectangleSelection.startY);
    ctxOverlay.clearRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
    ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
    ctxOverlay.fillRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
    ctxOverlay.clearRect(rectangleSelection.startX, rectangleSelection.startY, rectangleSelection.w, rectangleSelection.h);
  };

  var displayFinishedArt = function(src) {
    DOM.$saveImg.attr('src', src);
    DOM.$saveImg.parent().attr('href', src);
    DOM.$saveModalContainer.removeClass(classes.hidden);
    DOM.$saveModalContainer.find('.ui-hider').focus();
  };

  var renderLocalGallery = function() {
    if ( savedCanvasArray.length === 0 ) {
      DOM.$openLocalModalContainer.addClass(classes.hidden);
      DOM.$openLocalForm.addClass(classes.hidden);
      return;
    }

    DOM.$openLocalForm.removeClass(classes.hidden);
    DOM.$openLocalGalleryItems.remove();

    for( var i = 0; i < savedCanvasArray.length; i++ ) {
      var $li = $('<li data-local="' + i + '">' +
        '<button role="button" class="thumb"><img src="' + savedCanvasArray[i] + '" alt="open thumbnail #' + i + '" /></button>' +
        '<button role="button" class="delete"><img class="delete" src="assets/draggybits/hider.png" alt="delete thumbnail #' + i + '"></button>' +
      '</li>');
      DOM.$openLocalGallery.append($li);
    }

    DOM.$openLocalGalleryItems = DOM.$openLocalGallery.find('li');
    DOM.$openLocalGalleryItemThumbs = DOM.$openLocalGallery.find('.thumb');
    DOM.$openLocalGalleryItemDelete = DOM.$openLocalGallery.find('.delete');

    DOM.$openLocalGalleryItemThumbs.click(function(){
      var img = savedCanvasArray[$(this).parent('li').data('local')];
      drawToCanvas(img, 0, 0, true);
      DOM.$openLocalModalContainer.addClass(classes.hidden);
    });

    // delete locally
    DOM.$openLocalGalleryItemDelete.click(function() {
      if ( window.confirm('Careful! This will permanently delete this thumbnail\'s art from your browser.') ) {
        savedCanvasArray.splice($(this).parent('li').data('local'), 1);
        localStorage.make8bitartSavedCanvasArray = JSON.stringify(savedCanvasArray);
        savedCanvasArray = JSON.parse(localStorage.make8bitartSavedCanvasArray);
        renderLocalGallery();
      }
    });
  };

  var saveToLocalStorage = function() {
    if ( canStorage() ) {
      savedCanvas = DOM.$canvas[0].toDataURL('image/png');
      localStorage.make8bitartSavedCanvas = savedCanvas;
    }
  };

  var saveToLocalStorageArray = function() {
    if ( canStorage() ) {
      //parsejson
      if ( localStorage.make8bitartSavedCanvasArray ) {
        savedCanvasArray = JSON.parse(localStorage.make8bitartSavedCanvasArray);
      }
      else {
        savedCanvasArray = [];
      }

      //push
      savedCanvasArray.push(DOM.$canvas[0].toDataURL('image/png'));

      //stringify
      localStorage.make8bitartSavedCanvasArray = JSON.stringify(savedCanvasArray);
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
        var directURL = result.data.link;
        var shareURL = 'https://imgur.com/gallery/' + result.data.id;
        var imgurHTML = '<p>imgur page: <a target="_blank" href="' + shareURL + '">' + shareURL + '</a><br />' +
                            'direct image link: <a target="_blank" href="' + directURL + '">' + directURL + '</a></p>';
        DOM.$linkImgur.html( imgurHTML);
        DOM.$buttonSaveImgur.addClass(classes.hidden);
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

  var rgbToHex = function( rgb ) {
    if ( rgb.length === 6 ) {
      return rgb;
    }
    else if ( rgb.charAt(0) === '#' && rgb.length === 7 ) {
      return rgb.slice(1,7);
    }
    else if ( rgb === 'transparent' ) {
      return null;
    }
    else {
      var startString = ( rgb.charAt(3) === 'a' ) ? 5 : 4;
      var rgbArray = rgb.substr(startString, rgb.length - 5).split(',');
      var hex = '';
      for ( var i = 0; i <= 2; i++ ) {
        var hexUnit = parseInt(rgbArray[i],10).toString(16);
        if ( hexUnit.length === 1 ) {
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
    DOM.$color.removeClass(classes.current);
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
    if ( ( alpha === 'rgba(0, 0, 0, 0)' && ( beta === '#000000' || beta === 'rgba(0, 0, 0, 1)' ) ) ||
      ( ( alpha === '#000000' || alpha === 'rgba(0, 0, 0, 1)' ) && beta === 'rgba(0, 0, 0, 0)' )  ||
       rgbToHex(alpha) !== rgbToHex(beta) ) {
      return false;
    }
    else {
      return true;
    }
  };

  var updateColorHistoryPalette = function() {
    var hexColor = rgbToHex(pixel.color);
    var colorHistoryPos = colorHistory.indexOf(hexColor);
    if ( colorHistoryPos === -1 ) {
      if ( colorHistory.length === 20 ) {
        colorHistory.pop();
        DOM.$colorHistoryPalette.find('li').eq(19).remove();
      }
    }
    else {
      colorHistory.splice(colorHistoryPos, 1);
      DOM.$colorHistoryPalette.find('li').eq(colorHistoryPos).remove();
    }

    colorHistory.unshift(hexColor);

    var latestColorButton = $('<li><button role="button" class="button color" style="background-color:#' + hexColor + '" title="history:#' + hexColor + '" data-color="#' + hexColor + '" /> </button></li>');
    DOM.$colorHistoryPalette.prepend(latestColorButton);
    latestColorButton.find('a').addClass(classes.current);

    // bind click to new colors
    DOM.$color = $('.'+classes.color);
    DOM.$color.click(bindColorClick);
    DOM.$colorHistoryModule.removeClass(classes.hidden);

    // save to local storage
    if ( canStorage() ) {
      localStorage.colorHistory = colorHistory;
    }
  };


  /* pxon */

  var getFileData = function(file) {
    if ( window.FileReader ) {
      var fileReader = new FileReader();
      fileReader.readAsText(file);
      fileReader.onload = function(data){
        if (data) {
          pxon = JSON.parse(data.target.result);
          historyPointer = undoRedoHistory.length - 1;

          // prefill the export fields
          /*$('.exif.artist').val(pxon.exif.artist);
          $('.exif.imageDescription').val(pxon.exif.imageDescription);
          $('.exif.userComment').val(pxon.exif.userComment);
          $('.exif.copyright').val(pxon.exif.copyright);*/

          // draw image to reset canvas
          resetCanvas();
          pxon.pxif.pixels.forEach(function(e, i, a){
            drawPixel(e.x, e.y, e.color, e.size );
          });
        }
      };
      fileReader.onerror = function() { alert('Unable to read file. Try again.'); };
    }
    else {
      alert('Your browser doesn\'t support FileReader, which is required for uploading custom palettes.');
    }
  };

  var importPXON = function(e) {
    var file = $(this).prop('files')[0];
    getFileData(file);
  };

  var exportPXON = function(e) {
    // FUTURE: show modal for form
    /*pxon.exif.artist = $('.exif.artist').val();
    pxon.exif.imageDescription = $('.exif.imageDescription').val();
    pxon.exif.userComment = $('.exif.userComment').val();
    pxon.exif.copyright = $('.exif.copyright').val();*/

    // other exif info
    pxon.exif.software = 'make8bitart.com';
    pxon.exif.dateTime = new Date();
    pxon.exif.dateTimeOriginal = ( pxon.exif.dateTimeOriginal ) ? pxon.exif.dateTimeOriginal : pxon.exif.dateTime;

    // pxif
    pxon.pxif.pixels = drawHistory;

    // export pxon in new window
    window.open('data:text/json,' + encodeURIComponent(JSON.stringify(pxon)), '_blank');
  };


  /*** EVENTS ***/

  /* general */

  var onMouseDown = function(e) {
    e.preventDefault();

    if ( e.which === 3 ) {
      return;
    }

    var origData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
    var origRGB = getRGBColor(origData);

    if ( mode.dropper ) {
      mode.dropper = false;
      setDropperColor( origRGB );
      DOM.$canvas.removeClass(classes.dropperMode);
      DOM.$dropper.removeClass(classes.currentTool).removeAttr('style');
    }
    else if ( mode.paste ) {
      var x = ( Math.ceil(e.pageX/pixel.size) * pixel.size ) - pixel.size;
      var y = ( Math.ceil(e.pageY/pixel.size) * pixel.size ) - pixel.size;

      var originalImage = DOM.$canvas[0].toDataURL('image/png');
      ctx.drawImage(clipboard, x, y);

      // reset history
      undoRedoHistory = undoRedoHistory.slice(0, historyPointer+1);
      DOM.$redo.attr('disabled','disabled');

      // add action to undo/redo
      var newImage = DOM.$canvas[0].toDataURL('image/png');
      action.index++;
      drawPathId = Date();
      pushToHistory( action.index, action.paste, 0, 0, null, null, null, drawPathId, originalImage, newImage);

      // save to local storage
      saveToLocalStorage();

      DOM.$paste.click();
    }
    else if ( !mode.save && !mode.copy && !mode.cut ) {
      // reset history
      undoRedoHistory = undoRedoHistory.slice(0, historyPointer+1);
      DOM.$redo.attr('disabled','disabled');

      if ( mode.paint && !areColorsEqual( origRGB, pixel.color ) ) {
        action.index++;
        paint( e.pageX, e.pageY, pixel.color, origRGB );
      }
      else {
        drawPathId = Date.now();

        // draw mode
        mode.drawing = true;

        action.index++;
        drawPixel(e.pageX, e.pageY, pixel.color, pixel.size);

        if ( !areColorsEqual( origRGB, pixel.color) ) {
          pushToHistory(action.index, action.draw, e.pageX, e.pageY, origRGB, pixel.color, pixel.size, drawPathId, null, null);
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
      rectangleSelection = {};
      rectangleSelection.startX = roundToNearestPixel(e.pageX - this.offsetLeft);
      rectangleSelection.startY = roundToNearestPixel(e.pageY - this.offsetTop);
      DOM.$overlay.on('mousemove', drawSelection);

      // touch
      DOM.$overlay[0].addEventListener('touchmove', drawSelection, false);
    }

  };

  var onMouseUp = function(e) {
    if ( mode.paste ) {
      return;
    }

    if ( !mode.save && !mode.copy && !mode.cut ) {
      DOM.$canvas.off('mousemove');
      mode.drawing = false;
      drawPathId = null;

      saveToLocalStorage();
    }
    else {
      DOM.$overlay.off('mousemove');
      ctxOverlay.clearRect(0, 0, DOM.$overlay.width(), DOM.$overlay.height());

      if ( mode.save ) {
        generateSelection(e, 'save');
      }
      else if ( mode.copy ) {
        generateSelection(e, 'copy');
      }
      else if ( mode.cut ) {
        generateSelection(e, 'cut');
      }
    }
  };

  var onRightClick = function(e) {
    resetModes();
    var origData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
    var origRGB = getRGBColor(origData);

    setDropperColor(origRGB);

    DOM.$canvas.removeClass(classes.dropperMode);
    DOM.$dropper.removeClass(classes.currentTool).removeAttr('style');

    return false;
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
    initPixel( $(this).val() );
  });

  // reset canvas
  DOM.$buttonNewCanvas.click(function() {
    resetCanvas( pixel.color );
    saveToLocalStorage();
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
    if ( historyPointer === undoRedoHistory.length - 1 ) {
      DOM.$redo.attr('disabled', 'disabled');
    }
  });

  // cut
  DOM.$cut.click(function() {
    resetModes();
    if ( mode.cut ) {
      mode.cut = false;
      $(this).removeClass(classes.currentTool);
      DOM.$overlay.addClass(classes.hidden);
    }
    else {
      mode.cut = true;
      ctxOverlay.fillRect(0, 0, DOM.$overlay.width(), DOM.$overlay.height());
      $(this).addClass(classes.currentTool);
      DOM.$overlay.removeClass(classes.hidden);
    }
  });

  // copy
  DOM.$copy.click(function() {
    resetModes();
    if ( mode.copy ) {
      mode.copy = false;
      $(this).removeClass(classes.currentTool);
      DOM.$overlay.addClass(classes.hidden);
    }
    else {
      mode.copy = true;
      ctxOverlay.fillRect(0, 0, DOM.$overlay.width(), DOM.$overlay.height());
      $(this).addClass(classes.currentTool);
      DOM.$overlay.removeClass(classes.hidden);
    }
  });

  // paste
  DOM.$paste.click(function() {
    if ( !clipboard ) {
      return;
    }
    resetModes();

    if ( !mode.paste ) {
      mode.paste = true;
      $(this).addClass(classes.currentTool);

      // show instructions
      DOM.$pasteInstructions.addClass(classes.hidden);
    }

  });

  // undo alias to ctrl+z, macs aliased to cmd+z
  key('ctrl+z, ⌘+z', triggerClickForEnabled(DOM.$undo));

  // redo alias to ctrl+y and mac aliased cmd+shift+z
  key('ctrl+y, ⌘+shift+z', triggerClickForEnabled(DOM.$redo));

  // close save modal alias to esc
  key('esc', function(){ DOM.$modalContainers.addClass(classes.hidden); });

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

    if ( pixel.color !== 'rgba(0, 0, 0, 0)' ) {
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


  /* importing and exporting */

  // save locally
  DOM.$buttonSaveLocal.click(function() {
    saveToLocalStorageArray();
    renderLocalGallery();

    alert('Your art has been saved locally to your browser. You can see all locally saved art by clicking the "open existing art" button!');
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
      DOM.$overlay.addClass(classes.hidden);
    }
    else {
      resetModes();
      mode.save = true;
      DOM.$saveInstruction.slideDown();
      $(this).val(copy.selectionOff);
      ctxOverlay.fillRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
      DOM.$overlay.removeClass(classes.hidden);
    }
  });

  // open import local modal
  DOM.$buttonOpenLocal.click(function(){
    DOM.$openLocalModalContainer.removeClass(classes.hidden);
    DOM.$openLocalModalContainer.find('.ui-hider').focus();
  });

  // import pxon
  DOM.$buttonImportPXON.change(importPXON);

  // export pxon
  DOM.$buttonExportPXON.click(exportPXON);

  // hide save modal container if exit button clicked
  DOM.$modalExit.click(function() {
    DOM.$modalContainers.addClass(classes.hidden);
    DOM.$linkImgur.html('');
    DOM.$buttonSaveImgur.removeClass(classes.hidden);
  });

  // hide save modal container if clicking outside of modal
  DOM.$modalContainers.click(function(e) {
    var target = $(e.target).context;
    if ( target === DOM.$saveModalContainer[0] || target === DOM.$openLocalModalContainer[0] ) {
      $(this).addClass(classes.hidden);
    }
  });

  // save to imgur
  DOM.$buttonSaveImgur.click(function() {
    uploadToImgur();
  });


  /* misc */

  // tabs
  DOM.$tabs.click(function(e){
    var activeTab = $(this);
    var href = activeTab.attr('data-href');
    activeTab.siblings().removeClass(classes.activeTab);
    activeTab.addClass(classes.activeTab);

    var toHide = [];
    activeTab.siblings().each(function(){
      toHide.push($(this).attr('data-href'));
    });

    $(href).removeClass(classes.hidden);
    for ( var i = 0; i < toHide.length; i++ ) {
      $(toHide[i]).addClass(classes.hidden);
    }
  });

  // canvas window size changes
  DOM.$window.resize(function() {
    if ( DOM.$window.width() - (DOM.$window.width() % pixel.size) <= windowCanvas.width && DOM.$window.height() - (DOM.$window.height() % pixel.size) <= windowCanvas.height ) {
      return;
    }
    else {
      // if local storage
      if ( !canStorage() || mode.save ) {
        return;
      }
      else {
        var newWidth = DOM.$window.width() - (DOM.$window.width() % pixel.size);
        var newHeight = DOM.$window.height() - (DOM.$window.height() % pixel.size);
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
    DOM.$colorHistoryModule.addClass(classes.hidden);
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
      var fileReader = new FileReader();
      fileReader.readAsText(file);
      fileReader.onload = parseCSVData;
      fileReader.onerror = function() { alert('Unable to read file. Try again.'); };
    }
    else {
      alert('Your browser doesn\'t support FileReader, which is required for uploading custom palettes.');
    }
  });



  /*** INIT HA HA HA ***/
  DOM.$customPalettes.addClass(classes.hidden);
  generateCanvas();
  init8bitPicker();

  // check local storage for color history palette
  if ( canStorage() && localStorage.colorHistory ) {
    colorHistory = localStorage.colorHistory.split(',');
  }
  else {
    colorHistory = [];
    DOM.$colorHistoryModule.addClass(classes.hidden);
  }

  initColorHistoryPalette();
  initPixel(15);

  // init hide toolboxes
  DOM.$whatbox.draggyBits('minimize');
  DOM.$filebox.draggyBits('minimize');

  // only show the following in draggy divs if local storage exists
  if ( !canStorage() ) {
    $('.'+classes.local).addClass(classes.hidden);
  }
  else {
    if ( localStorage.make8bitartSavedCanvasArray && localStorage.make8bitartSavedCanvasArray !== '[]' ) {
      // draw local storage gallery
      savedCanvasArray = JSON.parse(localStorage.make8bitartSavedCanvasArray);
      renderLocalGallery();

      // open local storage gallery
      DOM.$buttonOpenLocal.trigger('click');
    }
    else {
      DOM.$openLocalForm.addClass(classes.hidden);
    }
  }

  historyPointer = -1;

  DOM.$canvas.mousedown(onMouseDown).mouseup(onMouseUp);
  DOM.$overlay.mousedown(onMouseDown).mouseup(onMouseUp);
  DOM.$canvas.on('contextmenu', onRightClick);

  //touch
  DOM.$canvas[0].addEventListener('touchstart', onMouseDown, false);
  DOM.$canvas[0].addEventListener('touchend', onMouseUp, false);
  DOM.$overlay[0].addEventListener('touchstart', onMouseDown, false);
  DOM.$overlay[0].addEventListener('touchend', onMouseUp, false);

}(window.jQuery, window.key, window, document));

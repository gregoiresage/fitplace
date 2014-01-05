$(function(){

	/*** VARIABULLS ***/

	var colorJennsPick = $('.button.color.favorite').css('background-color');
	var ctx, leftSide, topSide, xPos, yPos, resetSelectStart, saveSelection, rect, historyPointer;
	var history = [];

	var DOM = {
		$window : $(window),
		$body : $('body'),
		
		$header : $('#header'),
		$credits : $('#credits'),
		$toolbox : $('#toolbox'),
		$savebox : $('#savebox'),
		$colorbox : $('#colorbox'),
		
		$color : $('.color').not('.custom'),
		$colorCustom : $('.color.custom'),
		$colorPicker : $('#colorpicker'),
		$colorPickerDemo : $('.color-demo'),
		$hex : $('#hex-color'),
		$dropper : $('#color-dropper'),

		$buttonNewCanvas : $('#new-canvas'),
		$buttonSaveFull : $('#save-full'),
		$buttonSaveSelection : $('#save-selection'),
		
		$pixelSizeInput : $('.pixel-size-input'),
		$pixelSizeDemoDiv : $('#pixel-size-demo'),
		
		$minimizedToolsList : $('#minimized-tools-list'),
		$draggydivs : $('.draggy'),
		$tips : $('.tip'),		
		$saveInstruction : $('.instructions').slideUp(),
		
		$undo : $('#undo'),
		$redo : $('#redo')
	};
	
	var mode = {
		dropper : false,
		drawing : false,
		save : false,
		fill : false,
		trill : true
	};
	
	var action = {
		draw : "draw",
		fill : "fill",
	}

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
	
	var classes = {
		selectionCanvas : 'selectionCanvas'
	};
	
	var pixel = {
		color: 'rgb(0, 0, 0)',
	};

	
	/*** OUTSIDE LIBRARY STUFF - DRAGGYDIVS & PIXELDIV***/
	var onMinimizeToolsListClick = function (e) {
			var $this = $(this);
			var $elm = $this.data("draggy");
			$elm.draggyBits('restore');
			$this.parent().remove();
	};
	var onMinimize = function ($elm) {
		var $a = $("<a>").html($elm.attr("title")).on('click', onMinimizeToolsListClick).data("draggy", $elm);
		$('<li></li>').append($a).appendTo(DOM.$minimizedToolsList)
	};
	DOM.$draggydivs.draggyBits({onMinimize:onMinimize});


	// if mouse up is on toolboxes, don't keep drawing
	DOM.$draggydivs.mouseup(function(){
		DOM.$canvas.off('mousemove');
	});
	
	DOM.$colorPicker.children('img').pixelDiv({
        hideIMG : true,        
        pixelSize : 9,
        divID : $(this).parent().attr('id'),
        divClass : 'clearfix',
    });
    
    DOM.$colorPicker;
    DOM.$colorPickerPixels = $('.pixelDiv-pixel');

	
	
	/*** DRAGGY POSITIONS ***/
	
	DOM.$header.css({
		'left': '200px',
		'top' : '20px'
	});
	DOM.$credits.css({
		'left' : '480px',
		'top' : '120px'	
	});
	DOM.$toolbox.css({
		'left' : '30px',
		'top' : '120px'
	});
	DOM.$colorbox.css({
		'left' : '750px',
		'top' : '50px'
	});

	

	/*** FUNCTIONS WOWOWOW ***/
	
	/* canvas & drawing */

	var generateCanvas = function() {
		
		// drawing
		DOM.$canvas = $('<canvas id="canvas" width="' + windowCanvas.width + '" height="' + windowCanvas.height + '">Your browser doesn\'t support canvas. Boo-hiss.</canvas>');
		DOM.$canvas.css('background',windowCanvas.background);
		DOM.$body.prepend( DOM.$canvas );
		ctx = DOM.$canvas[0].getContext("2d");
		
		// selection save overlay
		DOM.$overlay = $('<canvas id="overlay" width="' + windowCanvas.width + '" height="' + windowCanvas.height + '"></canvas>');
		DOM.$overlay.css({
			'background':'none',
			'position' : 'absolute',
			'top' : 0,
			'left' : 0,
			'display' : 'none'
		});
		DOM.$body.prepend( DOM.$overlay );
		ctxOverlay = DOM.$overlay[0].getContext("2d");
		ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
		
		// restore webstorage data
		if ( canStorage() ) {
			drawFromLocalStorage();
		}
	};
	
	var resetCanvas = function(background) {
		
		if ( window.confirm('You cannot undo canvas resets. Are you sure you want to erase this entire drawing?') ) {
			ctx.clearRect(0, 0, DOM.$canvas.width(), DOM.$canvas.height());	
			
			if ( background && background != 'rgb(0, 0, 0, 0)') {
				windowCanvas.background = background;
				ctx.fillStyle = background;
				ctx.fillRect(0,0,DOM.$canvas.width(),DOM.$canvas.height());
			}
			
			// reset history
			history = [];
			historyPointer = -1;
			DOM.$redo.attr('disabled', 'disabled');
			DOM.$undo.attr('disabled', 'disabled');
		}
	};
	
	var initpixel = function(size) {
		pixel.size = size;
		DOM.$pixelSizeDemoDiv.css({
			'width' : pixel.size,
			'height': pixel.size
		});
		DOM.$pixelSizeInput.val(pixel.size);
	};

	var drawPixel = function(xPos, yPos, color) {
		ctx.beginPath();  
	    xPos = ( Math.ceil(xPos/pixel.size) * pixel.size ) - pixel.size;
	    yPos = ( Math.ceil(yPos/pixel.size) * pixel.size ) - pixel.size;
		ctx.moveTo (xPos, yPos);          
		ctx.fillStyle = color;
		ctx.lineHeight = 0;
		
		if ( color == 'rgb(0, 0, 0, 0)' ) {
			ctx.clearRect(xPos,yPos,pixel.size,pixel.size);
		}
		else {
			ctx.fillRect(xPos,yPos,pixel.size,pixel.size);
		}
		
	};
	
	var drawOnMove = function(e) {
		var hoverData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
		var hoverRGB = 'rgb(' + hoverData[0] + ', ' + hoverData[1] + ', ' + hoverData[2] + ')';
		if ( hoverData[3] == 0 ) {
			hoverRGB = 'rgb(' + hoverData[0] + ', ' + hoverData[1] + ', ' + hoverData[2] + ', ' + hoverData[3] + ')';
		}
		
		if ( rgbToHex(hoverRGB) != rgbToHex(pixel.color) || 
				( hoverRGB == 'rgb(0, 0, 0, 0)' && ( pixel.color == 'rgb(0, 0, 0)' || pixel.color == '#000000') ) || 
				( (hoverRGB == 'rgb(0, 0, 0)' || hoverRGB == '#000000') && pixel.color == 'rgb(0, 0, 0, 0)' ) ) {
			drawPixel(e.pageX, e.pageY, pixel.color);
			pushToHistory(action.draw, e.pageX, e.pageY, hoverRGB, pixel.color);
		}
	
	}

	var canStorage = function() {
		try {
			return 'localStorage' in window && window['localStorage'] !== null;
		} 
		catch (e) {
			return false;
		}
	}
	
	var drawFromLocalStorage = function() {
		var savedCanvas = localStorage['make8bitartSavedCanvas'];	
		if ( savedCanvas ) {
			var img = new Image;
			img.onload = function(){
				ctx.drawImage(img,0,0);
			};
			img.src = savedCanvas;
		}	
	};
	
	var pushToHistory = function( actionType, x, y, rgbOriginal, rgbNew) {
		// push to history
		history.push({
			action : actionType,
			xPos : x,
			yPos : y,
			originalColor : rgbOriginal,
			newColor : rgbNew
		});
		historyPointer++;
		DOM.$undo.removeAttr('disabled');
	};

	var undoRedo = function(pointer, undoFlag) {

		if ( undoFlag ) {
		    var undoRedoColor = history[pointer].originalColor;
		}
		else {
			var undoRedoColor = history[pointer].newColor;
		}
		drawPixel(history[pointer].xPos, history[pointer].yPos, undoRedoColor);
	};

	
	/* saving */
	
	var startSaveSelection = function(e) {
		saveSelection = {
			startX : e.pageX,
			startY : e.pageY 
		};
	};
	
	var generateSaveSelection = function(e) {
		
		saveSelection.endX = e.pageX;
		saveSelection.endY = e.pageY;

		generateSelectionCanvas(saveSelection);
		DOM.$buttonSaveSelection.click();
	};
	
	var generateSelectionCanvas = function(coords) {
		
		// temporary canvas to save image
		DOM.$body.append('<canvas id="' + classes.selectionCanvas + '"></canvas>');
		var tempCanvas = $('#' + classes.selectionCanvas);
        var tempCtx = tempCanvas[0].getContext("2d");

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
		    var img = tempCanvas[0].toDataURL("image/png");
		    window.open(img,'_blank');
		}
	    
	    // remove tempCanvas
	    tempCanvas.remove();
	};

	var drawSelection = function(e) {
		rect.w = (e.pageX - this.offsetLeft) - rect.startX;
		rect.h = (e.pageY - this.offsetTop) - rect.startY ;
		ctxOverlay.clearRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
		ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
		ctxOverlay.fillRect(0,0,DOM.$overlay.width(),DOM.$overlay.height());
		ctxOverlay.clearRect(rect.startX, rect.startY, rect.w, rect.h);
	};
	
	var saveToLocalStorage = function() {
		if ( canStorage() ) {
			savedCanvas = DOM.$canvas[0].toDataURL("image/png");
			localStorage['make8bitartSavedCanvas'] = savedCanvas;
		}
	};
	
	
	/* colors */
	
	var rgbToHex = function( rgb ) {
		if ( rgb.charAt(0) == '#' ) {
			return rgb.slice(1,7); 
		}
		
        var rgbArray = rgb.substr(4, rgb.length - 5).split(',');
        var hex = "";
        for ( var i = 0; i <= 2; i++ ) {
            var hexUnit = parseInt(rgbArray[i]).toString(16);
            if ( hexUnit.length == 1 ) {
                hexUnit = '0' + hexUnit;
            }
            hex += hexUnit;
        }
        return hex;
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
		$('.current').removeClass('current');
		DOM.$hex.addClass('current');
		
		pixel.color = newColor;
		DOM.$colorPickerDemo.css('background-color', newColor);
		DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + newColor);
	};
	
	
	
	/*** EVENTS OH MAN ***/
	
	/* general */
	
	var onMouseDown = function(e) {
		e.preventDefault();
		
		var origData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
		var origRGB = 'rgb(' + origData[0] + ', ' + origData[1] + ', ' + origData[2] + ')';
		
		if ( origData[3] == 0 ) {
			origRGB = 'rgb(' + origData[0] + ', ' + origData[1] + ', ' + origData[2] + ', ' + origData[3] + ')';
		}
		
			
		if ( mode.dropper ) {
			mode.dropper = false;
			setDropperColor( origRGB )
			DOM.$canvas.removeClass('dropper-mode');
			DOM.$dropper.removeClass('current').removeAttr('style');
		}
		else if ( !mode.save ) {
			
			mode.drawing = true;
			
			// reset history
			history = history.slice(0, historyPointer+1);
			DOM.$redo.attr('disabled','disabled');

			drawPixel(e.pageX, e.pageY, pixel.color);
			if ( origRGB != pixel.color ) {
				pushToHistory(action.draw, e.pageX, e.pageY, origRGB, pixel.color);			
			}
			
			DOM.$canvas.on('mousemove', drawOnMove);
			
			// touch
			DOM.$canvas[0].addEventListener('touchmove', drawOnMove, false);
		}
		else {
			// overlay stuff
			rect = {};
			startSaveSelection(e);	
			rect.startX = e.pageX - this.offsetLeft;
			rect.startY = e.pageY - this.offsetTop;
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
	
	// pixel size slider changed
	DOM.$pixelSizeInput.change(function(){
		pixel.size = $(this).val();
		DOM.$pixelSizeDemoDiv.css({
			'width' : pixel.size,
			'height': pixel.size
		});
		
		// set both inputs to be equal
		DOM.$pixelSizeInput.val(pixel.size);
	});
	
	// reset canvas 
	DOM.$buttonNewCanvas.click(function(){
		resetCanvas( pixel.color );
		saveToLocalStorage();
	});
	
	// save full canvas 
	DOM.$buttonSaveFull.click(function(){
		var savedPNG = DOM.$canvas[0].toDataURL("image/png");
		window.open(savedPNG,'_blank');
	});
	
	// save selection of canvas button clicked
	DOM.$buttonSaveSelection.click(function(){
		if ( mode.save ) {
			mode.save = false;
			DOM.$saveInstruction.slideUp();
			$(this).val(copy.selectionOn)
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
      if (elem.is(":disabled")) {
        return;
      }

      // trigger the click
      elem.trigger('click');
    };
  };
	
	// undo
	DOM.$undo.click(function(){
		undoRedo(historyPointer, true);
		historyPointer--;
		
		DOM.$redo.removeAttr('disabled');		
		if ( historyPointer < 0 ) {
			DOM.$undo.attr('disabled', 'disabled');
		}
	});

  // alias to ctrl+z, macs aliased to cmd+z
  key('ctrl+z, ⌘+z', triggerClickForEnabled(DOM.$undo));

	// redo
	DOM.$redo.click(function(){
		historyPointer++;
		undoRedo(historyPointer, false);
		
		DOM.$undo.removeAttr('disabled');
		if ( historyPointer == history.length - 1 ) {
		    DOM.$redo.attr('disabled', 'disabled');
		}
	});

  // alias to ctrl+y and mac aliased cmd+shift+z
  key('ctrl+y, ⌘+shift+z', triggerClickForEnabled(DOM.$redo));

	/* colors */
	
	// choose color
	DOM.$color.click(function(){
		
		var $newColor = $(this);
		
		if ( $newColor.hasClass('favorite') ) {
			var newColorLabel = colorJennsPick;
		}
		else {
			var newColorLabel = $newColor.attr('data-color');
		}
		
		$('.current').removeClass('current');
		$newColor.addClass('current');
		pixel.color = newColorLabel;

		if ( pixel.color != 'rgb(0, 0, 0, 0)' ) {
			var demoColor = pixel.color;
			DOM.$pixelSizeDemoDiv.css('background-image', 'none');
			DOM.$colorPickerDemo.css('background-image', 'none');
		}
		else {
			DOM.$pixelSizeDemoDiv.css('background-image', 'url(assets/bg.png)');
			DOM.$colorPickerDemo.css('background-image', 'url(assets/bg.png)');
			DOM.$hex.val('');
		} 
		DOM.$pixelSizeDemoDiv.css('background-color', demoColor);
		DOM.$colorPickerDemo.css('background-color', demoColor);
		DOM.$hex.val(rgbToHex(DOM.$colorPickerDemo.css('background-color')));
		DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + newColorLabel);
	});
	
	// custom color picker started
	DOM.$colorCustom.click(function(){
		DOM.$colorPicker.slideToggle();
	});
	
	// custom color hover
	DOM.$colorPickerPixels.hover(
		function(e){
			var demoColor = $(this).css('background-color');
			DOM.$pixelSizeDemoDiv.css('background-image', 'none');
			DOM.$colorPickerDemo.css('background-image', 'none');
			DOM.$colorPickerDemo.css('background-color', demoColor);
			DOM.$hex.val(rgbToHex(demoColor));
		},
		function(e){
			DOM.$colorPickerDemo.css('background-color', pixel.color);
			DOM.$hex.val(rgbToHex(DOM.$colorPickerDemo.css('background-color')));
		}
	);
	
	// custom color chosen
	DOM.$colorPickerPixels.click(function(){
		var newColor = $(this).css('background-color');
		$('.current').removeClass('current');
		DOM.$colorCustom.addClass('current');
		
		pixel.color = newColor;
		DOM.$colorPickerDemo.css('background-color', newColor);
		DOM.$draggydivs.css('box-shadow','5px 5px 0 ' + newColor);
	});

	// hex color input change 
	DOM.$hex.keyup(hexColorChosen);
	DOM.$hex.focus(hexColorChosen);
	
	// color dropper clicked
	DOM.$dropper.click(function(e){
		e.preventDefault();
		
		if ( DOM.$dropper.hasClass('current') ) {
			DOM.$dropper.removeClass('current').removeAttr('style');
			DOM.$canvas.removeClass('dropper-mode');
			mode.dropper = false;
		}
		else {
			mode.dropper = true;
			DOM.$dropper.addClass('current');
			DOM.$canvas.addClass('dropper-mode');
			
			DOM.$canvas.mousemove(function(e){
				var hoverData = ctx.getImageData( e.pageX, e.pageY, 1, 1).data;
				var hoverRGB = 'rgb(' + hoverData[0] + ',' + hoverData[1] + ',' + hoverData[2] + ')';
				DOM.$dropper.css('background-color', hoverRGB);

				DOM.$pixelSizeDemoDiv.css('background-image', 'none');
				DOM.$colorPickerDemo.css('background-image', 'none');
				DOM.$colorPickerDemo.css('background-color', hoverRGB);
				DOM.$hex.val(rgbToHex(hoverRGB));

			});
		}
	});

	
	/* misc */

	// tooltip hover 
	DOM.$tips.hover(
		function(){
			$(this).find('.tip-text').stop().show();
		}, 
		function() {
			$(this).find('.tip-text').stop().hide();
		}
	);

	// canvas window size changes
	DOM.$window.resize(function(){
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
				var newHeight = DOM.$window.height();;
				windowCanvas.width = newWidth;
				windowCanvas.height = newHeight;
				
				// save image
				saveToLocalStorage();
			
				DOM.$canvas
					.attr('width',newWidth)
					.attr('height',newHeight)
				DOM.$overlay
					.attr('width',newWidth)
					.attr('height',newHeight);
				ctxOverlay = DOM.$overlay[0].getContext("2d");
				ctxOverlay.fillStyle = 'rgba(0,0,0,.5)';
				
				// draw image
				drawFromLocalStorage();
			} 
			
		}
	});


	
	/*** INIT HA HA HA ***/
	generateCanvas();
	initpixel(15);
	
	historyPointer = -1;
	
	DOM.$canvas.mousedown(onMouseDown).mouseup(onMouseUp);
	DOM.$overlay.mousedown(onMouseDown).mouseup(onMouseUp);
	
	//touch
	DOM.$canvas[0].addEventListener('touchstart', onMouseDown, false);
	DOM.$canvas[0].addEventListener('touchend', onMouseUp, false);
	DOM.$overlay[0].addEventListener('touchstart', onMouseDown, false);
	DOM.$overlay[0].addEventListener('touchend', onMouseUp, false);

});

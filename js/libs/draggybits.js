(function($) {

  var pluginName = 'draggyBits';
  var movingClass = 'ui-moving';
  var draggerClass = 'ui-dragger';
  var closerClass = 'ui-closer';
  var minimizeClass = 'ui-hider';
  var hiddenClass = 'ui-hidden';

  var isMoving = false;
  var zIndex = 100;
  var pos = { x:0, y:0 };
  var numDraggers = 0;
  var tileOffset = { x:20, y:20};

  var $current;
  var $window = $(window);

  var defaults = {
    onMinimize : function (e) { return false; },
    onInit : function (e) { return false; },
    onClose : function (e) { return false; },
    onRestore : function (e) { return false; }
  };

  var methods = {

    init : function (opts) {

      return this.each(function() {

        var $this = $(this).addClass(pluginName);
        var $dragger = $this.find('.' + draggerClass);
        var $closer = $this.find('.' + closerClass).click(onCloseClick);
        var $minimizer = $this.find('.' + minimizeClass).click(onMinimizeClick);

        var options = $.extend(defaults, opts);

        var data = {
          $this : $this,
          $dragger : $dragger,
          $closer : $closer,
          $minimizer : $minimizer,
          onMinimize : options.onMinimize,
          onClose : options.onClose,
          onInit : options.onInit,
          onRestore : options.onRestore
        };

        $this.data(pluginName, data);

        $dragger.attr('aria-grabbed', false);
        $dragger.mousedown(onMouseDown);

        numDraggers++;

        var css = {
          top : numDraggers * tileOffset.y,
          left : 200 + (numDraggers * tileOffset.x),
          position : 'absolute'
        };

        $this.css(css);

        options.onInit($this);
      });
    },

    minimize : function () {
      var $this = $(this).addClass(hiddenClass);
      var data = $this.data(pluginName);
      data.onMinimize($this);
    },

    restore : function () {
      var $this = $(this).removeClass(hiddenClass).css("z-index", zIndex++);
      var data = $this.data(pluginName);
      data.onRestore($this);
    },

    close : function () {
      var $this = $(this);
      var data = $this.data(pluginName);
      data.onClose($this);
      $this.remove();
    }

  };




    /*** MODULE DEFINITION ***/

    $.fn[pluginName] = function (method) {
        if ( methods[method] ) {
            return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this,arguments);
        } else {
            $.error('Method ' + method + ' does not exist');
        }
    };




    /*** EVENTS HANDLERS ***/

  var onMove = function (e) {
    var curr = { x: e.pageX, y: e.pageY };

    var dx = curr.x - pos.x;
    var dy = curr.y - pos.y;

    $current.css({top:"+="+dy, left:"+="+dx});

    pos = curr;
  };

  var onMouseUp = function (e) {
    var $this = $(e.target);

    if (!isMoving) {
      return;
    }

    $this.attr('aria-grabbed', false);
    $('.' + movingClass).removeClass(movingClass)

    $window.off('mousemove');
    isMoving = false;

    // touch
    window.removeEventListener('touchmove', onMove, false);
  };

  var onMouseDown = function (e) {
    var $target = $(e.target);
    var $this = ( $target.is('button') ) ? $target : $target.parent('button');
    var isDragger = $this.hasClass(draggerClass);
    $this.parents('.'+ pluginName).css("z-index", zIndex++);

    if (!isDragger) {
      return;
    }

    e.preventDefault()
    pos = { x: e.pageX, y: e.pageY };

    $this.attr('aria-grabbed', true);
    $current = $this.parents('.'+ pluginName).addClass(movingClass);
    $window.on('mousemove', onMove);

    isMoving = true;

    // touch
    window.addEventListener('touchmove', onMove, false);
  };

  var onCloseClick = function (e) {
    var $this = $(this);
    var $par = $this.parents('.'+ pluginName);
      $par[pluginName]('close');
  };

  var onMinimizeClick = function (e) {
    var $this = $(this);
    var $par = $this.parents('.'+ pluginName);
      $par[pluginName]('minimize');
  };

  /*** GLOBAL EVENTS ***/
  $(window).mouseup(onMouseUp);

  // touch
  window.addEventListener('touchend', onMouseUp, false);

})( jQuery );

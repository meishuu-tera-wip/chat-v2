// globals
var app = new App();

// helpers
var $make, $text;

var pad = function(n) {
  return ('00' + n).slice(-2);
};

var timeString = function(date, ampm) {
  date = date || new Date();
  if (ampm) {
    var hour = date.getHours();
    return (hour % 12 || 12) + ':' + pad(date.getMinutes()) + ' ' + (hour < 12 ? 'am' : 'pm');
  } else {
    return pad(date.getHours()) + ':' + pad(date.getMinutes());
  }
};

// main
jQuery(function($) {
  /***********
   * GLOBALS *
   ***********/

  /***********
   * HELPERS *
   ***********/
  $make = function(element, className) {
    return $(document.createElement(element)).addClass(className);
  };

  $text = function(text) {
    return document.createTextNode(text);
  };

  /***********
   * EXTENDS *
  ************/
  $.fn.extend({
    flexDraggable: function() {
      var self = this;
      return this.append(
        $make('div', 'handle').mousedown(function(e) {
          var $prev = self.prev();
          var $next = self.next();

          var horizontal = self.parent().hasClass('horizontal');
          var total = parseFloat($prev.css('flex-grow')) + parseFloat($next.css('flex-grow'));

          var min;
          var size;
          if (horizontal) {
            min = $prev.offset().left;
            size = $next.offset().left + $next.outerWidth() - min;
          } else {
            min = $prev.offset().top;
            size = $next.offset().top + $next.outerHeight() - min;
          }

          $(document).on('mousemove.draggable', function(e) {
            var pos = (horizontal ? e.pageX : e.pageY) - min;
            var pct = pos / size;
            if (pct < 0) pct = 0;
            if (pct > 1) pct = 1;

            var first = pct * total;
            $prev.css('flex-grow', first);
            $next.css('flex-grow', total - first);
          });

          $(document).one('mouseup', function() {
            $(document).off('mousemove.draggable');
          });

          e.preventDefault();
        })
      );
    }
  });

  /********
   * MAIN *
   ********/
  app.load($);
  new Modal();
});

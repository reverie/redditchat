/*
 * Droppy 0.1.2
 * (c) 2008 Jason Frame (jason@onehackoranother.com)
 Modified 2010 Andrew badr
 */
$.fn.droppy = function(options) {
    
  options = $.extend({speed: 250}, options || {});
  
  this.each(function() {
    
    var zIndex = 1000;
	var title = $(this).children('.droppy_title')[0];
	var menu = $(this).children('.droppy_menu')[0];

	if (menu.nodeName.toLowerCase() != 'ul') {
		throw new Error('droppy requires the menu to be a UL element');
	}
    
	function hideNow() {
      if (this != menu) {
		  throw new Error('droppy hidenow called on non-menu element');
	  }
	  $(this).slideUp(0);
	}
    
    function hide() {
      if (this != menu) {
		  throw new Error('droppy hide called on non-menu element');
	  }
      $.data(this, 'cancelHide', false);
      setTimeout(function() {
        if (!$.data(menu, 'cancelHide')) {
          $(menu).slideUp(options.speed);
        }
      }, 500);
    }
  
    function show() {
      if (this != menu) {
		  throw new Error('droppy show called on non-menu element');
	  }
      $.data(this, 'cancelHide', true);
      $(this).css({zIndex: zIndex++}).slideDown(options.speed);
    }
    
    //$('ul, li', this).click(show, hide);
    $(title).click(function() {
			show.call(menu);
			});
    $(title).mouseleave(function() {
			hide.call(menu);
			});
    $(menu).mouseenter(function() {
			show.call(menu);
			});
    $(menu).mouseleave(function() {
			hide.call(menu);
			});
    $('li', menu).hover(
      function() { $(this).addClass('hover');},
      function() { $(this).removeClass('hover');}
    );
	$('li', menu).click(function() {
			hideNow.call(menu);
			});
  });
  
};

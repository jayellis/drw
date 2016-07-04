(function($){
  'use strict';
  var animate_alert = {
    init: function( config ) {
      this.config = config;
      this.alertBox = config.alertBox;
      this.alertBox.css('top', '-200px');
      this.animate('-2px');
      this.bind();
    },

    bind: function() {
      this.alertBox.on('click', this.action);
    },

    hide: function() {
      self = animate_alert;
      self.animate('-200px');
    },

    action: function(e) {
      self = animate_alert;
      e.preventDefault();
      self.hide();
    },

    timeout: function() {
      self = animate_alert;
      setTimeout( self.hide, 6000);
    },
    
    animate: function( coord ) {
      self = animate_alert;
      this.alertBox.animate({
        top: coord
      }, 500);
      self.timeout();
    }
  };

  animate_alert.init({
    alertBox: $('.alert')
  });
})(jQuery);

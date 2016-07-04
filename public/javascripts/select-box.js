(function() {
  'use strict';
  var selectBox = {
    init: function( config ) {
      this.config = config;
      this.select = this.config.select;
      this.selectBtn = this.config.selectBtn;
      this.bind();
    },

    bind: function() {
      this.selectBtn.on('click', this.buttonAction);
    },

    selectAll: function() {
      this.select.attr('checked', 'checked');
    },

    clearAll: function() {
      this.select.removeAttr('checked');
    },

    buttonAction: function(e) {
      e.preventDefault();
      var self = selectBox;
      var action = $(this).data('action');
      switch(action) {
        case 'selectall':
          self.selectAll();
          break;
        default:
          self.clearAll()
      }
    }
  };

  selectBox.init({
    select: $('input[type=checkbox]'),
    selectBtn: $('.select-button')
  });

})(jQuery);

(function($) {
  var showpass = {
    init: function(config) {
      this.config = config;
      this.password = this.config.password;
      this.showPassBtn = this.config.showpass;
      this.bind();
    },

    togglepass: function(e) {
      var self = showpass;
      e.preventDefault();
      self.password.toggle();
    },

    bind: function() {
      this.showPassBtn.parent().on('click', 'button',  this.togglepass);
    }
  }

  showpass.init({
    password: $('input[type="password"]'),
    showpass: $('.changepassword')
  });
})(jQuery)

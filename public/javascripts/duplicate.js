(function($) {
  'use strict';
  var duplicate = {
    init: function(config) {
      this.config = config;
      this.wrapper = this.config.wrapper;
      this.item = this.wrapper.find('input:first-child');
      this.order();
      this.addBtn();
    },

    remove: function(e) {
      e.preventDefault();
      var self = duplicate
        , el = $(this);

      el.parent().remove();
      self.order();
    },

    duplicate: function(e) {
      e.preventDefault();
      var self = duplicate
        , wrapper = self.wrapper
        , wrapId = new Date()
        , newWrap = $(document.createElement('div'))
        , newBtn = $(document.createElement('a')); //Add a link to DOM

      wrapper.children().each(function() {
        //iterate through children and add duplicate to DOM
        var wrapper = self.wrapper
          , item = $(this)
          , itemTag = item.prop('tagName').toLowerCase()
          , newEl = $(document.createElement(itemTag)); //Add duplicate to DOM

        if(itemTag !== 'button') {
          //Iterate through duplicate attributes
          $(item[0].attributes).each(function() {
            newEl.attr( this.nodeName, this.nodeValue );
          });

          newWrap.append(newEl); //Add to page
        }
      });

      //Add link attributes
      newBtn.attr( 'href', '' );
      newBtn.attr( 'class', 'remove' );
      newBtn.text('Remove');

      newWrap.append(newBtn);
      wrapper.parent().append(newWrap);
      newBtn.on('click', self.remove);
      self.order();
    },

    addBtn: function() {
      var button = '<button>Add more options</button>';
      this.wrapper.prepend(button);
      this.wrapper.find('button').on('click', this.duplicate);
    },

    order: function() {
      var wrapper = this.wrapper
        , groups = wrapper.parent().children();

      groups.each(function(key) {
        this.each(function(index) {
          if(this.nodeType = 'input') this.name = this.name.replace('~i', key);
        });
      });
    }
  };

  duplicate.init({
    wrapper: $('.duplicate-wrapper')
  });
})(jQuery)

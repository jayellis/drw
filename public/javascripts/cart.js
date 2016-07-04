function formatPrice(price) {
  if( !isNaN(price) ) {
    var num = price.toString().replace(/\£|\,/g, '');
    sign = (num == (num = Math.abs(num)));
    num = Math.floor(num * 100 + 0.50000000001);
    pence = num % 100;
    num = Math.floor(num / 100).toString();
    if (pence < 10) pence = '0' + pence;
    for (var i = 0; i < Math.floor((num.length - (1 + i)) / 3); i++) {
      num = num.substring( 0, num.length - (4 * i + 3)) + ',' + num.substring(num.length - (4 * i + 3));
    }
    return (((sign) ? '' : '-') + '£' + num + '.' + pence);
  } else {
    return price;
  }
};

(function($) {
  'use strict';
  var cart = {
    init: function(config){
      this.config = config;
      this.cart = this.config.cart;
      this.localStorage = window.localStorage;
      this.cartTotal = (this.localStorage.getItem('cartTotal')) 
        ? parseFloat(this.localStorage.getItem('cartTotal')) 
        : parseFloat(this.cart.children('.cart_total').text()*1);
      this.clearBtn = $(this.cart.find('.clear'));
      this.checkoutBtn = $(this.cart.find('.checkout'));
      this.cartForm = this.config.cartForm;
      this.modifyStorage();
      this.updateCart();
      this.bind();
    },

    modifyStorage: function() {
      Storage.prototype.setObject = function( key, value ) {
        this.setItem(key, JSON.stringify(value));
      };
      Storage.prototype.getObject = function( key, value ) {
        var value = this.getItem( key );
        return value && JSON.parse(value);
      };
    },

    clearCart: function(e) {
      e.preventDefault();
      var self = cart;
      self.cartTotal = 0;
      self.localStorage.clear();
      self.updateCart();
    },

    showCheckout: function(e) {
      e.preventDefault();
      var self = cart;
      self.updateCart();
    },

    updateCart: function() {
      var localStorage = this.localStorage
        , cart_items = this.cart.find('.cart_items')
        , cartTotal = localStorage.getItem('cartTotal') || 0
        , keyArr = Object.keys(localStorage)
        , list = '';

      cart_items.text('');
      this.cart.find('.cart_total').text(formatPrice(cartTotal));
      for(var i=0; i<keyArr.length; i++) {
        var item = JSON.parse(localStorage[keyArr[i]]);
        if(keyArr[i] !== 'cartTotal') {
          //displayed
          list += '<li>';
          list += item.title + ': ' + formatPrice(item.price); 
          list += '<a href="" data-id="'+ keyArr[i] +'" class="remove">&otimes;</a>';
          list += '</li>';
          //hidden form elements
          //list += '<input type="hidden" name="item['+ keyArr[i] +'[id]" value="'+ item.id +'" />';
          list += '<input type="hidden" name="item['+ i +']" value="'+ item.id +'" />';
        }       
      }
      cart_items.append(list);
      cart_items.find('.remove').on('click', this.removeItem);
    },

    addItem: function(e) {
      e.preventDefault();
      var self = cart
        , el = $(this)
        , submitType = el.find('input[type=submit]').data('action')
        , localStorage = self.localStorage
        , cartTotal = localStorage.getItem('cartTotal') || self.cartTotal
        , formArr = $(this).serializeArray()
        , formObj = {}
        , newTotal;

        for(var i=0; i<formArr.length; i++) {
          var item = formArr[i]
            , key = item['name']
            , val = item['value'];
          formObj[key] = val;
        };

      function add() {
        if(!localStorage.getItem(formObj.id)) {
          localStorage.setObject(formObj.id, formObj);
          if(isNaN(formObj.price)) formObj.price = 0*1;
          cartTotal = cartTotal*10;
          newTotal = cartTotal += ( formObj.price*10 );
          newTotal = newTotal / 10;
          localStorage.setItem('cartTotal', newTotal.toFixed(2));
          self.updateCart();
        } else {
          alert('This item is already in your shopping cart!');
        }
      };

      function reserve() {
        $.ajax({
          url: '/reserve.json?id=' + formObj.id,
        }).done( function(data) {
          if( data.state ) el.parent().hide();
          alert(data.response);
        });
      };

      function application() {
        $.ajax({
          url: '/poa.json?id=' + formObj.id,
        }).done( function(data) {
          if( data.state ) el.parent().hide();
          alert(data.response);
        });
      };

      switch(submitType) {
        case 'application':
          application();
          break;
        case 'reserve':
          reserve();
          break;
        default:
          add();
      }
    },

    removeItem: function(e) {
      e.preventDefault();
      var self = cart
        , localStorage = self.localStorage
        , cartTotal = localStorage.getItem('cartTotal') || self.cartTotal
        , id = $(this).data('id')
        , storeObj = localStorage.getObject(id);

      if(isNaN(storeObj.price)) storeObj.price = 0*1;
      cartTotal = cartTotal -= storeObj.price*1;
      localStorage.setItem('cartTotal', cartTotal.toFixed(2)); 
      localStorage.removeItem(id);
      self.updateCart();
    },

    bind: function() {
      this.cartForm.submit(this.addItem);
      this.clearBtn.on('click', this.clearCart);
      this.checkoutBtn.on('click', this.showCheckout);
    }
  };

  cart.init({
    cart: $('#cart'),
    cartForm: $('.cart_form')
  });
})(jQuery);

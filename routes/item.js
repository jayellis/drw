exports.list = function( req, res, next ) {
  Item.find({})
  .populate('_media')
  .exec( function( err, items) {
    items.map(function(i) {
      return i.key_words.toString();
    });
    res.render('admin/item-list', {
      title: 'List Items',
      items: items
    });
  });
};

exports.newItem = function( req, res, next ) {
  res.render('admin/item-new', {
    title: 'New Item',
    item: {}
  });
};

exports.createItem = function( req, res, next ) {
  var item = new Item(req.body.item);
    
  function saveFailed( err ) {
    req.session.messages = {
      type: 'Error',
      msg: 'Document creation failed: ' + err
    };
    res.redirect('back');
  };

  item.key_words = req.body.item.key_words.split(',');

  function saveItem() {
    item.category = ( req.body.categoryalt != '' )? req.body.categoryalt: req.body.category;
    item.save(function( err ) {
      if( err ) return saveFailed( err );
      res.redirect('/admin/items/' + item._id);
    });
  };
  saveItem();
};

exports.item = function( req, res, next ) {
  Item.findOne({ _id: req.params.id })
    .populate('_media')
    .populate('_reservation')
    .exec( function( err, item ) {
    if(!item._media) item._media = [];
    Shipping.find({})
    .populate('_serviceOptions')
    .exec( function( err, shipping ) {
      if( err ) return next( err );
      res.render('admin/item-edit', {
        title: "Edit Item",
        shipping: shipping,
        item: item
      });
    });
  });
};

exports.edit = function( req, res, next ) {
  var target = '/admin/items/' + req.params.id
    , newState = req.body.item.state;
  if( 'Add Images' === req.body.to ) target = '/admin/items/media/' + req.params.id;

  Item.findOne({ _id: req.params.id }, function( err, item ) {
    if( err ) return next( err );
    var oldState = item.state;

    function saveFailed( err ) {
      req.session.messages = {
        type: 'Error',
        msg: 'Document edit failed: ' + err
      };
      res.redirect('/admin/items/' + item._id);
    };


    function saveItem() {
      console.log(req.body);
      item.category = ( req.body.categoryalt != '' )? req.body.categoryalt: req.body.category;
      item.key_words = req.body.item.key_words.split(',');
      if( newState !== 'reserved' && oldState == 'reserved' ) item._reservation = undefined;

      item.save( function( err ) {
        if( err ) return saveFailed( err );
        req.session.messages = {
          type: 'info',
          msg: 'Item saved'
        };
        res.redirect(target);
      });
    };

    function update(callback) {
      var key, del;
      item.delivery = [];
      for(key in req.body.item ) {
      //iterate through form data excluding delivery
        if( req.body.item.hasOwnProperty(key)) {
          if( key !== 'delivery') item[key] = req.body.item[key];
        }
      }
      if(req.body.item.add_delivery) {
        req.body.item.add_delivery.forEach(function(element, index) {
        //iterate through delivery options
          if( element.checked ) item.delivery.push( element );
        });
      }
      if(req.body.item.new_delivery) {
        req.body.item.new_delivery.forEach(function(element, index) {
        //iterate through new delivery options
          if( element.checked ) item.delivery.push( element );
        });
      }
      callback();
    };

    update(saveItem);

  });
};

exports.selectImages = function( req, res, next ) {
  var options = {};
  if(req.query.keyword) options = { key_words: { $regex: new RegExp(req.query.keyword, 'i') }};

  Media.find( options, function( err, media ) {
    if( err ) return next( err );

    res.render('admin/select_media', {
      title: 'Select Media',
      id: req.params.id,
      media: media
    });
  });
};

exports.addImages = function( req, res, next ) {
  if(!req.body.image) {
    req.session.messages = {
      type: 'error',
      msg: 'No files selected'
    }
    res.redirect('/admin/items/media/' + req.params.id);
  } else {
    Item.findById( req.params.id, function( err, item ) {
      for(var i=0; i< req.body.image.length; i++) {
        item._media.push(req.body.image[i]);
      }

      item.save(function( err ) {
        if( err ) return next( err );
        req.session.messages = {
          type: 'info',
          msg: 'Item updated'
        }
        res.redirect('/admin/items/' + req.params.id);
      });
    });
  }
};

exports.deleteItem = function( req, res, next ) {
  Item.findById( req.params.id, function( err, Item ) {
    if( err ) return next( err );
    Item.remove( function( err ) {
      if( err ) return next( err );
      req.session.messages = 'Item Removed';
      res.redirect('/admin/items');
    });
  });
};

//shipping
exports.shipping = function( req, res, next ) {
  Shipping.find({}, function( err, shipping ) {
    if( err ) return next( err );
    res.render('admin/shipping-list', {
      title: 'Shipping',
      shipping: shipping || []
    });
  });
};

//newshipping
exports.newShipping = function( req, res, next ) {
  var shipping = new Shipping();
  res.render('admin/shipping-new', {
    title: 'Add shipping service',
    shipping: shipping
  });
};

//addshipping
exports.addShipping = function( req, res, next ) {
  var shipping = new Shipping( req.body.shipping );
  function saveFailed( err ) {
    req.session.messages = {
      type: 'Error',
      msg: 'Service creation failed: ' + err
    };
    res.redirect('back');
  };
  shipping.save(function( err ) {
    if( err ) return saveFailed();
    res.render('admin/shipping-edit', {
      title: 'Edit Shipping Options',
      shipping: shipping
    });
  });
};

//editShipping
exports.editShipping = function( req, res, next ) {
  Shipping.findById( req.params.id)
  .populate( '_serviceOptions' )
  .exec( function( err, shipping ) {
    if( err ) return next( err );
    res.render('admin/shipping-edit', {
      title: 'Edit shipping service',
      shipping: shipping
    });
  });
};

exports.doEditShipping = function( req, res, next ) {
  Shipping.findById( req.params.id, function( err, shipping) {
    if( err ) return next( err );
    function saveFailed( err ) {
      req.session.messages = {
        type: 'Error',
        msg: 'Service creation failed: ' + err
      };
      res.redirect('back');
    };
    
    for(index in req.body.shipping) {
      shipping[index] = req.body.shipping[index];
    };

    shipping.save(function( err ) {
      if( err ) return saveFailed(err);
      req.session.messages = {
        type: 'info',
        msg: 'Service added'
      };
      res.redirect('/admin/shipping/edit/' + req.params.id);
    });
  });
};

exports.shippingOption = function( req, res, next ) {
  var id = req.params.id;
  Shipping.findById( id, function( err, shipping ) {
    if( err ) return next( err );
    res.render('admin/shipping_opt-new', {
      title: 'Add Shipping option for ' + shipping.service,
      shipping: shipping,
      option: {}
    });
  });
};

exports.shippingOptionAdd = function( req, res, next ) {
  var option = new ServiceOpt( req.body.option );
  Shipping.findById( req.params.id, function( err, shipping ) {
    shipping._serviceOptions.push( option._id );
    shipping.save( function( err ) {
      if( err ) return next( err );
      option.save(function( err ) {
        if( err ) return next( err );
        req.session.messages = {
          type: 'info',
          msg: 'Option added'
        };
        res.redirect('back');
      });
    });
  });
};

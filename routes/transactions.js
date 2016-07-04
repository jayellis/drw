//require block {{{1
var request = require('request')
  , emails = require('../routes/mail.js')
  , sha1 = require('sha1')
  , passphrase = 'body0f3viDen¢e'
  , arrays = require('../arrays');


//Checkout {{{1
exports.checkout = function( req, res, next ) {
  var cart = req.body.item
    , delivery = {}
    , user = req.session.passport.user;

  user.address = user.address || {};

  cart = cart.map(function(id) {
    return id.replace( 'cart-', '' );
  });

  Item.find( { _id: { $in: cart } } )
  .exec( function( err, items ) {

    res.render('site/checkout', {
      title: 'Delivery',
      delivery: delivery,
      user: user,
      cart: items
    });
  });
};

//sendBarclays {{{1
exports.sendBarclays = function( req, res, next ) {
  "use strict";
  var amount = 0
    , details = ''
    , extraArray = req.body.extra || []
    , transactionDetails = []
    , user = req.body.user
    , shaString = '';

  //findOrCreateTransaction {{{2
  function findOrCreateTransaction() {
    Transaction.findOne({ status: 'pending', id: req.body.item.id }, function( err, transaction) {
      if(!transaction) transaction = new Transaction();

      transaction.amount = amount;
      transaction.state = 'pending';
      transaction.details = transactionDetails;

      var conf = {
        PSPID: 'epdq1000400',
        ORDERID: transaction._id,
        AMOUNT: amount*100,
        CURRENCY: 'GBP',
        LANGUAGE: 'en_GB',
        CN: user.fname + ' ' + user.lname,
        EMAIL: user.email,
        OWNERZIP: user.postcode1 + ' ' + user.postcode2,
        OWNERADDRESS: user.address1 + ' ' + user.address2,
        OWNERTOWN: user.town,
        OWNERTELNO: user.tel,
        COM: 'Not sure about this',
        ACCEPTURL: req.headers.origin + '/transaction/result/accept',
        DECLINEURL: req.headers.origin + '/transaction/result/decline',
        EXCEPTIONURL: req.headers.origin + '/transaction/result/exception',
        CANCELURL:  req.headers.origin + '/transaction/result/cancel'
      };

      var confKeys = Object.keys(conf);
      confKeys.sort();
      for(var i=0; i<confKeys.length; i++) {
        if( conf[confKeys[i]] !== '') {
          shaString += confKeys[i] + '=' + conf[confKeys[i]] + passphrase;
        }
      }

      var SHASIGN = sha1(shaString);
      conf.SHASIGN = SHASIGN;

      saveTransaction(conf, transaction);
    });
  };

  //saveTransaction {{{2
  function saveTransaction(conf, transaction) {
    transaction.save( function(err) {
      if( err ) return next(err);
      render(conf, transaction);
    });
  };

  //saveUser {{{2
  function saveUser(user) {
    user.save( function(err) {
      if(err) return next(err);
      findOrCreateTransaction();
    });
  };

  //findUser {{{2
  function findUser() {
    User.findById( req.currentUser._id, function( err, user ) {
      if(err) return next(err);
      for(var k in req.body.user) {
        if(req.body.user.hasOwnProperty(k)) user[k] = req.body.user[k];
      }
      saveUser(user);
    });
  };

  if('undefined' != typeof useAddress){
    findUser();
  } else {
    findOrCreateTransaction();
  }

  //render {{{2
  function render(conf, transaction) {
    res.render('mywayhome/check', {
      title: 'Choose payment method',
      transaction: transaction,
      details: details,
      conf: conf
    });
  };
};

//result {{{1
exports.result = function(req, res, next) {
  var title = '';
  switch(req.params.result) {
    case 'accept':
      title = 'Thank you for choosing Your Way Home';
      break;
    case 'declined':
      title = 'We are sorry but your bank has declined payment';
      break;
    case 'cancel':
      title = 'We are sorry you have cancelled';
      break;
    default:
      title = 'Ooops something has happend that shouldn\' have';
  }

  res.render('mywayhome/results', {
    title: title
  });
};

//direct {{{1
exports.direct = function(req, res, next) {
  Transaction.findById( req.body.orderID )
    .populate('_stock')
    .exec(function(err, transaction) {

    switch(req.body.STATUS) {
      case '4':
        transaction.status = 'stored';
        break;
      case '5':
        transaction.status = 'Approved';
        break;
      case '9':
        transaction.status = 'Approved';
        break;
      case '1':
        transaction.status = 'cancelled';
        break;
      default:
        transaction.status = 'Declined';
    }

    transaction.save(function(err) {
      if(transaction.status == 'Approved') {
        transaction._stock.instruction_date = new Date();
        //transaction._stock.status = 'publish';
        transaction._stock.package_expire = setExpire(transaction._stock.trans_type); 
        transaction._stock.save(function(err) {
          if(err) return next(err);
          res.send();
        });
      } else {
        res.send();
      }
    });
  });
};

//Reserve {{{1
exports.reserve = function( req, res, next ) {
  var id = req.query.id.replace('cart-', '')
    , state = false
    , user = req.session.passport.user
    , response = 'success: this item has been reserved';

  function render() {
    res.json({
      state: state,
      response: response
    });
  };

  Item.findOne({ _id: id, state: 'reserve' })
  .exec( function( err, item ) {
    if( err ) response = 'There was a problem. Please try again later';
    item.state = 'reserved';
    item._reservation = user._id;
    item.save( function( err ) {
      if( err ) response = err;
      emails.reserve(user, item);
      state = true;
      res.json({
        state: state,
        response: response
      });
    });
  });
};

//POA {{{1
exports.poa = function( req, res, next ) {
  var id = req.query.id.replace('cart-', '')
    , state = false
    , response = 'success: We have received your request and will be contacting you shortly';
  Item.findOne({ _id: id })
  .exec( function( err, item ) {
    if( err ) response = err;
    if( req.session.passport.user ) {
      state=true;
      emails.poa(req.session.passport.user, item);
    } else {
      response = 'You must be signed in to request a price';
    }
    res.json({
      state: state,
      response: response
    });
  });
};

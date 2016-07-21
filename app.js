//Require {{{1
var express = require('express')
  , config = require('./config.js')
  , models = require('./models/model')
  , passport = require('passport')
  , site = require('./routes/site')
  , admin = require('./routes/admin')
  , media = require('./routes/media')
  , auth = require('./routes/auth')
  , user = require('./routes/users')
  , transactions = require('./routes/transactions')
  , item = require('./routes/item')
  , mail = require('./routes/mail')
  , mongoose = require('mongoose')
  , mongoStore = require('connect-mongodb')
  , LocalStrategy = require('passport-local').Strategy
  , FacebookStrategy = require('passport-facebook').Strategy
  , http = require('http')
  , path = require('path');

var app = express();

//Middleware {{{1
//Passport {{{2
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

//Local {{{3
passport.use(new LocalStrategy( { 
  passReqToCallback: true,
  failureFlash: true,
  usernameField: 'user[email]', 
  passwordField: 'user[password]' 
}, function(req, username, password, done) {
  User.findOne({ email: username }, function( err, user, next) {
    if( err ) return done( err );
    if (user && user.authenticate(password)) {
      return done( null, user );
    } else {
      req.session.messages = {
        type: 'error',
        msg: 'There was a problem: Either your password or email do not match our records'
      };
      return done( null, false, { message: 'Invalid password' });
    }
  });
}));

//Facebook {{{3

passport.use(new FacebookStrategy({
    passReqToCallback: true,
    clientID: config.FACEBOOK_APP_ID,
    clientSecret: config.FACEBOOK_APP_SECRET,
    profileFields: [ 'id', 'username', 'profileUrl', 'displayName', 'name', 'photos', 'gender', 'emails' ],
    callbackURL: "http://.org.uk/auth/facebook/callback"
  },
  function(req, accessToken, refreshToken, profile, done) {
    // asynchronous verification, for effect...
      User.findOne({ email: profile._json.email }, function( err, user ) {
        profile._id = user._id;
        profile.level = user.level;
        process.nextTick(function () {
          if( err ) done( err );
          if( !user ) user = new User();
          user.email = profile._json.email;
          user.fname = profile._json.first_name;
          user.lname = profile._json.last_name;
          user.third_party = true;
          user.validated = true;
          user.auth = {
            authId: profile.id,
            type: profile.provider,
            link: profile._json.link,
            photos: profile._json.picture.data.url
          };

          function saveFailed() {
            req.session.messages = {
              type: 'error',
              msg: 'User Save Error'
            }
          };

          user.save( function( err ) {
            if( err ) return saveFailed( err );
            //return req.session.messages = {
              //type: 'info',
              //msg: 'Welcome ' + user.displayName
            //};
          });
        return done(null, profile);
      });
    });
  }
));

//flash {{{2
function flash( req, res, next ) {
  res.locals.flash = '';
  if( req.session.messages ) {
    res.locals.flash = "<div class='alert alert-" + req.session.messages.type + "'><p>"+ req.session.messages.msg +"</p></div>";
    process.nextTick(function () {
      req.session.messages = null;
    });
  }
  next();
};

//sessions {{{2
function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) return next();
  req.session.messages = {
    type: 'error',
    msg: 'You are not logged in'
  };
  res.redirect('/auth')
};

function ensureAdmin(req, res, next) {
  return function(req, res, next) {
    if(req.user && req.user.level === 'admin')
      next();
    else
      res.send(403);
  }
};

function sessionInfo(req, res, next) {
  res.locals.sessionInfo = req.user || {};
  next();
};

function categoryListPublish( req, res, next ) {
  Item.aggregate([
      { $match: { state: 'publish', state: 'reserve' } },
      { $group: { _id: '$category', total: { $sum: 1 } } }
  ], function( err, list ) {
    if( err ) return next( err );
    res.locals.categoryListPublish = list;
    next();
  })
};

function categoryList( req, res, next ) {
  Item.aggregate([
      { $group: { _id: '$category', total: { $sum: 1 } } }
  ], function( err, list ) {
    if( err ) return next( err );
    res.locals.categoryList = list || [];
    next();
  })
};

function getEnvironment( req, res, next ) {
  req.env = app.get('env');
  next();
};

//Error handeling {{{2
function logErrors( err, req, res, next ) {
  console.error(err.stack);
  next(err);
};

function clientErrorHandler(err, req, res, next) {
  if(req.xhr) {
    res.send(500, { error: 'Something blew up!' });
  } else {
    next(err);
  }
};

function notFound( req, res, next ) {
  res.status(404);
  if( req.accepts('html') ) {
    res.render('layout-error', {
      slug: 'Perhaps something has moved or maybe you\'ve mistyped.',
      error: 'Not found',
      title: 'Hmmm. 404'
    });
  } else if( req.accepts('json')) {
    res.send({ error: 'Not Found' });
  } else {
    res.send('Not Found');
  }
};
//Configuration {{{1
// all environments
if ('development' == app.get('env')) {
  app.set('db-uri', 'mongodb://192.168.99.100/drw-development');
  app.use(express.errorHandler());
  app.locals.assetUrl= '';
}

if ('production' == app.get('env')) {
  app.set('db-uri', 'mongodb://localhost/drw-production');
  app.use(express.errorHandler());
  app.locals.assetUrl = 'http://drwagner.s3.amazonaws.com';
}

if ('test' == app.get('env')) {
  app.set('db-uri', 'mongodb://192.168.99.102/drw-test');
  app.use(express.errorHandler());
}

app.set('port', process.env.PORT || 3001);
app.set('views', __dirname + '/views');
app.set('view engine', 'jade');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('skullandcrossbones'));
app.use(express.session({ 
  store: new mongoStore({
    url: app.get('db-uri'),
    collection : 'LoginToken' 
    }),
    secret : 'skullandcrossbones',
    cookie : {
      path: '/',
      //domain : app.get('site-address'),
      maxAge : 1000*60*60*24*30 
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());
app.use(app.router);
app.use(require('stylus').middleware(__dirname + '/public'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(notFound);
app.use(logErrors);
app.use(clientErrorHandler);
app.use(function( err, req, res, next ) {
  res.status(500);
  res.render('layout-error', { 
    error: err,
    title: 'Error'
  });
});

//Helpers {{{1
app.locals.messages = [];
app.locals.errors = [];

//Models {{{1
models.defineModels(mongoose, function() {
  app.Media = Media = mongoose.model('Media');
  app.Item = Item = mongoose.model('Item');
  app.User = User = mongoose.model('User');
  app.Transaction = Transaction = mongoose.model('Transaction');
  app.Shipping = Shipping = mongoose.model('Shipping');
  app.ServiceOpt = ServiceOpt = mongoose.model('ServiceOpt');
  app.DeliverySchema = DeliverySchema = mongoose.model('DeliverySchema');
  app.LoginToken = LoginToken = mongoose.model('LoginToken');
  db = mongoose.connect(app.set('db-uri'));
});

//Routes {{{1
app.all('/*', categoryListPublish, sessionInfo, flash );
app.get( '/', site.index );
app.get( '/category/:category', site.index );
app.get( '/item/:id', site.item );
app.get( '/keywords', site.getKeywords );
app.get( '/contact', site.contact );

// Admin {{{2
app.all('/admin*', categoryList, sessionInfo, ensureAdmin());

app.get('/admin', admin.index);
app.get('/admin/media', admin.listMedia);
app.post('/admin/media', media.uploadMedia);
app.get('/admin/media/upload', media.upload);
app.post('/admin/media/delete', media.deleteMedia);
app.get('/admin/media/:id', media.getMedia);
app.del('/admin/media/:id', media.deleteMedia);
app.put('/admin/media/:id', media.editMedia);

app.get('/admin/users', user.listUsers);
app.get('/admin/users/new', user.newUser);
app.post('/admin/users/new', user.createUser);
app.get('/admin/users/:id', user.user);
app.put('/admin/users/:id', user.editUser);
app.del('/admin/users/:id', user.deleteUser);

app.get('/admin/items', item.list);
app.get('/admin/items/new', categoryList, item.newItem);
app.post('/admin/items/new', item.createItem);
app.get('/admin/items/:id', categoryList, item.item);
app.put('/admin/items/:id', item.edit);
app.get('/admin/items/media/:id', item.selectImages);
app.post('/admin/items/media/:id', item.addImages);
app.del('/admin/items/:id', item.deleteItem);

app.get('/admin/shipping', item.shipping);
app.post('/admin/shipping', item.addShipping);
app.get('/admin/shipping/new', item.newShipping);
app.get('/admin/shipping/edit/:id', item.editShipping);
app.post('/admin/shipping/edit/:id', item.doEditShipping);

app.get('/admin/shipping/option/:id', item.shippingOption);
app.post('/admin/shipping/option/:id', item.shippingOptionAdd);

//Auth {{{2
app.get('/auth', categoryList, auth.register);
app.get( '/auth/facebook', passport.authenticate('facebook', { scope: [ 'email' ] }) );
app.get( '/auth/facebook/callback', passport.authenticate('facebook', { failureRedirect: '/auth' }), sessionInfo, auth.facebook ); 
app.post( '/auth', passport.authenticate( 'local', { failureRedirect: '/auth', failureFlash: false } ), auth.login );
app.del( '/auth', auth.logout );
app.get( '/exit', auth.exit );

//User {{{2
app.get( '/my_emporium', ensureAuthenticated, sessionInfo, user.control );
app.get( '/validate/:id', user.validate );
app.post( '/register', user.createUser );
app.put( '/user/:id', user.editUser );
app.get( '/user/password', user.password );
app.post( '/user/password', user.retrieve );
app.post( '/user/password/reset', user.setPassword );
app.get( '/user/reset_password', user.reset );

//Transactions {{{2
app.post( '/checkout', sessionInfo, ensureAuthenticated, transactions.checkout );

//ajax {{{2
app.get( '/reserve.?json', sessionInfo, transactions.reserve );
app.get( '/poa.?json', sessionInfo, transactions.poa );

//listen {{{1
http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

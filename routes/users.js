// Require {{{1
var emails = require('../routes/mail.js');

//List Users {{{1
exports.listUsers = function( req, res, next ) {
  User.find({}, function( err, users ) {
    if( err ) return next( err );
    res.render('admin/user_list', {
      title: 'List users',
      users: users
    });
  });
};

//New User {{{1
exports.newUser = function( req, res, next ) {
  res.render('admin/user_new', {
    title: 'New User',
    user: {}
  });
};

//Create User {{{1
exports.createUser = function( req, res ) {

  function userSaveFailed( err ) {
    console.log(err);
    req.session.messages = {
      type: 'error',
      msg: err.toString()
    };
    res.redirect('back');
  };

  function saveUser() {
    var user = new User()
      , msg = '';
    user.fname = req.body.user.fname,
    user.lname = req.body.user.lname,
    user.email = req.body.user.email,
    user.password = req.body.user.password,
    user.third_party = req.body.user.third_party
    user.save(function(err) {
      if(err) return userSaveFailed( err );

      if(req.path.indexOf( 'admin' ) != -1) {
        msg = 'User was saved successfully.';
      } else {
        msg = 'Thank you for registering. A validation email has been sent';
        emails.sendWelcome(user);
      }
      
      req.session.messages = {
        type: 'info',
        msg: msg
      };
      
      if(req.path.indexOf( 'admin' ) != -1) {
        res.redirect('/admin/users/new');
      } else {
        res.redirect('back');
      }
    });
  };

  function checkUser() {
    User.findOne({ email: req.body.user.email }, function( err, test ) {
      if( !test ) { 
        saveUser();
      } else {
        userSaveFailed( 'This email is already registered' );
      }
    });
  };

  if( req.body.user.password !== req.body.password ) {
    userSaveFailed( 'Passwords do not match' );
  } else {
    checkUser();
  }
};

// user {{{1
exports.user = function( req, res, next) {
  User.findOne({ _id: req.params.id })
    .populate('_portfolio')
    .exec( function( err, user ) {
    if(err) return next( err );
    res.render('admin/user_edit', {
      title: 'Edit User',
      user: user
    });
  });
};

//Edit User {{{1
exports.editUser = function( req, res ) {
  if( req.user.email == req.body.user.email || req.user.level == 'admin' ) {
    User.findOne({ _id: req.params.id }, function( err, user ) {
    if( err ) return next( err );

    console.log( req.body );
    function userSaveFailed( err ) {
      req.session.messages = {
        type: 'error',
        msg: 'Document edit failed: ' + err
      };
      res.redirect('back');
    };

      for(i in req.body.user) {
        user[i] = req.body.user[i];
      }

      if(!req.body.user._portfolio) user['_portfolio'] = [];
      if( req.body.user.password === req.body.password && req.body.password ) { 
        user.password = req.body.password;
      } else {
        user.password = '';
      }

      user.save(function(err) {
        if(err) return userSaveFailed( err );
        req.session.messages = {
          type: 'info',
          msg: 'User Edited'
        };
        res.redirect('back');
      });
    });
  } else {
    req.session.messages = {
      type: 'error',
      msg: 'You do not have privileges to change this password'
    };
    res.redirect('back');
  }
};

//Delete User {{{1
exports.deleteUser = function(req, res, next) {
  User.findById( req.params.id, function( err, user ) {
    if( err ) return next( err );

    user.remove( function( err ) {
      if( err ) return next( err );
      req.session.messages = {
        type: 'info',
        msg: 'User Removed'
      };
      res.redirect('/admin/users');
    });
  });
};

// control Panel {{{1
exports.control = function( req, res, next ) {
  res.send('My Emporium');
};
// Validate {{{1
exports.validate = function( req, res, next ) {
  User.findById( req.params.id, function( err, user ) {
    if( err ) return next( err );

    function userFail() {
      req.session.messages = {
        type: 'error',
        msg: 'There is a problem: We cannot find you.'
      };
      res.redirect('/admin/users');
    }

    if( !user ) return userFail();
    user.validated = true;
    user.save( function( err ) {
      if( err ) return next( err );
      res.redirect('/auth');
    });
  });
};

//password reset
exports.password = function( req, res ) {
  res.render('site/password', {
    title: 'Reset Your Password'
  });
};

exports.retrieve = function( req, res, next ) {
  var token;
  User.findOne({ email: req.body.email }, function( err, user ) {
    if( err ) return next( err );
    function userFail() {
      req.session.messages = {
        type: 'error',
        msg: 'We cannot locate an account with that email'
      };
      res.redirect('/user/reset_password');
    };
    if( !user ) return userFail();
    token = user.id.substring(0,4);
    emails.resetPassword(req.headers.origin, user.fname, user.email, token);
    req.session.messages = {
      type: 'info',
      msg: 'An email has been sent for you to reset your password'
    };
    res.redirect('/');
  });
};

exports.reset = function( req, res, next ) {
  res.render('site/reset', {
    title: 'Reset Your Password',
    reset: {}
  });
};

exports.setPassword = function( req, res, next ) {
  User.findOne({ email: req.body.reset.email }, function( err, user ) {
    if( err ) return next( err );
    if( !user ) return notFound();
    var token = user.id.substring(0,4);

    function validatFail() {
      console.log( 'Problem resetting');
      res.render('site/reset', {
        flash: "<div class='alert alert-error'><p>Please check your details</p></div>",
        title: 'Reset Your Password',
        sessionInfo: {},
        reset: req.body.reset
      });
    };

    function save() {
      user.password = req.body.reset.password;
      user.save( function( err ) {
        console.log( 'Password reset' );
        if( err ) return next( err );
        req.session.messages = {
          type: 'info',
          msg: 'Your password has been saved. Please sign in'
        };
        res.redirect('/auth');
      });
    };

    function notFound() {
      console.log( 'User not found' );
      req.session.messages = {
        type: 'error',
        msg: 'We cannot locate an account with that email'
      };
      res.redirect('/user/reset_password');
    };

    if( req.body.reset.password === req.body.reset.reppassword 
        && req.body.reset.password
        && req.body.reset.token === token ) return save();
    else return validatFail();
  });
};

exports.article = function( req, res, next ) {

  function render(article) {
    res.render('site/articles', {
      title: 'Submit Article',
      authors: [ req.user ],
      article: article
    });
  };

  function state(article) {
    if( article.state === 'publish' ) {
      req.session.messages = {
        type: 'info',
        msg: 'This article has been published and cannot be edited further'
      };
      res.redirect('/article/' + article._id);
    } else {
      return render(article);
    }
  };

  function getArticle() {
    Article.findOne({ _id: req.params.id }, function( err, article ) {
      if( err ) return next( err );
      return state(article);
    });
  };

  function newArticle() {
    var article = new Article();
    article.state = 'submitted';
    article._author = req.user._id;
    return render(article);
  };

  if( req.params.id ) {
    return getArticle();
  } else {
    return newArticle();
  }
};

exports.postArticle = function( req, res, next ) {
  Article.update({ _id: req.params.id }, req.body.article, { upsert: true }, function(writeConcern){
    console.log(writeConcern);
  });
  res.redirect('/cp');
};

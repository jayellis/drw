exports.login = function( req, res ) {
  switch(req.user.level) {
    case 'admin':
      res.redirect('/admin');
      break;
    default:
      res.redirect('/my_emporium');
  };
};

exports.facebook = function( req, res ) {
  res.redirect('/');
};

exports.logout = function( req, res ) {
  req.logout();
  res.redirect('/exit');
};

exports.exit = function( req, res ) {
  res.redirect('/');
};

exports.register = function( req, res, next ) {
  res.render('site/login', {
    title: 'Register',
    user: {}
  });
};

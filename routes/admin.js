//Require {{{1
//var request = require('request');

//functions {{{1
function calc(n1,n2)
{
  var num1,num2;
  if(n1 < n2){ 
      num1=n1;
      num2=n2;  
   }
   else{
      num1=n2;
      num2=n1;
    }
  var remain=num2%num1;
  while(remain>0){
      num2=num1;
      num1=remain;
      remain=num2%num1;
  }
  return num1;
};

//Index {{{1
exports.index = function( req, res ) {
  Item.find({ state: 'reserved' })
    .populate('_reservation')
    .exec( function( err, items ) {
    res.render('admin/index', {
      title: "Welcome " + req.user.displayName,
      items: items
    });
  });
};

//Media {{{1
exports.listMedia = function( req, res, next ) {
  var options = {};
  if(req.query.keyword) options = { key_words: { $regex: new RegExp(req.query.keyword, 'i') }};

  Media.find(options, function( err, media ) {
    if( err ) return next( err );
    res.render('admin/list_media', {
      media: media,
      title: 'Image list'
    });
  });
};

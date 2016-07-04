exports.index = function( req, res, next ) {
  'use strict';
  var searchOpt = { state: { $in: ['sale', 'reserve'] } }
    , regexArray = []
    , keywordArray = []
    , sortOpt = {};

  if( req.params.category ) searchOpt.category = req.params.category;

  switch (req.query.sort) {
    case 'highest':
      sortOpt.price = 1;
      break;
    case 'lowest':
      sortOpt.price = -1;
      break;
    case 'oldest':
      sortOpt._id = 1;
      break;
    default:
      sortOpt._id = -1;
  };

  function find() {
    Item.find( searchOpt )
      .populate('_media')
      .sort( sortOpt )
      .exec( function( err, items ) {
      if( err ) return next( err );
      res.render('site/index', {
        title: 'Welcome',
        items: items,
        search: req.query.search || '',
        sort: req.query.sort || ''
      });
    });
  };

  switch ( req.query.by ) {
    case 'keyword':
      keywordArray = decodeURI( req.query.search ).split(',');
      for( var i=0; i<keywordArray.length; i++ ) {
        regexArray.push({ key_words: { $regex: new RegExp(keywordArray[i], 'i') } });
      };
      searchOpt.$and = regexArray;
      find();
      break;
    default:
      find();
  };
};

exports.item = function( req, res, next ) {

};

exports.contact = function( req, res, next ) {

};

exports.getKeywords = function( req, res, next ) {
  'use strict';
  var keyword =  req.query.query || ''
    , newArray = []
    , obj = {};

  obj.suggestions = newArray;

  function unique(tags) {
    tags = tags.split(',');
    tags.forEach(function(tag) {
      if( newArray.indexOf(tag) == -1 ) {
        if( tag.match( new RegExp( keyword ) ) ) newArray.push( { "value": tag.trim(), "data": tag.trim() } );
      }
    });
  };

  Item.find({ state: 'publish', key_words: { $regex: keyword } }, { _id: 0, key_words: 1 })
  .exec(function( err, results ) {
    results.forEach(function( result ) {
      result.key_words.forEach(function(tags) {
        return unique(tags);
      });
    });
    res.json( obj );
  });
};

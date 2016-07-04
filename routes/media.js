//require block{{{1
var cp = require('child_process')
  , fs = require('fs')
  , config = require('../config.js')
  , knox = require('knox')
  , S3_key = config.AWS_KEY
  , S3_secret = config.AWS_SECRET;

knox = require('knox').createClient({
      key: S3_key,
      secret: S3_secret,
      bucket: 'drwagner'
});

//functions{{{1
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

function uploadFail( err, currentUser, next ) {
  if( err ) return next( err );
  //emails.serviceMsg(err, currentUser);
  next();
};

//upload{{{1
exports.upload = function( req, res ) {
  res.render('media/upload', {
    media: {},
    title: 'Upload Media'
  });
};

//uploadMedia{{{1
exports.uploadMedia = function( req, res, next ) {
  var fileArray = [];


  if( Object.prototype.toString.call( req.files.media.file ) === '[object Array]' ) {
    for(var i=0; i<req.files.media.file.length; i++) {
      fileArray.push(req.files.media.file[i]);
    }
  } else {
      fileArray.push(req.files.media.file);
  }

  function mediaSave(media) {
    media.save( function( err ) {
      if( err ) return next( err );
    });
  };

  function fileIteration(f) {
    var file = fileArray[f];

    var media = new Media
      , mediaType = file.type.split('/')
      , timeStamp = new Date()
      , suffix = file.name.split('.').pop();


    f++;

    media.filename = timeStamp.getTime() + '.' + suffix;
    media.key_words = req.body.media.key_words;
    media.type = file.type;

    cp.exec("identify " + file.path, function( err, stdout, stderr ) {
      var size = stdout.split(' ')[2];
      media.ratio = size.split('x');
      (media.ratio[0]>media.ratio[1]) ? media.orientation = 'landscape': media.orientation = 'portrait';


      cp.exec("mogrify -resize 640000@ " + file.path, function( err, stdout, stderr ) {
        //if( err ) return uploadFail(err, req.currentUser, next);
        cp.exec("convert " + file.path + " -resize 22500@ " + file.path + ".thumbs", function( err, stdout, stderr ) {
          //if( err ) uploadFail('image 0' + err, req.currentUser, next);
          knox.putFile(file.path, 'images/display/' + media.filename, { 'Content-Type': file.type }, function(err, result) {
            if( err ) return uploadFail('image 1' + err, req.currentUser, next);
            knox.putFile(file.path + '.thumbs', 'images/thumbs/' + media.filename, { 'Content-Type': file.type }, function(err, result) {
              if( err ) return uploadFail('image 2' + err, req.currentUser, next);
              fs.unlink(file.path, function(err) {
                if( err ) return next( err );
                fs.unlink(file.path + '.thumbs', function(err) {
                  if( err ) return next( err );
                  mediaSave(media);
                  if(f < fileArray.length) {
                    fileIteration(f);
                  } else {
                    req.session.messages = {
                      type: 'info',
                      msg: f + ' image(s) have been uploaded'
                    };
                    res.redirect('back');
                  }
                });
              });
            });
          });
        });
      });
    });
  };
  fileIteration(0);
};

//listMedia{{{1
exports.listMedia = function( req, res, next) {
  Media.find({}, function( err, media ) {
    if( err ) return next( err );
    res.render('admin/list_media', {
      layout: 'layout-admin.jade',
      media: media,
      title: 'List Media'
    });
  });
};

//getMedia{{{1
exports.getMedia = function(req, res, next) {
  Media.findById( req.params.id, function( err, media) {
    if( err ) return next( err );
    res.render('admin/media-edit', {
      title: 'Edit media',
      media: media,
    });
  });
};

//editMedia{{{1
exports.editMedia = function( req, res, next ) {
  Media.findById( req.params.id, function( err, media ) {
    if( err ) return next( err );
    for( var i in req.body.media ) {
      media[i] = req.body.media[i];
    }

    media.save( function( err ) {
      if( err ) return next( err );

      req.session.messages = {
        type: 'Info',
        msg: 'Media details updated'
      };
      res.redirect('/admin/media');
    });
  });
};

//deleteMedia{{{1
exports.deleteMedia = function( req, res, next) {
  var fileArray = [];

  if( Object.prototype.toString.call( req.body.image ) === '[object Array]' ) {
    for(var i=0; i<req.body.image.length; i++) {
      fileArray.push(req.body.image[i]);
    }
  } else if(req.params.id) {
      fileArray.push(req.params.id);
  }

  function saveDoc(media) {
    media.remove(function( err ) {
      if(err) return next(err);
      if(media._id == fileArray.slice(-1).toString()) {
        req.session.messages = {
          type: 'info',
          msg: 'Media deleted'
        };
        res.redirect('/admin');
      }
    });
  };

  for(var i=0; i<fileArray.length; i++) {
    var file = fileArray[i];

    Media.findOne( { _id: file }, function( err, media ) {
      if( err ) return next( err );

      if('undefined' == typeof media.type) media.type = 'image';
      var file = media.filename
        , type = media.type.split(',')[0];

      //remove from S3
      switch (type) {
        case 'image':
          knox.deleteFile('images/thumbs/' + file, function( err, result ) {
            if(err) return next(err);
            knox.deleteFile('images/display/' + file, function( err, result ) {
              if(err) return next(err);
              saveDoc(media);
            });
          });
          break;
        case 'video':
          knox.deleteFile('video/' + filename + '.ogv', function( err, result ) {
            if( err ) return next( err );
            knox.deleteFile('video/' + filename + '.mp4', function( err, result ) {
              if( err ) return next( err );
              knox.deleteFile('video/' + filename + '.png', function( err, result ) {
                if( err ) return next( err );
                saveDoc(media);
              });
            });
          });
          break;
        default:
          knox.deleteFile('images/display/' + file, function( err, result ) {
            if( err ) return next( err );
            saveDoc(media);
          });
      };
    });
  };
};


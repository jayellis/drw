//reqiure block {{{1
var jade = require('jade')
  , path = require('path')
  , config = require('../config.js')
  , util = require('util')
  , from = 'noreply@thestinger.org.uk'
  , AmazonSES = require('amazon-ses');

//Send {{{1
module.exports = {
  send: function(template, mailOptions, templateOptions) {
    mailOptions.to = mailOptions.to;
    jade.renderFile(path.join(__dirname, '../views/templates', template), templateOptions, function(err, text) {
      if( err ) console.log(err);
      // Add the rendered Jade template to the mailOptions
      mailOptions.body = {
        text: text.replace(/<(?:.|\n)*?>/gm, ''),
        html: text
      };
      //Decode AWS keys
      var ses = new AmazonSES( config.AWS_KEY, config.AWS_SECRET);
      //console.log('[SENDING MAIL]', util.inspect(mailOptions));
      ses.send(mailOptions,
        function(err, result) {
          if (err) console.log(err);
        }
      );
    });
  },

  //sendWelcome {{
  sendWelcome: function(user) {
    this.send('welcome.jade', { 
      to: [ user.email ], 
      from: from,
      subject: 'Dr Wagner welcomes you' 
    }, { user: user } );
  },

  //seviceMsg {{{1
  serviceMsg: function(err, currentUser) {
    this.send('service.jade', { 
      to: [ currentUser.email, 'jay@dec0de.com'],
      from: from,
      subject: 'Error Report' 
    }, { err: err, currentUser: currentUser });
  },

  //resetPassword {{{1
  resetPassword: function( origin, fname, email, token ) {
    var user = {
      origin: origin,
      fname: fname,
      token: token
    }
    this.send('password.jade', {
      to: [ email ],
      from: from,
      subject: 'Reset password'
    }, { user: user });
  },

  //reserve {{{1
  reserve: function(user, item) {
    this.send('reserve.jade', { 
      to: [ user.email ], 
      from: from,
      subject: 'Reserved Item' 
    }, { 
      user: user,
      item: item 
    });
  },

  poa: function( user, item ) {
    this.send( 'poa.jade', {
      to: [ user.email ],
      from: from,
      subject: 'Price on application'
    }, {
      user: user,
      item: item
    });
  }
};


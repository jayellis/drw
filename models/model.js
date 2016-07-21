//Require block {{{1
var crypto = require('crypto'),
    Media,
    ActionSchema,
    Comment,
    Item,
    User,
    Transaction,
    Shipping,
    ServiceOpt,
    DeliverySchema,
    LoginToken;

function formatPrice(price) {
  price = parseFloat(price);
  if( price !== NaN) {
    var num = price.toString().replace(/\£|\,/g, '');
    if (isNaN(num)) num = '0';
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

//Models {{{1
function defineModels(mongoose, fn) {
  var Schema = mongoose.Schema,
      ObjectId = Schema.ObjectId;

   function validatePresenceOf(value) {
      return value && value.length;
    }

   //ServiceOpt {{{2
   ServiceOpt = new Schema({
    option: String,
    description: String,
    defaultCost: String
   });

  //Shipping {{{2
  Shipping = new Schema({
    service: String,
    contact: String,
    tel: String,
    service_id: String,
    pass: String,
    _serviceOptions: [{ type: ObjectId, ref: 'ServiceOpt' }]
  });

  //Transaction {{{2
  Transaction = new Schema({
    _user: { type: ObjectId, ref: 'User' },
    _items: [ { type: ObjectId, ref: 'Item' } ],
    epdq: String,
    amount: String,
    details: String,
    deliveryOpt: String,
    state: { type: String, enum: [ 'pending', 'declined', 'cancelled', 'accepted' ] }
  });

  //Media {{{2
  Media = new Schema({
    filename: String,
    slug: String,
    orientation: { type: String, enum: [ 'landscape', 'portrait', 'square' ] },
    ratio: [],
    depth: String,
    type: String,
    credit: String,
    key_words: []
  });

  //ActionSchema {{{2
  ActionSchema = new Schema ({
    user: { type: ObjectId, ref:'User' },
    action: String,
    state: { type: String, enum: [ 'active', 'escalate', 'closed' ], default: 'active' }
  });

  //Comment {{{2
  Comment = new Schema({
    user: { type: ObjectId, ref:'User' },
    comment: String,
    comment_date: Date,
    state: { type: String, enum: [ 'flagged', 'hidden', 'visible' ], default: 'visible' },
    action: Array
  });

  //DeliverySchema {{{2
  DeliverySchema = new Schema({
    option: String,
    cost: String
  });

  DeliverySchema.virtual('formatedPrice')
    .get(function() {
      return formatPrice( this.cost );
    });

  //Item {{{2

  Item = new Schema({
    category: String,
    title: String,
    slug: String,
    intro: String,
    text: String,
    price: String,
    _reservation: { type: ObjectId, ref: 'User' },
    delivery: [ DeliverySchema ],
    _media: [ { type: ObjectId, ref: 'Media' } ],
    state: { type: String, enum: [ 'draft', 'sale', 'reserve', 'sold', 'reserved', 'archive' ], default: 'draft' },
    key_words: [],
    comments: [ Comment ],
  });

  Item.virtual('formatedPrice')
    .get(function() {
      if( !isNaN(this.price) ) {
        return formatPrice(this.price);
      } else {
        return 'Price on application';
      }
    });

  Item.virtual('formatedDelivery')
    .get( function() {
      return formatPrice( this.delivery.cost );
    });
  
  //User {{{2
  User = new Schema({
    suffix: String,
    gender: String,
    fname: String,
    lname: String,
    displayName: String,
    address: {
      number: String,
      street: String,
      town: String,
      postcode: String,
      country: String,
    },
    email: { type: String, index: { unique: true } },
    telephone: String, 
    state: { type: String, enum: [ 'active', 'suspended' ], default: 'active' },
    level: { type: String, enum: [ 'user', 'author', 'admin' ], default: 'user' },
    third_party: { type: Boolean, default: false },
    validated: { type: Boolean, default: false },
    hashed_password: String,
    salt: String,
    last_log: Date
  });

  User.virtual('id')
  .get(function() {
    return this._id.toHexString();
  });

  User.virtual('fullName')
  .get( function() {
    return this.fname + ' ' + this.lname;
  });

  User.virtual('password')
  .set(function(password) {
    if( password != '' ) {
      this._password = password;
      this.salt = this.makeSalt();
      this.hashed_password = this.encryptPassword(password);
    }
  })
  .get(function() { return this.hashed_password; });

  User.method('authenticate', function(plainText) {
    return this.encryptPassword(plainText) === this.hashed_password;
  });
  
  User.method('makeSalt', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  User.method('encryptPassword', function(password) {
    return crypto.createHmac('sha1', this.salt).update(password).digest('hex');
  });

  User.pre('save', function(next) {
    this.displayName = this.fname + ' ' + this.lname;
    this.last_log = new Date();
    next();
  });

  //LoginToken {{{2
  LoginToken = new Schema({
      email: { type: String, index: true },
      series: { type: String, index: true },
      token: { type: String, index: true }
  });

  LoginToken.method('randomToken', function() {
    return Math.round((new Date().valueOf() * Math.random())) + '';
  });

  LoginToken.pre('save', function(next) {
    // Automatically create the tokens
    this.token = this.randomToken();

    if (this.isNew)
      this.series = this.randomToken();

    next();
  });

  LoginToken.virtual('id')
    .get(function() {
      return this._id.toHexString();
    });

  LoginToken.virtual('cookieValue')
    .get(function() {
      return JSON.stringify({ email: this.email, token: this.token, series: this.series });
    }); 

  //Model Register {{{2
  mongoose.model('Media', Media);
  mongoose.model('ActionSchema', ActionSchema);
  mongoose.model('Comment', Comment);
  mongoose.model('Item', Item);
  mongoose.model('Transaction', Transaction);
  mongoose.model('Shipping', Shipping);
  mongoose.model('ServiceOpt', ServiceOpt);
  mongoose.model('DeliverySchema', DeliverySchema);
  mongoose.model('User', User);
  mongoose.model('LoginToken', LoginToken);
  fn();
}

//Exports {{{1
exports.defineModels = defineModels; 

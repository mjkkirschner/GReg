const passport = require('passport');
const BasicStrategy = require('passport-http').BasicStrategy;
const UserModel = require('../models/user').UserModel;

// //////////////////////
// Passport
// //////////////////////

passport.use(new BasicStrategy(

  ((username, password, done) => {
    UserModel.findOne({ username }, (err, user) => {
      if (err) { return done(err); }
      if (!user) { return done(null, false); }
      return done(null, user);
    });
  }),

));

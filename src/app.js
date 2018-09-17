const fs = require('fs');
const dotenv = require('dotenv');

if (fs.existsSync('.env')) {
  dotenv.config();
}

require('newrelic');

const constants = require('constants');
const express = require('express');

const app = express();
const https = require('https');
const bodyParser = require('body-parser');
const multer = require('multer');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');

const path = require('path');
const mongoose = require('mongoose');
const passport = require('passport');
const pkg = require('./routes/package');
const user = require('./routes/user');
const stats = require('./routes/stats');
const error = require('./lib/error');
const stats_update = require('./lib/stats_update');
const gdpr = require('./lib/gdpr');

require('./routes');
require('./lib/oxygen_auth');
require('./lib/basic_auth');

// //////////////////////
// DB
// //////////////////////

const mongoDbName = process.env.GREG_DB_NAME || 'greg-dev';
const mongoDbUrl = process.env.GREG_DB_URL || 'mongodb://localhost:27017/';
const mongoUri = mongoDbUrl + mongoDbName;

mongoose.connect(mongoUri, (err) => {
  if (!err) {
    console.log(`Connected to MongoDB at ${mongoUri}`);
  } else {
    throw err;
  }
});

// //////////////////////
// Express Config
// //////////////////////

app.use(morgan('combined'));
app.use(compression());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'pug');
app.engine('html', require('ejs').renderFile);

app.use(cookieParser());
app.use(bodyParser.json());
app.use(pkg.postPut);
app.use(passport.initialize());
app.use(express.static(path.join(__dirname, '../public')));

// //////////////////////
// Routes
// //////////////////////

const auth_type = process.env.GREG_USE_OXYGEN === 'true' ? 'oxygen' : 'basic';

console.log(`Using authorization strategy: ${auth_type}`);

// package header download

app.get('/package/:id', pkg.by_id);
app.get('/package/:engine/:name', pkg.by_engine_and_name);

// download pkg contents

app.get('/download/:id/:version', pkg.download_vers);
app.get('/download/:id', pkg.download_last_vers);

// list packages

app.get('/packages', pkg.all);
app.get('/packages/:engine', pkg.by_engine);

// stats

app.get('/stats', stats.all_stats);
app.get('/user_stats', stats.all_user_stats);
app.get('/pkg_stats', stats.all_engine_stats);
app.get('/pkg_stats/:engine', stats.all_engine_stats);

// users

app.get('/user_name/:name', user.by_name);
app.get('/user/:id', user.by_id);

// terms of use

app.get('/tou', passport.authenticate(auth_type, { session: false }), user.accepted_terms_of_use);
app.put('/tou', passport.authenticate(auth_type, { session: false }), user.accept_terms_of_use);

// submit pkg

app.post('/package', multer().single('pkg'), passport.authenticate(auth_type, { session: false }), pkg.add);
app.put('/package', multer().single('pkg'), passport.authenticate(auth_type, { session: false }), pkg.add_version);

// deprecation

app.put('/deprecate/:id', passport.authenticate(auth_type, { session: false }), pkg.deprecate_by_id);
app.put('/undeprecate/:id', passport.authenticate(auth_type, { session: false }), pkg.undeprecate_by_id);
app.put('/deprecate/:engine/:name',
  passport.authenticate(auth_type, { session: false }),
  pkg.deprecate_by_engine_and_name);
app.put('/undeprecate/:engine/:name',
  passport.authenticate(auth_type, { session: false }),
  pkg.undeprecate_by_engine_and_name);

// banning

app.put('/ban/:id', passport.authenticate(auth_type, { session: false }), pkg.ban_by_id);
app.put('/unban/:id', passport.authenticate(auth_type, { session: false }), pkg.unban_by_id);

// voting

app.put('/upvote/:id', passport.authenticate(auth_type, { session: false }), pkg.upvote_by_id);
app.put('/downvote/:id', passport.authenticate(auth_type, { session: false }), pkg.downvote_by_id);
app.put('/upvote/:engine/:name',
  passport.authenticate(auth_type, { session: false }),
  pkg.upvote_by_engine_and_name);
app.put('/downvote/:engine/:name',
  passport.authenticate(auth_type, { session: false }),
  pkg.downvote_by_engine_and_name);

// commenting

app.put('/comment/:id', passport.authenticate(auth_type, { session: false }), pkg.comment_by_id);
app.put('/comment/:engine/:name', passport.authenticate(auth_type, { session: false }), pkg.comment_by_engine_and_name);

// auth validation

app.get('/validate', passport.authenticate(auth_type, { session: false }), (req, res) => {
  res.send(error.success('You are logged in.'));
});

// white listing
app.put('/whitelist/:pkg_id', passport.authenticate(auth_type, { session: false }), pkg.whitelist_by_id);
app.put('/unwhitelist/:pkg_id', passport.authenticate(auth_type, { session: false }), pkg.unwhitelist_by_id);
app.get('/whitelist', pkg.all_whitelist);

// //////////////////////
// Statistics update
// /////////////////////

// provisional stats update until we do this on all routes
setInterval(() => {
  stats_update.synchronize_package_stats(() => { console.log('synchronized package stats'); });
}, 1000 * 60 * 20); // every 20 minutes

setInterval(() => {
  stats_update.synchronize_user_stats(() => { console.log('synchronize user stats'); });
}, 1000 * 60 * 20 + 2000); // every 20 minutes

// //////////////////////
// GDPR
// //////////////////////
app.post('/gdprDeleteRequest', gdpr.handleGDPRRRequest);

// //////////////////////
// Server
// //////////////////////

let server;

const port = process.env.PORT || 8080;
const keyfn = 'ssl/server.key';
const crtfn = 'ssl/server.crt';

if (fs.existsSync(keyfn) || fs.existsSync(crtfn)) {
  const key = fs.readFileSync(keyfn, 'utf8');
  const crt = fs.readFileSync(crtfn, 'utf8');
  const options = {
    key,
    cert: crt,
    // TODO: uncomment this to reject TLS1.0 connections
    // secureOptions: constants.SSL_OP_NO_TLSv1,
  };

  server = https.createServer(cred, app).listen(443, () => {
    console.log('✔ Secure Express server listening on port %d in %s mode', 443, app.get('env'));
  });
} else {
  console.log('Could not find SSL certificates');
}

server = app.listen(port, () => {
  console.log('✔ Express server listening on port %d in %s mode', port, app.get('env'));
});

module.exports = server;

var express = require('express')
  , app = express()
	, http = require('http')
	, https = require('https')
	, fs = require('fs')
    , path = require('path')
    , mongoose = require('mongoose')
    , routes = require('./routes')
    , pkg = require('./routes/package')
    , passport = require('passport')
    , user = require('./routes/user')
    , users = require('./lib/users')
    , oxy_auth = require('./lib/oxygen_auth')
    , stats = require('./routes/stats')
    , basic_auth = require('./lib/basic_auth')
    , error = require('./lib/error')
  , stats_update = require('./lib/stats_update')
  , gdpr = require('./lib/gdpr');

////////////////////////
// DB
////////////////////////

  var mongoDbName = process.env.GREG_DB_NAME || "greg-dev";
  var mongoDbUrl = process.env.GREG_DB_URL || "mongodb://localhost:27017/";
	var mongoUri = mongoDbUrl + mongoDbName;	
/*
  mongoose.connect(mongoUri, function(err) {
    if (!err) {
       console.log('Connected to MongoDB at ' + mongoUri);
      } else {
        throw err;
      }
  });
*/
////////////////////////
// Express Config
////////////////////////

  app.configure(function() {
    app.use(express.logger());
    app.use(express.compress());
    app.set('views', __dirname + '/views');
    app.set('view engine', 'jade')
    app.engine('html', require('ejs').renderFile);
    app.use(express.cookieParser());
    app.use(express.bodyParser());
    app.use(pkg.postPut);
    app.use(gdpr.postPut);
		app.use(passport.initialize());
    app.use(app.router);
    app.use(express.static(path.join(__dirname, 'public')));
  });

////////////////////////
// Routes
////////////////////////

  var auth_type =  process.env.GREG_USE_OXYGEN === 'true' ? 'oxygen' : 'basic'; 

  console.log('Using authorization strategy: ' + auth_type);

// package header download 

  app.get('/package/:id', pkg.by_id );
  app.get('/package/:engine/:name', pkg.by_engine_and_name );

// download pkg contents

  app.get('/download/:id/:version', pkg.download_vers );
  app.get('/download/:id', pkg.download_last_vers );

// list packages

  app.get('/packages', pkg.all );
  app.get('/packages/:engine', pkg.by_engine );

// stats

  app.get('/stats', stats.all_stats );
  app.get('/user_stats', stats.all_user_stats );
  app.get('/pkg_stats', stats.all_engine_stats );
  app.get('/pkg_stats/:engine', stats.all_engine_stats );

// users

  app.get('/user_name/:name', user.by_name );
  app.get('/user/:id', user.by_id );

// terms of use

  app.get('/tou', passport.authenticate(auth_type, { session: false }), user.accepted_terms_of_use );
  app.put('/tou', passport.authenticate(auth_type, { session: false }), user.accept_terms_of_use );

// submit pkg

  app.post('/package', passport.authenticate(auth_type, { session: false }), pkg.add);
  app.put('/package', passport.authenticate(auth_type, { session: false }), pkg.add_version);

// deprecation

  app.put('/deprecate/:id', passport.authenticate(auth_type, { session: false }), pkg.deprecate_by_id);
  app.put('/undeprecate/:id', passport.authenticate(auth_type, { session: false }), pkg.undeprecate_by_id);
  app.put('/deprecate/:engine/:name', passport.authenticate(auth_type, { session: false }), pkg.deprecate_by_engine_and_name);
  app.put('/undeprecate/:engine/:name', passport.authenticate(auth_type, { session: false }), pkg.undeprecate_by_engine_and_name);

// banning

  app.put('/ban/:id', passport.authenticate(auth_type, { session: false }), pkg.ban_by_id);
  app.put('/unban/:id', passport.authenticate(auth_type, { session: false }), pkg.unban_by_id);

// voting

  app.put('/upvote/:id', passport.authenticate(auth_type, { session: false }), pkg.upvote_by_id);
  app.put('/downvote/:id', passport.authenticate(auth_type, { session: false }), pkg.downvote_by_id);
  app.put('/upvote/:engine/:name', passport.authenticate(auth_type, { session: false }), pkg.upvote_by_engine_and_name);
  app.put('/downvote/:engine/:name', passport.authenticate(auth_type, { session: false }), pkg.downvote_by_engine_and_name);

// commenting

  app.put('/comment/:id', passport.authenticate(auth_type, { session: false }), pkg.comment_by_id );
  app.put('/comment/:engine/:name', passport.authenticate(auth_type, { session: false }), pkg.comment_by_engine_and_name );

// auth validation

  app.get('/validate', passport.authenticate(auth_type, { session: false }), function(req, res){
    res.send(error.success("You are logged in."))
  });

// white listing
  app.put('/whitelist/:pkg_id', passport.authenticate(auth_type, { session: false }), pkg.whitelist_by_id);
  app.put('/unwhitelist/:pkg_id', passport.authenticate(auth_type, { session: false }), pkg.unwhitelist_by_id);
  app.get('/whitelist', pkg.all_whitelist);

////////////////////////
// Statistics update
///////////////////////	

	// provisional stats update until we do this on all routes 
	setInterval(function(){
		stats_update.synchronize_package_stats(function(){ console.log('synchronized package stats'); });
	}, 1000 * 60 * 20 ); // every 20 minutes 

	setInterval(function(){
		stats_update.synchronize_user_stats(function(){ console.log('synchronize user stats'); });
  }, 1000 * 60 * 20 + 2000 ); // every 20 minutes 
  
////////////////////////
// GDPR
////////////////////////
app.post('/gdprDeleteRequest', gdpr.handleGDPRRRequest);

////////////////////////
// Server
////////////////////////

var server;

  var port = process.env.PORT || 8080;
	var keyfn = 'greg/ssl/server.key';
	var crtfn = 'greg/ssl/server.crt';

	if ( fs.existsSync( keyfn ) || fs.existsSync( crtfn ) ){

	  var key = fs.readFileSync(keyfn, 'utf8');
	  var crt = fs.readFileSync(crtfn, 'utf8');
	  var cred = { key: key, cert: crt, secureProtocol: "TLSv1_2_method" };

	  server = https.createServer(cred, app).listen(443, function() {
	    console.log("✔ Secure Express server listening on port %d in %s mode", 443, app.get('env'));
	  });

	} else {

		console.log('Could not find SSL certificates');

	}

    server = app.listen( port, function() {
	  console.log("✔ Express server listening on port %d in %s mode", port, app.get('env'));
	});

module.exports = server;

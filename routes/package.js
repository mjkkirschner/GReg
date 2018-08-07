var PackageModel = require('../models/package').PackageModel
  , error = require('../lib/error')
  , packages = require('../lib/packages')
  , mongoose = require('mongoose')
  , _ = require('underscore')
  , path = require('path');

var cache = {};

/** 
 * Invoked for any POST or PUT request
 *
 */
exports.postPut = function(req, res, next){
	if (req.method != "GET") cache = {};
	next();
};

/**
 * Deprecate a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.deprecate_by_id = function(req, res) {

  var pkg_id = req.params.id;
  packages.set_pkg_deprecation( req, true, pkg_id, res );

};

/**
 * "Undeprecate" a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.undeprecate_by_id = function(req, res) {

  var pkg_id = req.params.id;
  packages.set_pkg_deprecation( req, false, pkg_id, res );

};

/**
 * Ban a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.ban_by_id = function(req, res) {

  var pkg_id = req.params.id;
  packages.set_pkg_banned( req, true, pkg_id, res );

};

/**
 * Unban a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.unban_by_id = function(req, res) {

  var pkg_id = req.params.id;
  packages.set_pkg_banned( req, false, pkg_id, res );

};

/**
 * Deprecate a package by engine and name
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.deprecate_by_engine_and_name = function(req, res) {

  var engine = req.params.engine
    , name = req.params.name;
  
  packages.by_engine_and_name( engine, name, function(err, pkg){
    
    if (err) return res.status(404).send(error.fail('The package does not exist'));
    packages.set_pkg_deprecation( req, true, pkg._id, res );
  
  });

};

/**
 * "Undeprecate" a package by engine and name
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.undeprecate_by_engine_and_name = function(req, res) {

  var engine = req.params.engine
    , name = req.params.name;

  packages.by_engine_and_name( engine, name, function(err, pkg){
    
    if (err) return res.status(404).send(error.fail('The package does not exist'));
    packages.set_pkg_deprecation( req, false, pkg._id, res );
  
  });

};

/**
 * Vote for a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.upvote_by_id = function(req, res) {

  var pkg_id = req.params.id
    , user_id = req.user._id;

  packages.vote( pkg_id, user_id, 1, res );

};


/**
 * Vote for a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.downvote_by_id = function(req, res) {

  var pkg_id = req.params.id
    , user_id = req.user._id;

  packages.vote( pkg_id, user_id, -1, res );

};

/**
 * Deprecate a package by engine and name
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.upvote_by_engine_and_name = function(req, res) {

  var engine = req.params.engine
    , name = req.params.name
    , user_id = req.user._id;

  packages.by_engine_and_name( engine, name, function(err, pkg){
    
    if (err) return res.status(404).send(error.fail('The package does not exist'));
    packages.vote( pkg._id, user_id, 1, res );
  
  });

};

/**
 * "Undeprecate" a package by engine and name
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.downvote_by_engine_and_name = function(req, res) {

  var engine = req.params.engine
    , name = req.params.name
    , user_id = req.user._id;

  packages.by_engine_and_name( engine, name, function(err, pkg){
    
    if (err) return res.status(404).send(error.fail('The package does not exist'));
    packages.vote( pkg._id, user_id, -1, res );
  
  });

};

/**
 * Add a comment to a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.comment_by_id = function(req, res) {

  var pkg_id = req.params.id
    , user_id = req.user._id;

  if (req.body && req.body.comment){
    packages.comment( pkg_id, user_id, req.body.comment, res );
  } else {
    return res.status(403).send(error.fail("You cannot send an empty comment."));
  }

};

/**
 * Add a comment to a package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */
exports.comment_by_engine_and_name = function(req, res) {

  var engine = req.params.engine
    , name = req.params.name
    , user_id = req.user._id;

  packages.by_engine_and_name( engine, name, function(err, pkg){
    
    if (err) return res.status(404).send(error.fail('The package does not exist'));
    if (req.body && req.body.comment){
      packages.comment( pkg._id, user_id, req.body.comment, res );
    } else {
      return res.status(403).send(error.fail("You cannot send an empty comment."));
    }
  
  });

};


/**
 * Download the most recent version of a package given an id
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 *
 */

exports.download_last_vers = function(req, res) {

  var id = req.params.id;
  var version = req.params.version;

  packages.by_id(id, function(err, pkg) {

    if ( err || !pkg ) {
      try {
        return res.send( error.fail("Could not find package") );
      } catch (exception) {
        return res.status(500).send(error.fail("Failed to obtain package"));
      }
    }

    try {
        if(process.env.NODE_ENV == "test"){
            // For testing, we send the local file.
            var pkgUrl = pkg.versions[pkg.versions.length-1].url;
            var pathParse = path.parse(pkgUrl);
            return res.sendfile( pathParse.base, {root: path.resolve('test/mock_bucket/') } );
        }else{
            return res.redirect( pkg.versions[pkg.versions.length-1].url )
        }
    } catch (exception) {
      return res.status(500).send(error.fail('Failed to obtain package version'));
    }

    return res.status(500).send(error.fail('Something unexpected happened' ));

  });

};


/**
 * Download a package given an id and version
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 *
 */

exports.download_vers = function(req, res) {

  var id = req.params.id;
  var version = req.params.version;

  packages.by_id(id, function(err, pkg) {

    if ( err || !pkg ) {
      try {
        return res.send( error.fail("Could not find package") );
      } catch (exception) {
        res.status(500).send(error.fail('Failed to obtain the package' ));
        return console.log('Log error - failed to download a package with id: ' + id);
      }
    }

    // check the version exists, and return it if possible
    for (var i = 0; i < pkg.versions.length; i++) {
      if ( version === pkg.versions[i].version ) {  
        try {
            if(process.env.NODE_ENV == "test"){
                    // For testing, we send the local file.
                    var pkgUrl = pkg.versions[i].url;
                    var pathParse = path.parse(pkgUrl);
                    return res.sendfile( pathParse.base, {root: path.resolve('test/mock_bucket/') } );
                }else{
                    pkg.downloads = pkg.downloads + 1;
                    pkg.markModified('downloads');
                    pkg.save();
                    return res.redirect( pkg.versions[i].url )
                }
        } catch (exception) {
          return res.status(500).send(error.fail('Failed to redirect' ));
        }
      }
    }

    return res.status(404).send(error.fail('The version you specified does not exist'));

  });

};

/**
 * Lookup a package by id
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */

exports.by_id = function(req, res) {

  var id = req.params.id;

  packages.by_id(id, function(err, pkg) {

    if ( err || !pkg ) {
      console.log('Error')
      try {
        return res.send( error.fail("Could not find package") );
      } catch (exception) {
        res.status(500).send(error.fail('Failed to obtain the package'));
        return console.log('Log error - failed to download a package with id: ' + id);
      }
    }

    var data = error.success_with_content('Found package', pkg);
    try {
      return res.send(data);
    } catch (exception) {
      res.status(500).send(error.fail('Failed to send data'));
      return console.log('Log error');
    }

  });

};

/**
 * Get all packages
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */


exports.all = function(req, res) {

	if ( cache.all ){
		res.setHeader('Content-Type', 'application/json');
		return res.send( cache.all );
	}

  packages.all(function (err, pkgs) {

    if ( err || !pkgs ) {
      try {
        return res.send( error.fail("There are no packages") );
      } catch (exception) {
        res.status(500).send(error.fail('Error obtaining packages'));
        return console.log('Log error');
      }
    }

    var data = error.success_with_content('Found packages', pkgs);
	  cache.all = JSON.stringify(data);
	
		try {
      return res.send( data );
    } catch (exception) {
      res.status(500).send(error.fail('Failed to send data'));
      return console.log('Log error');
    }

  })

};

/**
 * Lookup all packages with a particular engine
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */

exports.by_engine = function(req, res) {

  var engine = req.params.engine;

	if (cache.by_engine && cache.by_engine[engine]){
		res.setHeader('Content-Type', 'application/json');	
		return res.send( cache.by_engine[engine] );
	}

  packages.by_engine(engine, function(err, pkgs) {

    if ( err || !pkgs || pkgs.length === 0 )
    {
      res.status(404).send(error.fail("There are no packages with that engine name"));
      return;
    }

    var data = error.success_with_content('Found packages', pkgs);
    
		if (!cache.by_engine) cache.by_engine = {};
		
		res.send( data );
		cache.by_engine[engine] = JSON.stringify(data);		

  });

};

/**
 * Lookup a package by engine and name.  Returns only a single package.
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */

exports.by_engine_and_name = function(req, res) {

  var engine = req.params.engine;
  var name = req.params.name;
  packages.by_engine_and_name(engine, name, function(err, pkg) {

    if ( err || !pkg )
    {
      return res.status(404).send(error.fail("There is no package with that engine and package name"));
    }

    var data = error.success_with_content('Found package', pkg);
    return res.send( data );

  });

};

/**
 * Add a new package
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */

exports.add = function(req, res) {

  if (!req.body.pkg_header){
    return res.status(400).send(error.fail('You did not provide a pkg_header'));
  }

  if (!req.file) {
    return res.status(400).send(error.fail('You did not provide a pkg file'));
  }

  var pkg = JSON.parse( req.body.pkg_header );

  packages.save_new_pkg(req, pkg, function(result) {
    try {
      return res.send(result);
    } catch (exception) {
      return console.error('Failed to send result')
    }
  });

}

/**
 * Add a new package version
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */

exports.add_version = function(req, res) {

  if (!req.body.pkg_header){
    return res.status(400).send(error.fail('You did not provide a pkg_header'));
  }

  if (!req.file){
    return res.status(400).send(error.fail('You did not provide a pkg file'));
  }

  var pkg = JSON.parse( req.body.pkg_header );

  packages.save_new_pkg_version(req, pkg, function(result) {
    try {
      return res.send(result);
    } catch (exception) {
      return res.status(500).send(error.fail('Failed to save package version'));
    }
  });

}

/**
 * Delete a package from the db
 *
 * @param {Object} HTTP request 
 * @param {Object} HTTP response
 * @api public
 */

exports.remove = function(req, res) {
  var id = req.params.id;
  res.send({thing: 'hi'});
}

/**
 * Add a package to the white list.
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
*/
exports.whitelist_by_id = function(req, res){

  if(!req.user.super_user){
      return res.status(403).send(error.fail('Adding packages to the white list is only allowed for super users.'));
  };

  var id = req.params.pkg_id;
  
  packages.whitelist_by_id(id, function(err, num) {

    if ( err ) {
      return res.status(500).send(error.fail(err));
    }
    
    if(num === 0){
        return res.status(404).send(error.fail("No packages were updated."));
    }
    
    return res.status(201).send(error.success(num + " packages updated successfully."));

  });
};

/**
 * Remove a package from the white list.
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
 */
exports.unwhitelist_by_id = function(req,res){
    
    if(!req.user.super_user){
      return res.status(403).send(error.fail('Removing packages from the white list is only allowed for super users.'));
    };

    var id = req.params.pkg_id;
    
    packages.unwhitelist_by_id(id, function(err, num) {

        if ( err ) {
        return res.status(500).send(error.fail(err));
        }
        
        if(num === 0){
            return res.status(404).send(error.fail("No packages were updated."));
        }
        
        return res.status(201).send(error.success(num + " packages updated successfully."));

    });
}

/**
 * Get all white-listed packages.
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
*/
exports.all_whitelist = function(req, res){

    packages.all_whitelist(function(err, pkgs){
        if(err || !pkgs){
            return res.status(500).send(error.fail('Could not get white listed packages'));
        }
        return res.status(200).send(error.success_with_content("Succesfully retrieved white listed packages.", pkgs));
    });
};


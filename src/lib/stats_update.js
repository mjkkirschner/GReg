const _ = require('underscore');
const async = require('async');

const PackageModel = require('../models/package').PackageModel;
const UserModel = require('../models/user').UserModel;
const error = require('./error');


exports.synchronize_package_stats = (callback) => {
  PackageModel.find({}, (err, pkgs) => {
    if (err || !pkgs || pkgs.length === 0) {
      console.error('failed to get pks');
      callback(error.fail('Failed to get packages'));
      return;
    }

    // construct all the pkg updates
    const updates = [];
    _.each(pkgs, (pkg_it) => {
      updates.push(((pkg) => {
        return (inner_callback) => {
          pkg.num_comments = pkg.comments.length;
          pkg.markModified('num_comments');

          pkg.num_dependents = pkg.used_by.length;
          pkg.markModified('num_dependents');

          pkg.created = pkg.versions[0].created;
          pkg.markModified('created');

          pkg.latest_comment = pkg.comments.length > 0 ? _.last(pkg.comments).created : 0;
          pkg.markModified('latest_comment');

          pkg.latest_version_update = _.last(pkg.versions).created;
          pkg.markModified('latest_version_update');

          pkg.num_versions = pkg.versions.length;
          pkg.markModified('num_versions');

          pkg.save(inner_callback);
        };
      })(pkg_it));
    });

    async.parallel(updates, (updateErr) => {
      if (updateErr) return console.error(updateErr);
      callback(error.success());
    });
  });
};


exports.synchronize_user_stats = (callback) => {
  UserModel
    .find({})
    .populate('maintains', 'votes downloads num_comments latest_version_update')
    .exec((err, users) => {
      if (err || !users || users.length === 0) {
        console.error('failed to get users');
        return callback(error.fail('Failed to get users'));
      }

      const updates = [];
      _.each(users, (user_it) => {
        updates.push(((user) => {
          return (inner_callback) => {
            user.num_votes_for_maintained_packages = _.reduce(user.maintains,
              (memo, pkg) => memo + pkg.votes, 0);
            user.markModified('num_votes_for_maintained_packages');

            user.num_downloads_for_maintained_packages = _.reduce(user.maintains,
              (memo, pkg) => memo + pkg.downloads, 0);
            user.markModified('num_downloads_for_maintained_packages');

            user.num_maintained_packages = user.maintains.length;
            user.markModified('num_maintained_packages');

            if (user.num_maintained_packages > 0) {
              const last_update_time = 0;
              let last_updated_pkg = _.first(user.maintains);
              _.each(user.maintains, (pkg) => {
                if (pkg.latest_version_update.getTime() > last_update_time) last_updated_pkg = pkg;
              });

              user.last_updated_package = last_updated_pkg;
              user.markModified('last_updated_package');
            }

            user.save(inner_callback);
          };
        })(user_it));
      });

      async.parallel(updates, (updateErr) => {
        if (updateErr) return console.error(updateErr);
        callback(error.success());
      });
    });
};


exports.cleanup_user_maintains = (callback) => {
  UserModel
    .find({})
    .exec((err, users) => {
      if (err || !users || users.length === 0) {
        console.error('failed to get users');
        return callback(error.fail('Failed to get users'));
      }

      const updates = [];
      _.each(users, (user_it) => {
        updates.push(((user) => {
          return (inner_callback) => {
            user.maintains = user.maintains.filter((elem, pos) => user.maintains.indexOf(elem) === pos);
            user.markModified('maintains');
            user.save(inner_callback);
          };
        })(user_it));
      });

      async.parallel(updates, (updateErr) => {
        if (updateErr) return console.error(updateErr);
        callback(error.success());
      });
    });
};

/*
////////////////////////
// DB
////////////////////////

var mongoDbName = process.env.GREG_DB_NAME;
var mongoDbUrl = process.env.GREG_DB_URL;
var mongoUri = mongoDbUrl + mongoDbName;

mongoose.connect(mongoUri, function(err) {
if (!err) {
   console.log('Connected to MongoDB at ' + mongoUri);
  } else {
    throw err;
  }
});

exports.synchronize_package_stats(function(err){
  if (err) return console.error(err);
  console.log('success');
});

exports.cleanup_user_maintains(function(err){
  if (err) return console.error(err);
  console.log('success');
});

exports.synchronize_user_stats(function(err){
  if (!err.success) return console.error(err);
  console.log('SUCCESS!!!');
});
*/

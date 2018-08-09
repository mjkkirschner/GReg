const _ = require('underscore');
const async = require('async');
const UserModel = require('../models/user').UserModel;
const PackageModel = require('../models/package').PackageModel;
const error = require('./error');


/**
 * Create new dummy user for debugging.  THIS IS NOT PRODUCTION CODE.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api private
 */

const debugUserName = 'test';

exports.initDebugUser = () => {
  UserModel.findOne({ username: debugUserName }, (err, user) => {
    if (err || !user) {
      console.log('Attempting to create new debug user...');
      const master_user = new UserModel({ username: debugUserName, super_user: true });

      master_user.save((saveErr) => {
        if (saveErr) {
          console.log('Failed to create new debug user...');
        }
        console.log('Successfully created new debug user...');
      });
    }
  });
};

exports.cleanupDebugUser = () => {
  UserModel.findOneAndRemove({ username: debugUserName }, (err, user) => {
    if (err || !user) {
      console.log('Could not find the test user for deletion.');
    }
  });
};

/**
 * Updates the used_by field of a list of packages with a dependent package id in parallel. Doesn't create duplicates.
 *
 * @param {Object} The pkg
 * @param {Array} The list of maintainers
 * @param {Function} Callback to execute after inserting. The argument is an error object if any of
 * the package updates failed.
 * @api public
 */

exports.update_user_list_maintains = (pkg_id, mantainer_id_list, callback) => {
  const funcs = [];

  // build up list of work to do
  _.each(mantainer_id_list, (maintainer_id) => {
    funcs.push((inner_callback) => {
      exports.update_user_maintains(pkg_id, maintainer_id, inner_callback);
    });
  });

  async.parallel(funcs, (err, users) => {
    if (err) {
      callback(error.fail('Failed to update the maintains field of a user. '));
    }
    callback(null, users);
  });
};


/**
 *
 * Add a maintainer to a package
 *
 * @param {Object} Package id
 * @param {Object} User id
 * @param {Function} Callback to execute after inserting. The argument is an error object if any of
 * the package updates failed.
 * @api public
 */

exports.set_maintainer = (pkg_id, maintainer_id, callback) => {
  UserModel.find(maintainer_id, (err, user) => {
    if (err) {
      if (callback) callback('The user does not exist');
      return;
    }

    PackageModel.findById(pkg_id, (findErr, pkg) => {
      if (findErr) {
        if (callback) callback('The package does not exist');
        return;
      }

      pkg.maintainers = [maintainer_id];

      pkg.markModified('maintainers');
      pkg.save();

      console.log('maintainer is set');
      exports.update_user_maintains(pkg_id, maintainer_id, callback);
    });
  });
};

/**
 * Updates a users maintains field with a package. Doesn't create duplicates.
 *
 * @param {Object} The pkg id
 * @param {Object} The user id
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api public
 */

exports.update_user_maintains = (pkg_id, maintainer_id, callback) => {
  UserModel.findById(maintainer_id, (err, user) => {
    if (err) {
      if (callback) callback('The user does not exist');
      return;
    }

    if (user.maintains.indexOf(pkg_id) === -1) {
      user.maintains.push(pkg_id);

      user.maintains = user.maintains.filter((elem, pos) => user.maintains.indexOf(elem) === pos);

      user.markModified('maintains');
      user.save();
    }

    if (callback) callback(null, user);
  });
};

/**
 * Validate new user data.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api private
 */

function _validate_new_user(pkg_data, callback) {
  if (callback) callback(); // callback with nothing, indicating success
}

/**
 * Save a new user into the database, assuming data has been validated.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api private
 */

function _save_new_user(pkg_data, callback) {
  const user = new UserModel({
    name: pkg_data.name,
  });

  user.save((err) => {
    if (err) {
      if (callback) callback(error.fail('DB error creating the new user.'));
      return;
    }

    if (callback) callback(error.success('Successfully inserted user into the database.'));
  });
}

/**
 * Save a new user into the database, assuming data has been validated.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api public
 */

exports.save_new_user = (pkg_data, callback) => {
  _validate_new_user(pkg_data, (err) => {
    if (err) {
      if (callback) callback(err);
      return;
    }

    _save_new_user(pkg_data, callback);
  });
};

/**
 * Get user by the username
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object and the id, if found.
 * @api public
 */

exports.get_user_by_name = (username, callback) => {
  UserModel.findOne({ username }, (err, user) => {
    if (err || !user) {
      callback(error.fail('Could not find the user in the database.'));
      return;
    }

    callback(null, user);
  });
};

/**
 * Lookup a collection users in the databse
 *
 * @param {Array} A collection of users to look up
 * @param {Function} Callback to execute after inserting. The argument is an error object
 * (if necessary) and all the users in an array.  The function terminates prematurely if
 * any of the users couldn't be found.
 * @api public
 */

exports.find_users_by_name = (un_arr, callback) => {
  // all of the lookups we are about to do
  const pkg_lookups = [];

  _.each(un_arr, (un) => {
    pkg_lookups.push((inner_callback) => {
      UserModel.findOne({ username: un }, (err, user) => {
        if (err) {
          inner_callback(error.fail(`The user called '${un}' does not exist`));
          return;
        }
        inner_callback(null, user);
      }); // find one
    }); // push func
  }); // each

  // run all of these lookups in parallel, callback is executed if any of them fails
  async.parallel(pkg_lookups, (err, users) => {
    if (err) {
      callback(err);
      return;
    }

    callback(null, users);
  });
};

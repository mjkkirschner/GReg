const async = require('async');
const _ = require('underscore');
const crypto = require('crypto');
const stream = require('stream');

const storage = require('./storage');
const UserModel = require('../models/user').UserModel;
const users = require('./users');
const error = require('./error');
const PackageModel = require('../models/package').PackageModel;


function removeAtIndex(arr, ind) {
  if (!arr || ind >= arr.length || ind < 0) {
    return arr;
  }

  arr.splice(ind, 1);
  return arr;
}

/**
 * Add a comment to a package
 *
 * @param {Object} Package id
 * @param {Object} User id
 * @param {string} Comment
 * @param {Object} Response handle
 * @api public
 */
exports.comment = (pkg_id, user_id, comment, res) => {
  PackageModel.findById(pkg_id, (err, pkg) => {
    if (err || !pkg) {
      try {
        return res.send(error.fail('Could not find package'));
      } catch (exception) {
        return console.log(`Log error - failed to find a package with id: ${pkg_id}`);
      }
    }

    const created = Date.now();
    pkg.comments.push({ user: user_id, text: comment, created });
    pkg.markModified('comments');

    pkg.num_comments += 1;
    pkg.markModified('num_comments');

    pkg.last_comment = created;
    pkg.markModified('last_comment');

    pkg.save((saveErr) => {
      if (saveErr) {
        try {
          return res.status(500)
            .send(error.fail('There was a problem updating the package. The comment was not saved.'));
        } catch (exception) {
          return console.log(saveErr);
        }
      }

      try {
        return res.send(error.success('Comment registered', { comments: pkg.comments }));
      } catch (e) {
        return console.log(e);
      }
    }); // save pkg
  }); // lookup pkg
};


/**
 * Edit votes for a package
 *
 * @param {Object} Package id
 * @param {Object} User id
 * @param {number} change (expects +1 or -1)
 * @param {Object} Response handle
 * @api public
 */
exports.vote = (pkg_id, user_id, change, res) => {
  PackageModel.findById(pkg_id, (err, pkg) => {
    if (err || !pkg) {
      try {
        console.error('could not find pkg');
        return res.send(error.fail('Could not find package'));
      } catch (exception) {
        return console.log(`Log error - failed to find a package with id: ${pkg_id}`);
      }
    }

    UserModel.findById(user_id, (findErr, user) => {
      if (findErr || !user) {
        try {
          console.error('not a valid user');
          return res.send(error.fail('Not a valid user'));
        } catch (exception) {
          return console.log('Failed to obtain user object');
        }
      }

      // if you've upvoted and try to do it again, reject
      if (change > 0 && user.has_upvoted && user.has_upvoted.indexOf(pkg_id) !== -1) {
        try {
          console.error('already upvoted');
          return res.status(403).send(error.fail('You have already upvoted this package.'));
        } catch (exception) {
          return console.log('Log error - already upvoted');
        }
      }

      // if you've downvoted and try to do it again, reject
      if (change < 0 && user.has_downvoted && user.has_downvoted.indexOf(pkg_id) !== -1) {
        try {
          console.error('already downvoted');
          return res.status(403).send(error.fail('You have already downvoted this package.'));
        } catch (exception) {
          return console.log('Log error - already downvoted');
        }
      }

      // at this point, the user is doing one of the following

      // 1) has a recorded upvote and is now downvoting to neutral
      // 2) has a recorded downvote and is now upvoting to neutral
      // 3) has recorded neither and is upvoting
      // 4) has recorded neither and is downvoting

      pkg.votes += change;

      if (user.has_upvoted && user.has_upvoted.indexOf(pkg_id) !== -1) {
        // remove from pkg from has_upvoted
        removeAtIndex(user.has_upvoted, user.has_upvoted.indexOf(pkg_id));
        user.markModified('has_upvoted');
      } else if (user.has_downvoted && user.has_downvoted.indexOf(pkg_id) !== -1) {
        // remove from pkg from has_downvoted
        removeAtIndex(user.has_downvoted, user.has_downvoted.indexOf(pkg_id));
        user.markModified('has_downvoted');
      } else if (change > 0) {
        // add user has upvoted
        user.has_upvoted = user.has_upvoted || [];
        user.has_upvoted.push(pkg._id);
        user.markModified('has_upvoted');
      } else {
        // add user has downvoted
        user.has_downvoted = user.has_downvoted || [];
        user.has_downvoted.push(pkg._id);
        user.markModified('has_downvoted');
      }

      pkg.markModified('votes');

      user.save((userSaveErr) => {
        if (userSaveErr) {
          try {
            return res.status(500).send(error.fail('Could not update the user profile.'));
          } catch (exception) {
            return console.log('Log error - could not update user');
          }
        }

        pkg.save((pkgSaveErr) => {
          if (pkgSaveErr) {
            try {
              return res.status(500)
                .send(error.fail('There was a problem updating the package.  The vote was not saved.'));
            } catch (exception) {
              return console.log('Log error - could not update package');
            }
          }

          try {
            return res.send(error.success('Vote registered', { pkg_id, votes: pkg.votes }));
          } catch (exception) {
            return console.log('Log error - vote not registered');
          }
        }); // save pkg
      }); // save user
    }); // lookup user
  }); // lookup pkg
};

/**
 * Finds all the dependencies of a package
 *
 * @param {string} The version string
 * @api public
 */

exports.find_all_deps = (pkg_id, version, callback, d) => {
  // initialize the dictionary at start
  if (d == null) {
    d = {};
  }

  // if we've already discovered this dependency, callback with no error
  if (d[pkg_id] && d[pkg_id][version] != null) {
    callback(null, d);
    return;
  }

  PackageModel.findById(pkg_id, (err, pkg) => {
    if (err) {
      return callback(error.fail('One of the dependencies did not exist'));
    }

    let index = -1;

    // look up the pkg version (TODO: this needs to be smarter to support >= and * notation)
    for (let i = 0; i < pkg.versions.length; i++) {
      if (pkg.versions[i].version === version) {
        index = i;
        break;
      }
    }

    // if the version does not exist, tell about the error
    if (index === -1) {
      callback(error.fail('The package version does not exist.'));
      return;
    }

    // copy the pkg_version
    const pkg_version = JSON.parse(JSON.stringify(pkg.versions[index]));

    // save this package and version to the dictionary
    if (d[pkg_id] == null) d[pkg_id] = {};

    d[pkg_id][version] = pkg_version;
    d[pkg_id][version].name = pkg.name;

    // if this pkg has no direct dependencies, skip town
    if (pkg_version.direct_dependency_ids == null
      || pkg_version.direct_dependency_ids.length === 0) {
      callback(null, d);
      return;
    }

    // otherwise, lets lookup all of the deps recursively
    const pkg_lookups = [];

    for (let i = 0; i < pkg_version.direct_dependency_ids.length; i++) {
      ((id, vers, lookups) => {
        pkg_lookups.push((inner_callback) => {
          exports.find_all_deps(id, vers, inner_callback, d);
        });
      })(pkg_version.direct_dependency_ids[i], pkg_version.direct_dependency_versions[i]);
    }

    // run this function
    async.parallel(pkg_lookups, (lookupErr) => {
      if (lookupErr) {
        callback(lookupErr);
        return;
      }
      callback(null, d);
    });
  });
};


/**
 * Validate a package version such that it is in major.minor.build format with no leading or
 * trailing white space - also allows
 *
 * @param {string} The version string
 * @api public
 */

const validate_version_string = (vers_str) => {
  const re = /^(>=|>|~)?\d+\.\d+\.[\d*]+$/;
  const result = vers_str.search(re);

  return result !== -1;
};
exports.validate_version_string = validate_version_string;

/**
 * Validate an engine given as a dependency.
 *
 * @param {String} The version string
 * @api public
 */

exports.validate_engine = (engine_name_str, vers_str) => {
  return (
    (engine_name_str.toLowerCase() === 'dynamo'
      || engine_name_str.toLowerCase() === 'designscript')
    && validate_version_string(vers_str));
};

/*
 *Validate a url
 *
 *
 * @param {String} A url string
 * @api public
 *
 */
exports.validate_url = (url) => {
  // eslint-disable-next-line max-len
  const regex = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,})))(?::\d{2,5})?(?:\/\S*)?$/i;

  return regex.test(url);
};

/**
 * Validate a list of dependencies to be in the right form
 *
 * @param {Array} The list of dependencies
 * @api public
 */

exports.validate_dependencies = (dep_list) => {
  for (let i = dep_list.length - 1; i >= 0; i--) {
    if (!dep_list[i].name || typeof (dep_list[i].name) !== 'string') {
      return false;
    }

    if (!dep_list[i].version || typeof (dep_list[i].version) !== 'string'
      || !exports.validate_version_string(dep_list[i].name)) {
      return false;
    }
  }

  return true;
};

/**
 * Validate a list of keywords
 *
 * @param {Array} The list of keywords
 * @returns {Object} An error object or null if it succeeds
 * @api public
 */

exports.validate_keywords = (keyword_list) => {
  if (keyword_list.length === 0) return null;

  const len = keyword_list.length;
  const obj = {};

  if (len > 10) return error.fail('There are too many keywords.  There must be 10 or less.');

  for (let i = 0; i < len; i++) {
    if (keyword_list[i].length < 1) {
      return error.fail('One of the keywords is too short.  Each keyword must be at least one character.');
    }

    if (obj[keyword_list[i]] != null) return error.fail('There are duplicate keywords');
    obj[keyword_list[i]] = 0;
  }

  return null;
};

/**
 * Validate the basic core functionality of a package, only if they exist.  The caller is
 * responsible for making sure the needed fields are present.
 *
 * @param {Object} The parsed json object sent from the client
 * @param {Function} Callback to execute after look up. The argument is an error object if undefined
 * @api private
 */

exports.validate_base_pkg_data = (pkg_data) => {
  if (pkg_data.name != null && pkg_data.name.length < 3) {
    return error.fail('The package name must be more than 3 characters.');
  }

  if (pkg_data.description != null && pkg_data.description.length < 3) {
    return error.fail('The package description given is either too short or undefined.');
  }

  if (pkg_data.keywords != null) {
    const key_val = exports.validate_keywords(pkg_data.keywords);
    if (key_val != null) return key_val;
  }

  if (pkg_data.repository_url != null && pkg_data.repository_url !== ''
    && !exports.validate_url(pkg_data.repository_url)) {
    return error.fail('The repository url you supplied is not a valid url');
  }

  if (pkg_data.site_url != null && pkg_data.site_url !== '' && !exports.validate_url(pkg_data.site_url)) {
    return error.fail('The site url you supplied is not a valid url');
  }

  if (pkg_data.version != null && !exports.validate_version_string(pkg_data.version)) {
    return error.fail('Your version must be of the correct form.');
  }

  if (pkg_data.dependencies != null && !exports.validate_dependencies(pkg_data.dependencies)) {
    return error.fail('Your dependencies are not in the correct form.');
  }

  return null;
};

/**
 * Looks up a list of dependencies in the database in parallel.  Assumes the list is validated.
 *
 * @param {Array} Array of name, verion pairs [name: "peter", version: "0.1.0"]
 * @param {Function} Callback to execute after look up. The argument is an error object and the list of packages.
 * @api public
 */

exports.find_dependencies_by_name_version_engine = (dep_arr, engine, callback) => {
  const pkg_lookups = [];

  // all of the dependencies of the new package must exist in the db
  _.each(dep_arr, (dep) => {
    pkg_lookups.push((inner_callback) => {
      PackageModel.findOne({ name: dep.name, engine }, (err, dep_pkg) => {
        if (err || !dep_pkg) {
          inner_callback(error.fail(`The package called '${dep.name}' with engine ${engine} does not exist`));
          return;
        }

        if (dep_pkg.versions == null) {
          inner_callback(error.fail('The package has no valid versions'));
          return;
        }

        // check the version exists
        for (let i = 0; i < dep_pkg.versions.length; i++) {
          if (dep.version === dep_pkg.versions[i].version) {
            inner_callback(null, { version: dep.version, id: dep_pkg._id });
            return;
          }
        }

        inner_callback(error.fail(`The package version '${dep.version}' of package '${dep.name}' does not exist`));
      }); // find one
    }); // push func
  }); // each

  // run all of these lookups in parallel, callback is executed if any of them fails
  async.parallel(pkg_lookups, callback);
};

/**
 * Validate new package version data from a user.  This validation is required to insert into db.
 * This is async as it may require a database lookup.  If successful, this function has the side effect
 * of attaching pkg_data.user_id and pkg_data.pkg_id for later use.
 *
 * @param {Object} The parsed json object sent from the client (typically via a REST call)
 * @param {Function} Callback to execute after look up. The argument is an error object.  If undefined
 * @api private
 */

function _validate_new_pkg_version(req, pkg_data, callback) {
  if (!req || !req.user) {
    callback(error.fail('There must be a name associated with a package update.'));
    return;
  }

  const valid_fields_err = exports.validate_fields_are_present('name version contents engine', pkg_data);
  if (valid_fields_err) {
    callback(valid_fields_err);
    return;
  }

  const valid_pkg_data = exports.validate_base_pkg_data(req, pkg_data);
  if (valid_pkg_data) {
    callback(valid_pkg_data);
    return;
  }

  // waterfall runs functions in series, passing results to the next function
  // if any function returns error object, the whole thing terminates
  async.waterfall([

    // assert: the user making the change exists in db
    (outer_callback) => {
      users.get_user_by_name(req.user.username, (err, user) => {
        if (err || !user) {
          outer_callback(error.fail('Failed to look up the username'));
          return;
        }

        if (!pkg_data.maintainers || pkg_data.maintainers.length === 0) pkg_data.maintainers = [];
        if (pkg_data.maintainers.indexOf(req.user.username) === -1) pkg_data.maintainers.push(req.user.username);

        pkg_data.user_id = user._id;
        outer_callback(null, user); // user var is passed to the next func
      });
    },
    // assert: the package receiving the new version is in db
    (user, outer_callback) => {
      PackageModel.findOne({ name: pkg_data.name, engine: pkg_data.engine }, (err, pkg) => {
        if (err || !pkg) {
          outer_callback(error.fail('The package does not exist in the database.'));
          return;
        }
        pkg_data.pkg_id = pkg._id; // attach the pkg_id to pkg_data
        outer_callback(null, user, pkg);
      });
    },
    // assert: the user making the change is a current maintainer of this package
    (user, pkg, outer_callback) => {
      let user_is_maintainer = false;
      for (let i = 0; i < pkg.maintainers.length; i++) {
        if (pkg.maintainers[i].equals(user._id)) {
          user_is_maintainer = true;
          break;
        }
      }
      if (!user_is_maintainer) {
        outer_callback(error.fail('The user sending the new package version, '
          + `${user.username}, is not a maintainer of the package ${pkg.name}`));
        return;
      }
      outer_callback(null, user, pkg);
    },
    // assert: all of the maintainers of the software must exist in the db
    (user, pkg, outer_callback) => {
      if (pkg_data.maintainers != null && pkg_data.maintainers.length !== 0) {
        users.find_users_by_name(pkg_data.maintainers, outer_callback); // outer_callback is called with (error, users)
        return;
      }
      outer_callback(null, null);
    },
    // attach all of the maintainer ids to pkg_data
    (maintainers, outer_callback) => {
      if (typeof variable_here === 'undefined' || maintainers.length === 0) {
        outer_callback(null, null);
        return;
      }

      pkg_data.maintainer_ids = [];
      _.each(maintainers, (user) => {
        pkg_data.maintainer_ids.push(user._id);
      });

      outer_callback(null, maintainers);
    },
    // assert: all of the dependencies of the new package must exist in the db
    (maintainers, outer_callback) => {
      exports.find_dependencies_by_name_version_engine(pkg_data.dependencies, pkg_data.engine, (err, deps) => {
        if (err) { // one of the dependencies isn't present
          outer_callback(err);
          return;
        }

        const ids = [];
        const versions = [];

        _.each(deps, (dep) => {
          ids.push(dep.id);
          versions.push(dep.version);
        });

        pkg_data.direct_dependency_versions = versions;
        pkg_data.direct_dependency_ids = ids;

        outer_callback(null, deps);
      });
    },
    // if valid, upload the pkg contents
    (deps, outer_callback) => {
      if (!req.file) {
        outer_callback(error.fail('You need to supply package contents to upload.'));
        return;
      }

      if (!pkg_data.file_hash) {
        outer_callback(error.fail('You must supply a file_hash property to upload.'));
        return;
      }

      const shasum = crypto.createHash('sha256');
      const s = new stream.PassThrough();

      s.on('data', (d) => {
        shasum.update(d);
      });

      s.on('end', () => {
        const d = shasum.digest('base64');

        if (d !== pkg_data.file_hash) {
          outer_callback(error.fail('The package contents do not match the file_hash.'));
          return;
        }

        try {
          storage.upload(req, pkg_data, exports.guid(), () => {
            outer_callback(null, deps);
          });
        } catch (err) {
          outer_callback(err);
        }
      });

      s.end(req.file.buffer);
    },
  ],
  (err) => { // closing waterfall
    if (err) {
      if (callback) callback(err);
      return;
    }

    // DB: everything is good, pipe data to amazon
    callback();
  });
}

exports.guid = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0; const // eslint-disable-line no-bitwise
      v = c === 'x' ? r : (r & 0x3 | 0x8); // eslint-disable-line no-bitwise, no-mixed-operators
    return v.toString(16);
  });
};

/**
 * Validate new package data from a user.  This validation is required to insert into db.
 * This is async as it may require a database lookup.  The function must determine if the user
 * is validated to insert into the db and that all of the data looks fine.
 *
 * @param {Object} The request object
 * @param {Object} The parsed json object sent from the client (typically via a REST call)
 * @param {Function} Callback to execute after look up. Argument is an error object.
 * @api public
 */

exports.validate_fields_are_present = (fields, pkg_data, callback) => {
  const fields_split = fields.split(' ');

  let field_name = '';

  for (let i = 0; i < fields_split.length; i++) {
    field_name = fields_split[i];
    if (pkg_data[field_name] == null) {
      return error.fail(`Field ${field_name} must be defined.`);
    }
  }

  return null;
};

/**
 * Validate new package data from a user.  This validation is required to insert into db.
 * This is async as it may require a database lookup.  The function must determine if the user
 * is validated to insert into the db and that all of the data looks fine.
 *
 * @param {Object} The request object
 * @param {Object} The parsed json object sent from the client (typically via a REST call)
 * @param {Function} Callback to execute after look up. Argument is an error object.
 * @api private
 */

function _validate_new_pkg(req, pkg_data, callback) {
  if (!req || !req.user) {
    callback(error.fail('There must be a name associated with a package update.'));
    return;
  }

  const valid_fields_err = exports.validate_fields_are_present(
    'name contents version description license engine engine_version',
    pkg_data,
  );

  if (valid_fields_err) {
    callback(valid_fields_err);
    return;
  }

  const valid_pkg_data = exports.validate_base_pkg_data(req, pkg_data);
  if (valid_pkg_data) {
    callback(valid_pkg_data);
    return;
  }

  // waterfall runs functions in series, passing results to the next function
  // if any function returns error object, the whole thing terminates
  async.waterfall([
    // assert: the user making the change exists in db
    (outer_callback) => {
      users.get_user_by_name(req.user.username, (err, user) => {
        if (err) {
          outer_callback(error.fail('Failed to look up the username'));
          return;
        }
        pkg_data.user_id = user._id;
        outer_callback(null, user); // user var is passed to the next func
      });
    },
    // assert: the package with the given name and engine must not already exist in the db
    (user, outer_callback) => {
      PackageModel.findOne({ name: pkg_data.name, engine: pkg_data.engine }, (err, pkg) => {
        if (pkg != null) {
          outer_callback(error.fail('A package with the given name and engine already exists.'));
          return;
        }
        outer_callback(null, user, pkg);
      });
    },
    // assert: all of the maintainers of the software must exist in the db
    (user, pkg, outer_callback) => {
      if (!pkg_data.maintainers || pkg_data.maintainers.length === 0) pkg_data.maintainers = [user.username];
      users.find_users_by_name(pkg_data.maintainers, outer_callback); // outer_callback is called with (error, users)
    },
    // attach all of the maintainer ids to pkg_data
    (maintainers, outer_callback) => {
      pkg_data.maintainer_ids = [];
      _.each(maintainers, (user) => {
        pkg_data.maintainer_ids.push(user._id);
      });
      outer_callback(null, maintainers);
    },
    // assert: all of the dependencies of the new package must exist in the db
    (maintainers, outer_callback) => {
      exports.find_dependencies_by_name_version_engine(pkg_data.dependencies, pkg_data.engine, (err, deps) => {
        if (err) { // some or one of the dependencies does not exist in the db
          outer_callback(err);
          return;
        }
        const ids = [];
        const versions = [];

        _.each(deps, (dep) => {
          ids.push(dep.id);
          versions.push(dep.version);
        });

        pkg_data.direct_dependency_versions = versions;
        pkg_data.direct_dependency_ids = ids;

        outer_callback(null, deps);
      });
    },
    // if valid, upload the pkg contents
    (deps, outer_callback) => {
      if (!req.file) {
        outer_callback(error.fail('You need to supply package contents to upload.'));
        return;
      }

      if (!pkg_data.file_hash) {
        outer_callback(error.fail('You must supply a file_hash property to upload.'));
        return;
      }

      const shasum = crypto.createHash('sha256');
      const s = new stream.PassThrough();

      s.on('data', (d) => {
        shasum.update(d);
      });

      s.on('end', () => {
        const d = shasum.digest('base64');

        if (d !== pkg_data.file_hash) {
          outer_callback(error.fail('The package contents do not match the file_hash.'));
          return;
        }

        try {
          storage.upload(req, pkg_data, exports.guid(), () => {
            outer_callback(null, deps);
          });
        } catch (err) {
          outer_callback(err);
        }
      });

      s.end(req.file.buffer);
    },
    // closing waterfall
  ],
  (err) => {
    if (err) {
      if (callback) callback(err);
      return;
    }
    // TODO: everything is good, pipe data to amazon
    callback();
  });
}

/**
 * Delete a package
 *
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after inserting. The arguments are
 * an error object (null if successful) and the deleted pkg.
 * @api private
 */

function _delete_pkg(pkg_id, callback) {
  PackageModel.findById(pkg_id, (err, pkg) => {
    if (err) {
      if (callback) callback(error.fail('Failed to find the package version to delete in the db'));
      return;
    }

    pkg.remove((removeErr, removePkg) => {
      if (removeErr) {
        if (callback) callback(error.fail('Failed to remove the pkg version from the database'));
        return;
      }

      if (callback) callback(null, removePkg);
    });
  });
}


/**
 * Save a new package, along with its first version, into the db, assuming pkg_data has
 * been validated and the user is authorized to insert into db.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api private
 */

function _save_new_pkg(pkg_data, req, callback) {
  const pkg = new PackageModel({

    name: pkg_data.name,
    description: pkg_data.description,
    keywords: pkg_data.keywords,
    maintainers: [pkg_data.user_id],
    site_url: pkg_data.site_url ? pkg_data.site_url : '',
    repository_url: pkg_data.repository_url ? pkg_data.repository_url : '',
    group: pkg_data.group,
    engine: pkg_data.engine,
    versions: [{
      version: pkg_data.version,
      engine_version: pkg_data.engine_version,
      engine_metadata: pkg_data.engine_metadata,
      direct_dependency_ids: pkg_data.direct_dependency_ids,
      direct_dependency_versions: pkg_data.direct_dependency_versions,
      license: pkg_data.license,
      contents: pkg_data.contents,
      url: pkg_data.url,
      contains_binaries: pkg_data.contains_binaries,
      node_libraries: pkg_data.node_libraries,
    }],

  });

  async.waterfall([

    // save the package
    (inner_callback) => {
      pkg.save((err) => {
        if (err) {
          _delete_pkg(pkg._id, () => {
            inner_callback(error.fail('DB error creating new package'));
          });
          return;
        }
        inner_callback(null);
      });
    },
    // recursively discover all dependencies
    (inner_callback) => {
      exports.find_all_deps(pkg._id, pkg_data.version, (err, d) => {
        if (err) {
          _delete_pkg(pkg._id, () => {
            inner_callback(err);
          });
          return;
        }

        const all_dep_ids = [];
        const all_dep_vers = [];

        // build arrays from dictionary of all dependencies
        Object.keys(d).forEach((dpkg) => {
          Object.keys(d[dpkg]).forEach((ver) => {
            all_dep_ids.push(dpkg);
            all_dep_vers.push(ver);
          });
        });

        inner_callback(null, all_dep_ids, all_dep_vers);
      });
    },
    // save all dependencies to the pkg
    (dep_ids, dep_versions, inner_callback) => {
      pkg.versions[0].full_dependency_ids = dep_ids;
      pkg.versions[0].full_dependency_versions = dep_versions;
      pkg.markModified('versions');
      pkg.save((err) => {
        if (err) {
          _delete_pkg(pkg._id, () => {
            inner_callback(error.fail('DB error updating full dependencies, removing package.'));
          });
          return;
        }
        inner_callback(null);
      });
    },
    // update the user's data
    (inner_callback) => {
      users.update_user_maintains(pkg._id, pkg_data.user_id, (err) => {
        if (err) {
          inner_callback(error.fail('Successfully inserted the package in the db, but failed to update user'));
        }
        inner_callback(null);
      });
    },
    // tell all of the dependencies the package that depends on them in pkg_data.dependency_ids
    (inner_callback) => {
      if (pkg_data.direct_dependency_ids != null && pkg_data.direct_dependency_ids.length > 0) {
        exports.update_pkg_list_used_by(pkg._id, pkg_data.direct_dependency_ids, inner_callback);
      } else {
        inner_callback(null, []); // no dependencies were updated
      }
    },
    // tell all the maintainers that the package they maintain in pkg_data.maintainer_ids
    (pkgs, inner_callback) => {
      if (pkg_data.maintainer_ids != null && pkg_data.maintainer_ids.length > 0) {
        users.update_user_list_maintains(pkg._id, pkg_data.maintainer_ids, inner_callback);
      } else {
        inner_callback(null, []); // no maintainers were update
      }
    },
  ], (err, data) => { // final callback for series
    if (err) {
      if (callback) callback(err);
      return;
    }

    if (callback) callback(error.success_with_content('Successfully inserted the package in the db', pkg));
  });

  // TODO: need to roll back all of the changes when you fail to save data
}

/**
 * Validate and, if successful, save newly created package into the db
 *
 * @param {Object} The request object (which holds the user data)
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is always an error object
 * indicating success or failure
 * @api public
 */

exports.save_new_pkg = (req, pkg_data, callback) => {
  _validate_new_pkg(req, pkg_data, (err) => {
    if (err) {
      if (callback) callback(err);
      return;
    }

    _save_new_pkg(pkg_data, req, callback);
  });
};


/**
 * Updates a packages used_by field with a package. Doesn't create duplicates.
 *
 * @param {Object} The dependent pkg
 * @param {Object} The depended on pkg
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api private
 */

exports.update_pkg_used_by = (dependent_pkg_id, pkg_id, callback) => {
  PackageModel.findById(pkg_id, (err, pkg) => {
    if (err) {
      callback(error.fail('The dependency does not exist'));
      return;
    }

    let dup = false;
    for (let i = 0; i < pkg.used_by.length; i++) {
      if (pkg.used_by[i].equals(dependent_pkg_id)) {
        dup = true;
        break;
      }
    }

    if (!dup) {
      pkg.used_by.push(dependent_pkg_id);
      pkg.markModified('used_by');

      pkg.num_dependents += 1;
      pkg.markModified('num_dependents');
      pkg.save();
    }

    callback(null, pkg);
  });
};

/**
 * Updates the used_by field of a list of packages with a dependent package id in parallel. Doesn't create duplicates.
 *
 * @param {Object} The dependent pkg
 * @param {Array} The list of depended on pkgs
 * @param {Function} Callback to execute after inserting. The argument is an error object if any of the package updates
 * failed.
 * @api public
 */

exports.update_pkg_list_used_by = (dependent_pkg_id, pkg_id_list, callback) => {
  const funcs = [];

  // build up list of work to do
  _.each(pkg_id_list, (pkg_id) => {
    funcs.push((inner_callback) => {
      exports.update_pkg_used_by(dependent_pkg_id, pkg_id, inner_callback);
    });
  });

  async.parallel(funcs, (err, pkgs) => {
    if (err) {
      callback(error.fail('Failed to update the used_by fields of a package. '));
    }
    callback(null, pkgs);
  });
};

/**
 * Compare two package versions
 *
 * @param {String} A valid package version
 * @param {String} A valid package version, which ought to be greater then version 1
 * @api public
 */

exports.increasing_pkg_version = (v1, v2) => {
  // split into three fields
  const v1_fields = []; const
    v2_fields = [];
  v1.split('.').forEach((field) => {
    v1_fields.push(parseInt(field, 10));
  });

  v2.split('.').forEach((field) => {
    v2_fields.push(parseInt(field, 10));
  });

  if (v1_fields.length !== 3 || v2_fields.length !== 3) {
    return false; // malformed fields
  }

  let incr = false;

  for (let ind = 0; ind < v1_fields.length; ind++) {
    if (v1_fields[ind] < v2_fields[ind]) {
      incr = true;
      break;
    }

    if (v1_fields[ind] > v2_fields[ind]) {
      incr = false;
      break;
    }
  }

  // this is the case where all fields were the same
  return incr;
};

function _delete_pkg_version(id, version, callback) {
  console.error('_delete_pkg_version not implemented');
  callback();
}

/**
 * Save a new package version into the db and updates package.  It is assumed that the pkg_vers_data is
 * already validated and the user is authenticated and a maintainer of the package.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api private
 */

function _save_new_pkg_version(pkg_data, req, callback) {
  const pkg_v = {
    version: pkg_data.version,
    engine_version: pkg_data.engine_version,
    engine_metadata: pkg_data.engine_metadata,
    direct_dependency_ids: pkg_data.direct_dependency_ids,
    direct_dependency_versions: pkg_data.direct_dependency_versions,
    license: pkg_data.license,
    contents: pkg_data.contents,
    url: pkg_data.url,
    contains_binaries: pkg_data.contains_binaries,
    node_libraries: pkg_data.node_libraries,
  };

  async.waterfall([

    // update the package
    (inner_callback) => {
      PackageModel.findById(pkg_data.pkg_id, (err, pkg) => {
        if (err || !pkg) {
          inner_callback(error.fail('Could not find package'
            + `when updating it with new version given id ${pkg_data.pkg_id}`));
          return;
        }

        if (!exports.increasing_pkg_version(pkg.versions[pkg.versions.length - 1].version, pkg_data.version)) {
          inner_callback(error.fail('The package version must be higher than the current highest version.'));
          return;
        }

        pkg.versions.push(pkg_v);
        pkg.markModified('versions');

        if (pkg_data.description != null) {
          pkg.description = pkg_data.description;
          pkg.markModified('description');
        }

        if (pkg_data.maintainer_ids != null) {
          pkg.maintainers = pkg_data.maintainer_ids;
          pkg.markModified('maintainers');
        }

        if (pkg_data.site_url != null) {
          pkg.site_url = pkg_data.site_url;
          pkg.markModified('site_url');
        }

        if (pkg_data.repository_url != null) {
          pkg.repository_url = pkg_data.repository_url;
          pkg.markModified('repository_url');
        }

        if (pkg_data.license != null) {
          pkg.license = pkg_data.license;
          pkg.markModified('license');
        }

        if (pkg_data.group != null) {
          pkg.group = pkg_data.group;
          pkg.markModified('group');
        }

        if (pkg_data.keywords != null) {
          pkg.keywords = pkg_data.keywords;
          pkg.markModified('keywords');
        }

        pkg.last_version_update = Date.now();
        pkg.markModified('last_version_update');

        pkg.num_versions += 1;
        pkg.markModified('num_versions');

        pkg.save((saveErr) => {
          if (saveErr) {
            inner_callback(error.fail('Failed to update save the changes to the package when creating new version.'));
          }
          inner_callback(null, pkg);
        });
      });
    },
    // recursively discover all dependencies
    (pkg, inner_callback) => {
      exports.find_all_deps(pkg._id, pkg_data.version, (err, d) => {
        if (err) {
          _delete_pkg_version(pkg._id, pkg_data.version, () => {
            inner_callback(err);
          });
          return;
        }

        const all_dep_ids = [];
        const all_dep_vers = [];

        // build arrays from dictionary of all dependencies
        Object.keys(d).forEach((dpkg) => {
          Object.keys(d[dpkg]).forEach((ver) => {
            all_dep_ids.push(dpkg);
            all_dep_vers.push(ver);
          });
        });

        inner_callback(null, pkg, all_dep_ids, all_dep_vers);
      });
    },
    // save all dependencies to the pkg
    (pkg, dep_ids, dep_versions, inner_callback) => {
      pkg.versions[pkg.versions.length - 1].full_dependency_ids = dep_ids;
      pkg.versions[pkg.versions.length - 1].full_dependency_versions = dep_versions;
      pkg.markModified('versions');

      pkg.save((err) => {
        if (err) {
          _delete_pkg_version(pkg._id, pkg_data.version, () => {
            inner_callback(error.fail('DB error updating full dependencies, removing package version.'));
          });
          return;
        }
        inner_callback(null, pkg);
      });
    },
    // tell all of the dependencies about the package that depends on them in pkg_data.dependency_ids
    (pkg, inner_callback) => {
      if (pkg_data.direct_dependency_ids != null && pkg_data.direct_dependency_ids.length > 0) {
        exports.update_pkg_list_used_by(pkg._id, pkg_data.direct_dependency_ids, (err) => {
          inner_callback(err, pkg);
        });
      } else inner_callback(null, pkg);
    },
    // tell all the maintainers that about the package they maintain in pkg_data.maintainer_ids,
    // remove the maintainers that no longer do
    (pkg, inner_callback) => {
      if (pkg_data.maintainer_ids != null && pkg_data.maintainer_ids.length > 0) {
        users.update_user_list_maintains(pkg, pkg_data.maintainer_ids, (err) => {
          inner_callback(err, pkg);
        });
      } else inner_callback(null, pkg);
    },
  ],
  (err, pkg) => { // final callback for series
    if (err) {
      callback(err);
      return;
    }
    callback(error.success_with_content('Successfully inserted the package version in the db', pkg));
  });

  // TODO: need to roll back all of the changes when you fail to save data
}

/**
 * Validate and, if successful, save new package version into the db.
 *
 * @param {Object} The parsed and validated json from the client.
 * @param {Function} Callback to execute after inserting. The argument is always an error object
 * indicating success or failure
 * @api public
 */

exports.save_new_pkg_version = (req, pkg_vers_data, callback) => {
  _validate_new_pkg_version(req, pkg_vers_data, (err) => {
    if (err) {
      if (callback) callback(err);
      return;
    }

    _save_new_pkg_version(pkg_vers_data, req, callback);
  });
};

/**
 * Validate whether the user can set the deprecation of this pkg
 *
 * @param {Object} The request object
 * @param {bool} The new deprecation state
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after inserting. Callback is an error object
 * @api private
 */

function _validate_pkg_deprecation_request(req, pkg_id, callback) {
  if (!req || !req.user) {
    callback(error.fail('There must be a user associated with a package update.'));
    return;
  }

  // waterfall runs functions in series, passing results to the next function
  // if any function returns error object, the whole thing terminates
  async.waterfall([

    // assert: the user making the change exists in db
    (outer_callback) => {
      users.get_user_by_name(req.user.username, (err, user) => {
        if (err || !user) {
          outer_callback(error.fail('Failed to look up the username'));
          return;
        }

        outer_callback(null, user); // user var is passed to the next func
      });
    },
    // assert: the package receiving the new version is in db
    (user, outer_callback) => {
      PackageModel.findById(pkg_id, (err, pkg) => {
        if (err || !pkg) {
          outer_callback(error.fail('The package does not exist in the database.'));
          return;
        }
        outer_callback(null, user, pkg);
      });
    },
    // assert: the user making the change is a current maintainer of this package
    (user, pkg, outer_callback) => {
      let user_is_maintainer = false;
      for (let i = 0; i < pkg.maintainers.length; i++) {
        if (pkg.maintainers[i].equals(user._id)) {
          user_is_maintainer = true;
          break;
        }
      }
      if (!user_is_maintainer) {
        outer_callback(error.fail('The user sending the new package version, '
          + `${user.username}, is not a maintainer of the package ${pkg.name}`));
        return;
      }
      outer_callback(null, user, pkg);
    },

  ], callback);
}


/**
 * Validate whether the user can ban this pkg
 *
 * @param {Object} The request object
 * @param {bool} The new banned state
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after inserting. Callback is an error object
 * @api private
 */

function _validate_pkg_ban_request(req, pkg_id, callback) {
  if (!req || !req.user) {
    callback(error.fail('There must be a user associated with a package update.'));
    return;
  }

  // waterfall runs functions in series, passing results to the next function
  // if any function returns error object, the whole thing terminates
  async.waterfall([

    // assert: the user making the change exists in db
    (outer_callback) => {
      users.get_user_by_name(req.user.username, (err, user) => {
        if (err || !user) {
          outer_callback(error.fail('Failed to look up the username'));
          return;
        }

        outer_callback(null, user); // user var is passed to the next func
      });
    },
    // assert: the package does exist in db
    (user, outer_callback) => {
      PackageModel.findById(pkg_id, (err, pkg) => {
        if (err || !pkg) {
          outer_callback(error.fail('The package does not exist in the database.'));
          return;
        }
        outer_callback(null, user, pkg);
      });
    },
    // assert: the user banning/unbanning the package must be a super user
    (user, pkg, outer_callback) => {
      if (!user.super_user) {
        outer_callback(error.fail(`In order to ban the package ${pkg.name},`
          + `user ${user.username} must be a super user.`));
        return;
      }
      outer_callback(null, user, pkg);
    },

  ], callback);
}


/**
 * Set whether a package is deprecated or not
 *
 * @param {Object} The request object
 * @param {bool} The new deprecation state
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after inserting. The arguments are an error object (null if
 * successful) and the deprecated pkg.
 * @api private
 */

exports.set_pkg_deprecation = (req, deprecate_bool, pkg_id, res) => {
  _validate_pkg_deprecation_request(req, pkg_id, (err, user, pkg) => {
    if (err) {
      return res.status(403).send(err);
    }

    pkg.deprecated = deprecate_bool;
    pkg.markModified('deprecated');
    pkg.save((saveErr) => {
      if (saveErr) {
        try {
          return res.status(500).send(error.fail('There was a problem updating the package.'));
        } catch (exception) {
          return console.error('Failed to set package deprecation');
        }
      }

      try {
        return res.send(error.success('Set package deprecation'));
      } catch (exception) {
        return console.error('Failed to respond to request for package deprecation');
      }
    });
  });
};

/**
 * Set whether a package is banned or not
 *
 * @param {Object} The request object
 * @param {bool} The new banned state
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after inserting. The arguments are an error object
 * (null if successful) and the banned pkg.
 * @api private
 */

exports.set_pkg_banned = (req, banned_bool, pkg_id, res) => {
  _validate_pkg_ban_request(req, pkg_id, (err, user, pkg) => {
    if (err) {
      return res.status(403).send(err);
    }

    pkg.banned = banned_bool;
    pkg.markModified('banned');
    pkg.save((saveErr) => {
      if (saveErr) {
        try {
          return res.status(500).send(error.fail('There was a problem updating the package.'));
        } catch (exception) {
          return console.error('Failed to set package banned state');
        }
      }

      try {
        if (banned_bool) {
          return res.send(error.success('Package successfully banned.'));
        }
        return res.send(error.success('Package successfully unbanned.'));
      } catch (exception) {
        return console.error('Failed to respond to request for package deprecation');
      }
    });
  });
};

/**
 * Obtain a package by engine and name
 *
 * @param {string} The name of the package
 * @param {string} The name of the engine
 * @param {Function} Callback to execute after inserting. The arguments are an error object (null if
 * successful) and the pkg.
 * @api public
 */

exports.by_engine_and_name = (engine, name, callback) => {
  PackageModel
    .findOne({ engine, name })
    .populate('maintainers', 'username')
    .populate('versions.direct_dependency_ids', 'name')
    .populate('versions.full_dependency_ids', 'name')
    .populate('used_by', 'name')
    .exec(callback);
};

/**
 * Obtain a package by id
 *
 * @param {string} The id of the package
 * @param {Function} Callback to execute after inserting. The arguments are an error object (null if
 * successful) and the pkg.
 * @api public
 */

exports.by_id = (id, callback) => {
  PackageModel
    .findById(id)
    .populate('maintainers', 'username')
    .populate('versions.direct_dependency_ids', 'name')
    .populate('versions.full_dependency_ids', 'name')
    .populate('used_by', 'name')
    .exec(callback);
};

/**
 * Obtain a list of packages given a list of ids
 *
 * @param {Array} A list of ids
 * @api public
 */

exports.by_ids = (pkg_ids, callback) => {
  const pkg_lookups = [];

  // Set up all of the pkg lookups
  _.each(pkg_ids, (pkg_id) => {
    pkg_lookups.push((inner_callback) => {
      PackageModel.findById(pkg_id)
        .populate('maintainers', 'username')
        .exec((err, pkg) => {
          if (err) {
            inner_callback(error.fail('Couldnt find one of the packages.'));
            return;
          }
          inner_callback(null, pkg);
        });
    });
  });

  // Execute all lookups in parallel and then return them
  async.series(pkg_lookups, (err, data) => {
    if (err) {
      callback(err);
      return;
    }
    callback(null, data);
  });
};


/**
 * Obtain a list of packages by engine
 *
 * @param {string} The engine
 * @param {Function} Callback to execute after inserting. The arguments are an error object (null if
 * successful) and the pkg.
 * @api public
 */

exports.by_engine = (engine, callback) => {
  PackageModel
    .find({ engine })
    .populate('maintainers', 'username')
    .populate('versions.direct_dependency_ids', 'name')
    .populate('versions.full_dependency_ids', 'name')
    .populate('used_by', 'name')
    .exec(callback);
};

/**
 * Obtain a list of packages
 *
 * @param {Function} Callback to execute after inserting. The arguments are
 * an error object (null if successful) and the pkg.
 * @api public
 */

exports.all = (callback) => {
  PackageModel
    .find({})
    .populate('maintainers', 'username')
    .populate('versions.direct_dependency_ids', 'name')
    .populate('versions.full_dependency_ids', 'name')
    .populate('used_by', 'name')
    .exec(callback);
};

/**
 * Delete a specific package version from the database.  Assumes the client has the right to do this.
 *
 * @param {ObjectId} The id of the pkg version
 * @param {Function} Callback to execute after inserting. The argument is an error object.
 * @api public
 */

exports.delete_pkg_version = (pkg_version_id, callback) => {
  callback(error.fail('Not implemented'));
};


/**
 * White list a package
 *
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after white listing. The arguments are
 * an error object (null if successful) and the number of packages updated during the call.
 * @api private
 */
exports.whitelist_by_id = (pkg_id, callback) => {
  PackageModel.update({ _id: pkg_id }, { white_list: true }, (err, res) => {
    if (err) {
      return callback(error.fail('Failed to update the package in the db.'));
    }
    callback(null, res.nModified);
  });
};

/**
 * Unwhitelist a package
 *
 * @param {ObjectId} The id of the pkg
 * @param {Function} Callback to execute after removing from the white list. The arguments are
 * an error object (null if successful) and the number of packages updated during the call.
 * @api private
 */
exports.unwhitelist_by_id = (pkg_id, callback) => {
  PackageModel.update({ _id: pkg_id }, { white_list: false }, (err, res) => {
    if (err) {
      return callback(error.fail('Failed to update the package in the db.'));
    }

    callback(null, res.nModified);
  });
};

/**
 * Get all white listed packages
 *
 * @param {Function} Callback to execute after getting all white listed packages. The arguments are
 * an error object (null if successful) and the white listed pkgs.
 * @api private
 */
exports.all_whitelist = (callback) => {
  PackageModel
    .find({ white_list: true })
    .populate('maintainers', 'username')
    .populate('versions.direct_dependency_ids', 'name')
    .populate('versions.full_dependency_ids', 'name')
    .populate('used_by', 'name')
    .exec((err, pkgs) => {
      if (err) {
        callback(err.fail('There was an error getting whitelisted packages.'));
        return;
      }

      if (callback) {
        callback(null, pkgs);
      }
    });
};

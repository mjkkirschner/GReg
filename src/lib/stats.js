const _ = require('underscore');
const async = require('async');

const PackageModel = require('../models/package').PackageModel;
const UserModel = require('../models/user').UserModel;
const error = require('./error');


// combined stats

exports.all_stats = (limit, callback) => {
  const all_stats = [];

  // get all pkg stats
  async.parallel([

    (inner_callback) => {
      exports.all_user_stats(limit, (err, user_stats) => {
        if (err) {
          return inner_callback(err);
        }
        Object.keys(user_stats).forEach((attrname) => {
          const stat = {};
          stat.data = user_stats[attrname];
          stat.variety = 'author';
          stat.type = attrname;
          all_stats.push(stat);
        });
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.all_engine_stats(null, limit, (err, pkg_stats) => {
        if (err) return inner_callback(err);
        Object.keys(pkg_stats).forEach((attrname) => {
          const stat = {};
          stat.data = pkg_stats[attrname];
          stat.variety = 'package';
          stat.type = attrname;
          all_stats.push(stat);
        });
        inner_callback(null);
      });
    },
  ], (err) => {
    if (err) return callback(err);
    callback(null, all_stats);
  });
};

exports.all_engine_stats = (engine, limit, callback) => {
  const all_stats = {}; // we will collect stats in parallel on this object

  // get all pkg stats
  async.parallel([

    (inner_callback) => {
      exports.most_installed_packages(engine, limit, (err, pkgs) => {
        if (err) return inner_callback(error);
        all_stats.most_installed_packages = pkgs;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.num_downloads(engine, (err, data) => {
        if (err) return inner_callback(error);
        all_stats.num_downloads = data;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.num_packages(engine, (err, data) => {
        if (err) return inner_callback(error);
        all_stats.num_packages = data;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.newest_packages(engine, limit, (err, pkgs) => {
        if (err) return inner_callback(error);
        all_stats.newest_packages = pkgs;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.most_recently_updated_packages(engine, limit, (err, pkgs) => {
        if (err) return inner_callback(error);
        all_stats.most_recently_updated_packages = pkgs;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.most_depended_upon_packages(engine, limit, (err, pkgs) => {
        if (err) return inner_callback(error);
        all_stats.most_depended_upon_packages = pkgs;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.most_commented_upon_packages(engine, limit, (err, pkgs) => {
        if (err) return inner_callback(error);
        all_stats.most_commented_upon_packages = pkgs;
        inner_callback(null);
      });
    },
  ],
  (err) => {
    if (err) return callback(err);
    callback(null, all_stats);
  });
};

exports.all_user_stats = (limit, callback) => {
  const all_stats = {}; // we will collect stats in parallel on this object

  // get all pkg stats
  async.parallel([

    (inner_callback) => {
      exports.most_recently_active_authors(limit, (err, users) => {
        if (err) return inner_callback(error);
        all_stats.most_recently_active_authors = users;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.num_authors((err, data) => {
        if (err) return inner_callback(error);
        all_stats.num_authors = data;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.most_prolific_authors(limit, (err, users) => {
        if (err) return inner_callback(error);
        all_stats.most_prolific_authors = users;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.most_installed_authors(limit, (err, users) => {
        if (err) return inner_callback(error);
        all_stats.most_installed_authors = users;
        inner_callback(null);
      });
    },
    (inner_callback) => {
      exports.most_voted_for_authors(limit, (err, users) => {
        if (err) return inner_callback(error);
        all_stats.most_voted_for_authors = users;
        inner_callback(null);
      });
    },
  ],
  (err) => {
    if (err) return callback(err);
    callback(null, all_stats);
  });
};

// package statistics

exports.num_packages = (engine, callback) => {
  PackageModel
    .find(engine ? { engine } : {})
    .exec((err, pkgs) => {
      if (err || !pkgs) return callback(err);
      callback(null, pkgs.length);
    });
};

exports.num_downloads = (engine, callback) => {
  PackageModel
    .find(engine ? { engine } : {})
    .exec((err, pkgs) => {
      if (err || !pkgs) return callback(err);

      // there are certainly faster ways to do this
      const downloads = _.reduce(pkgs, (x, i) => x + i.downloads, 0);
      callback(null, downloads);
    });
};

function pkg_sort_by(field_to_sort_on, engine, limit, callback) {
  if (!callback) return;

  PackageModel
    .find(engine ? { engine } : {})
    .where('deprecated').equals(false)
    .sort(field_to_sort_on)
    .limit(limit)
    .select('downloads name maintainers num_dependents group created latest_version_update used_by')
    .populate('maintainers', 'username')
    .exec((err, pkgs) => {
      if (err || !pkgs) return callback(err);
      callback(null, pkgs);
    });
}

function user_sort_by(field_to_sort_on, limit, callback) {
  if (!callback) return;

  UserModel
    .find({})
    .where('num_maintained_packages').gt(0)
    .select('username last_updated_package'
      + 'num_maintained_packages num_votes_for_maintained_packages num_downloads_for_maintained_packages')
    .populate('last_updated_package', 'latest_version_update')
    .sort(field_to_sort_on)
    .limit(limit)
    .exec((err, users) => {
      if (err || !users) return callback(err);
      callback(null, users);
    });
}

exports.most_installed_packages = (engine, limit, callback) => {
  return pkg_sort_by('-downloads', engine, limit, callback);
};

exports.newest_packages = (engine, limit, callback) => {
  return pkg_sort_by('-created', engine, limit, callback);
};

exports.most_recently_updated_packages = (engine, limit, callback) => {
  return pkg_sort_by('-latest_version_update', engine, limit, callback);
};

exports.most_depended_upon_packages = (engine, limit, callback) => {
  return pkg_sort_by('-num_dependents', engine, limit, callback);
};

exports.most_commented_upon_packages = (engine, limit, callback) => {
  return pkg_sort_by('-num_comments', engine, limit, callback);
};


// author stats

exports.num_authors = (callback) => {
  UserModel
    .find({})
    .exec((err, users) => {
      if (err || !users) return callback(err);

      callback(null, users.filter(x => x.num_maintained_packages > 0).length);
    });
};

exports.most_voted_for_authors = (limit, callback) => {
  return user_sort_by('-num_votes_for_maintained_packages', limit, callback);
};

exports.most_installed_authors = (limit, callback) => {
  return user_sort_by('-num_downloads_for_maintained_packages', limit, callback);
};

exports.most_prolific_authors = (limit, callback) => {
  return user_sort_by('-num_maintained_packages', limit, callback);
};

exports.most_recently_active_authors = (limit, callback) => {
  // provisional fix as sort is not properly working on inner populate field
  return user_sort_by('username', 100, (err, users) => {
    if (err) return callback(err);

    users.sort((a_d, b_d) => {
      if (a_d.last_updated_package === null) {
        console.log(`Error getting package updates for user ${JSON.stringify(a_d)}`);
        return -1;
      }
      const a = new Date(a_d.last_updated_package.latest_version_update);

      if (b_d.last_updated_package === null) {
        console.log(`Error getting package updates for user ${JSON.stringify(b_d)}`);
        return 1;
      }
      const b = new Date(b_d.last_updated_package.latest_version_update);

      return b < a ? -1 : b > a ? 1 : 0; // eslint-disable-line no-nested-ternary
    });

    users = users.slice(0, limit);

    callback(null, users);
  });
};


// exports.most_common_keywords = function( limit, callback) {
// }

// exports.most_common_group = function( limit, callback) {
// }

// return StatsModel
//   .find({engine: engine})
//   .populate({
//      path: 'most_installed_packages',
//      options: { limit: limit }
//   })
//   .exec( function( err, stats ){
//     if (err && callback) return callback(err);
//     callback(null, stats.most_installed_packages);
//   }


// return exports.get_stats_by_engine(engine, function(err, stats) {
// if (err || !stats) {
//   return inner_callback(error.fail('Failed to get stats object'));
// }

// PackageModel
//   .find({engine: engine})
//   .sort('-downloads')
//   .select('_id')
//   .exec(function(err, pkgs) {
//      stats.most_installed_packages = pkgs;
//      stats.markModified('most_installed_packages');
//      stats.save(function(err) {
//        callback(null, stats, pkgs);
//      })
//   });
// });

const UserModel = require('../models/user').UserModel;
const error = require('../lib/error');

/**
 * Lookup a user by name
 *
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
 */

exports.by_name = (req, res) => {
  const name = req.params.name;

  UserModel
    .findOne({ username: name })
    .populate('maintains', 'name latest_version_update deprecated')
    .populate('last_updated_package', 'name latest_version_update deprecated')
    .exec((err, user) => {
      if (err || !user) {
        res.send(error.fail('There are no packages'));
        return;
      }

      const data = error.success_with_content('Found user', user);
      return res.send(data);
    });
};


/**
 * Lookup a user by id
 *
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
 */

exports.by_id = (req, res) => {
  const id = req.params.id;
  UserModel
    .findById(id)
    .populate('maintains', 'name latest_version_update deprecated')
    .populate('last_updated_package', 'name latest_version_update deprecated')
    .exec((err, user) => {
      if (err || !user) {
        res.send(error.fail('There are no packages'));
        return;
      }

      const data = error.success_with_content('Found user', user);
      return res.send(data);
    });
};


/**
 * Determine if the currently authenticated user has accepted the terms of use
 *
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
 */

exports.accepted_terms_of_use = (req, res) => {
  try {
    const user = req.user;
    const data = { user_id: user._id, accepted: user.accepted_terms_of_use };
    return res.send(error.success_with_content('Terms of use acceptance', data));
  } catch (exception) {
    return console.log('Log error - could not get terms of use acceptance');
  }
};


/**
 * Update acceptance of terms of use for the currently authenticated user
 *
 * @param {Object} HTTP request
 * @param {Object} HTTP response
 * @api public
 */

exports.accept_terms_of_use = (req, res) => {
  try {
    const user = req.user;
    user.accepted_terms_of_use = true;
    user.markModified('accepted_terms_of_use');
    user.save((err) => {
      if (err) {
        res.send(error.fail('Terms of use acceptance could not be updated'));
      } else {
        const data = { user_id: user._id, accepted: true };
        return res.send(error.success_with_content('Terms of use accepted', data));
      }
    });
  } catch (exception) {
    return console.log('Log error - could not alter acceptance');
  }
};

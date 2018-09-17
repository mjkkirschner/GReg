const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const User = new Schema({

  username: { type: String },
  email: { type: String, default: '' },
  oxygen_id: { type: String, default: '' },
  eidm_guid: { type: String, default: '' },
  first_name: { type: String, default: '' },
  last_name: { type: String, default: '' },
  country_code: { type: String, default: 'US' },
  language: { type: String, default: 'en' },

  // voting
  has_downvoted: [{ type: Schema.ObjectId, ref: 'Package' }],
  has_upvoted: [{ type: Schema.ObjectId, ref: 'Package' }],

  // for authors
  last_updated_package: { type: Schema.ObjectId, ref: 'Package' },
  num_maintained_packages: { type: Number, default: 0 },
  maintains: [{ type: Schema.ObjectId, ref: 'Package' }],
  num_votes_for_maintained_packages: { type: Number, default: 0 },
  num_downloads_for_maintained_packages: { type: Number, default: 0 },
  accepted_terms_of_use: { type: Boolean, default: false },
  super_user: { type: Boolean, default: false },
});

exports.UserModel = mongoose.model('User', User);

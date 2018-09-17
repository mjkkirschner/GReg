const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const Stats = new Schema({

  engine: { type: String, default: '' },
  num_packages: { type: Number, default: 0 },
  most_popular_keywords: [{
    keyword: { type: String, default: '' },
    uses: { type: Number, default: 0 },
  }],
  most_installed_packages: [{ type: Schema.ObjectId, ref: 'Package' }],
  newest_packages: [{ type: Schema.ObjectId, ref: 'Package' }],
  most_depended_upon_packages: [{ type: Schema.ObjectId, ref: 'Package' }],
  most_voted_for_authors: [{ type: Schema.ObjectId, ref: 'User' }],
  least_voted_for_authors: [{ type: Schema.ObjectId, ref: 'User' }],
  most_installed_authors: [{ type: Schema.ObjectId, ref: 'Package' }],
  most_prolific_authors: [{ type: Schema.ObjectId, ref: 'Package' }],
  most_recently_updated_packages: [{ type: Schema.ObjectId, ref: 'Package' }],
  most_commented_upon: [{ type: Schema.ObjectId, ref: 'Package' }],

});

exports.StatsModel = mongoose.model('Stats', Stats);

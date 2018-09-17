const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const Package = new Schema({

  name: { type: String },
  created: { type: Date, default: Date.now },

  keywords: [{ type: String }],
  maintainers: [{ type: Schema.ObjectId, ref: 'User' }],
  description: { type: String, default: 'No description provided!' },

  // dependent packages
  num_dependents: { type: Number, default: 0 },
  used_by: [{ type: Schema.ObjectId, ref: 'Package' }],

  license: { type: String, default: 'MIT' },
  engine: { type: String, default: 'dynamo' },

  group: { type: String, default: 'global' },

  // status
  deprecated: { type: Boolean, default: false },
  banned: { type: Boolean, default: false },

  // urls
  site_url: { type: String, default: '' },
  repository_url: { type: String, default: '' },

  // stats
  downloads: { type: Number, default: 0 },
  votes: { type: Number, default: 0 },

  // comments
  latest_comment: { type: Date, default: 0 },
  num_comments: { type: Number, default: 0 },
  comments: [{
    text: { type: String, default: '' },
    created: { type: Date, default: Date.now },
    user: { type: Schema.ObjectId, ref: 'User' },
  }],

  // versions
  num_versions: { type: Number, default: 1 },
  latest_version_update: { type: Date, default: Date.now },
  versions: [{
    version: { type: String, default: '0.0.1' },
    change_log: { type: String, default: '' },
    direct_dependency_ids: [{ type: Schema.ObjectId, ref: 'Package' }],
    direct_dependency_versions: [{ type: String, default: '0.0.1' }],
    full_dependency_ids: [{ type: Schema.ObjectId, ref: 'Package' }],
    full_dependency_versions: [{ type: String, default: '0.0.1' }],
    created: { type: Date, default: Date.now },
    engine_version: { type: String, default: '0.0.1' },
    engine_metadata: { type: String, default: '' },
    contents: { type: String, default: '' },
    url: { type: String, default: 'none' },
    url_with_deps: { type: String, default: '' },
    node_libraries: [{ type: String, default: '' }],
    contains_binaries: { type: Boolean, default: false },
  }],

  // white listing
  white_list: { type: Boolean, default: false },

});

exports.PackageModel = mongoose.model('Package', Package);

var app = app || {};

// Package Model
// ----------

app.Package = Backbone.Model.extend({

  // Default attributes ensure that each Package created has `title` and `completed` keys.
  idAttribute: '_id',

  defaults: {
    name: '',
    engine: 'dynamo',
    keywords: [],
    description: 'description',
    deprecated: false,
    group: 'group',
    votes: 0,
    maintainers: [],
    version_deps: [],
    full_dl_deps: [],
    versions: [],
    used_by: [],
  },

  urlRoot: '/package/',

  parse(stuff) {
    if (stuff.content) {
      stuff = stuff.content;
    }

    stuff.version_deps = [];
    stuff.full_dl_deps = [];

    for (let i = 0; i < stuff.versions.length; i++) {
      // populate direct dependencies
      stuff.version_deps.push({ version: stuff.versions[i].version });
      stuff.version_deps[i].deps = [];

      for (var j = 0; j < stuff.versions[i].direct_dependency_ids.length; j++) {
        stuff.version_deps[i].deps.push({
          name: stuff.versions[i].direct_dependency_ids[j].name,
          _id: stuff.versions[i].direct_dependency_ids[j]._id,
          version: stuff.versions[i].direct_dependency_versions[j],
        });
      }

      // populate full dependencies
      stuff.full_dl_deps.push({ version: stuff.versions[i].version });
      stuff.full_dl_deps[i].deps = [];

      for (var j = 0; j < stuff.versions[i].full_dependency_ids.length; j++) {
        stuff.full_dl_deps[i].deps.push({
          name: stuff.versions[i].full_dependency_ids[j].name,
          _id: stuff.versions[i].full_dependency_ids[j]._id,
          version: stuff.versions[i].full_dependency_versions[j],
        });
      }
    }

    return stuff;
  },

});

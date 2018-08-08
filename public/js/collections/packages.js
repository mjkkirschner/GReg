// js/collections/todos.js

var app = app || {};

// Package Collection
// ---------------

const PackageList = Backbone.Collection.extend({

  url() {
    return '/packages/';
  },

  // Reference to this collection's model.
  model: app.Package,
  query: '',

  parse(resp) {
    return resp.content;
  },

  search(query) {
    this.query = query;
    this.fetch();
  },

});

app.Packages = new PackageList();

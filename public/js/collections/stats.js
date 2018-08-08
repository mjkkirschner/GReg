var app = app || {};


const StatsList = Backbone.Collection.extend({

  url() {
    return '/stats?limit=8';
  },

  model: app.Stat,

  parse(resp) {
    return resp.content;
  },

});

app.Stats = new StatsList();

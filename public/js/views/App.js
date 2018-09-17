
var app = app || {};

app.NavigationView = Backbone.View.extend({

  el: '#nav_container',

  events: {
    'click .navigate': 'navigate',
  },

  initialize() {
    this.$list = $('.list');
    this.$stats = $('#stats_container');
  },

  show(args) {
    console.log(args);
  },

});

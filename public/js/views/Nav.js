
var app = app || {};

app.NavView = Backbone.View.extend({

  el: '#nav_container',

  events: {
    'click .nav': 'navigate',
  },

  initialize() {
    this.$list = $('.list');
    this.$stats = $('#stats_container');
  },

  navigate(args) {
    $('.content').hide();
    const el_to_show = `#${$(args.target).attr('data-target')}_container`;
    $(el_to_show).show();
    $(el_to_show).find('.search').focus();
  },
});

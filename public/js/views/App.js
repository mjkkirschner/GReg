
var app = app || {};

app.NavigationView = Backbone.View.extend({

  el: '#nav_container',

  events: {
    'click .navigate': 'navigate'
  },

  initialize: function() { 
    this.$list = $('.list')
    this.$stats = $('#stats_container')
  },

	show: function(args){
		console.log(args);
	}

});

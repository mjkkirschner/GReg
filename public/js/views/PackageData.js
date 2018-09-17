
var app = app || {};

app.PackageDataView = Backbone.View.extend({

  el: '#data',

  template: _.template($('#package-data-template').html()),

  events: {
    'click .package-link': 'packageClick',
    'click .author-link': 'authorClick',
  },

  packageClick(e) {
    const id = $(e.target).attr('pkg-data-id');
    app.currentData.getPackage(id);
  },

  authorClick(e) {
    const id = $(e.target).attr('author-data-id');
    app.currentData.getAuthor(id);
  },

  initialize(options) {
    this.model = options.model;
  },

  render() {
  	console.log(this.model.toJSON());
	  this.$el.html(this.template(this.model.toJSON()));
    return this;
  },

});

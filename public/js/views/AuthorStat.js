
var app = app || {};

app.AuthorStatView = Backbone.View.extend({

  tagName: 'div',

  className: 'stat',

  template: _.template($('#author-stat-template').html()),

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

  initialize() {
    this.listenTo(this.model, 'change', this.render);
  },

  render() {
    this.$el.html(this.template(this.model.toJSON()));
    return this;
  },

});

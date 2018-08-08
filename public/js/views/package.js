// js/view/packages.js

var app = app || {};

app.PackageView = Backbone.View.extend({

  tagName: 'div',

  className: 'package',

  template: _.template($('#item-template').html()),

  events: {
	   click: 'expand',
  },

  toggleDeps(event) {
    this.$('.deps-container').toggle();
    this.$('.full_deps-container').toggle();
    event.preventDefault();
    event.stopPropagation();
  },

  expand(event) {
    app.currentData.getPackage(this.model.id);
    // this.$('.data-container').toggle();
  },

  initialize() {
    this.listenTo(this.model, 'change', this.render);
  },

  render() {
    this.$el.html(this.template(this.model.toJSON()));

    if (this.model.get('deprecated')) {
      this.$el.addClass('deprecated');
    }
    return this;
  },

});


var app = app || {};

app.DataView = Backbone.View.extend({

  el: '#data_container',

  events: {
    // when exit button clicked, make the needed updates
    'click .exit-data': 'exit',
  },

  initialize() {
 		this.model = new app.Data();
    app.currentData = this.model;
    this.listenTo(this.model, 'change', this.render);
  },

  exit() {
    this.$el.hide();
  },

  render() {
    if (!this.model.get('current_model')) return;

    this.$el.show();

    if (this.model.get('current_model').get('name')) {
      var view = new app.PackageDataView({ model: this.model.get('current_model') });
      view.render();
    } else {
      var view = new app.AuthorDataView({ model: this.model.get('current_model') });
      view.render();
    }

    return this;
  },

});

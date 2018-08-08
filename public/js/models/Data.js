var app = app || {};

app.Data = Backbone.Model.extend({

  defaults: {
    current_model: undefined,
    downloading: false,
  },

  getAuthor(id) {
    this.set('downloading', true);
    const model = new app.Author();
    model.urlRoot = `/user/${id}`;
    const that = this;
    model.fetch({
      success() {
        that.set('downloading', false);
        that.set('current_model', model);
      },
    });
  },

  getPackage(id) {
    this.set('downloading', true);
    const model = new app.Package();
    model.urlRoot = `/package/${id}`;
    const that = this;
    model.fetch({
      success() {
        that.set('downloading', false);
        that.set('current_model', model);
      },
    });
  },

});

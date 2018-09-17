
var app = app || {};

app.PackagesView = Backbone.View.extend({

  el: '.list',

  events: {
    'keyup .search': 'instantSearch',
  },

  initialize() {
    this.$input = this.$('.search');
    this.$list = this.$('.list');
    this.$loading = this.$('.loading_container');
    this.listenTo(app.Packages, 'sync', this.render);
  },

  render(arg) {
    this.$loading.hide();

    this.$list.empty();
    const that = this;

    app.Packages.forEach((pkg) => {
      if (pkg.get('deprecated')) return;
      const pkg_view = new app.PackageView({ model: pkg });
      pkg_view.render();
      that.$el.append(pkg_view.$el);
    });

    const options = {
      valueNames: ['engine', 'votes', 'downloads', 'name', 'keywords', 'group', 'description', 'maintainers'],
    };

    this.list = new List('app', options);
    this.list.sort('downloads', { asc: false });
  },

  instantSearch(event) {
    $('.searchfield').removeHighlight();
    $('.searchfield').highlight(this.$input.val());
  },

});

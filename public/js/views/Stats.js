
var app = app || {};

app.StatsView = Backbone.View.extend({

  el: '#browse_container',

  events: {

  },

  initialize() {
    this.$authors = this.$('#author_stats');
    this.$packages = this.$('#package_stats');
    this.listenTo(app.Stats, 'sync', this.render);
  },

  render(arg) {
	  this.model = app.Stats;

    this.template = _.template($('#overall-stats-template').html());

    const overallStats = {
      num_packages: this.model.where({ type: 'num packages' })[0].get('data'),
      num_downloads: this.model.where({ type: 'num downloads' })[0].get('data'),
      num_authors: this.model.where({ type: 'num authors' })[0].get('data'),
    };

    $('#overall-stats-container').html(this.template(overallStats));

    $('.loading_container').hide();

    const that = this;

    app.Stats.comparator = function (chapter) {
    	return String.fromCharCode(..._.map(chapter.get('type').split(''), c => 0xffff - c.charCodeAt()));
    };

    app.Stats.sort();

    // render stats
    app.Stats.forEach((stat) => {
      if (!(stat.get('data') instanceof Array)) return;

      if (stat.get('variety') === 'author') {
        var view = new app.AuthorStatView({ model: stat });
        stat.set('type', stat.get('type').replace('authors', ''));
        view.render();
      	that.$authors.append(view.$el);
      } else {
        if (stat.get('type').indexOf('comment') != -1) return;
        var view = new app.PackageStatView({ model: stat });
        stat.set('type', stat.get('type').replace('packages', ''));
        view.render();
      	that.$packages.append(view.$el);
      }
    });
  },

});

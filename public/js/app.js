
var app = app || {};
const ENTER_KEY = 13;

$(() => {
  new app.PackagesView();
  new app.StatsView();
  new app.NavView();
  	new app.DataView();

  app.Packages.fetch();
  app.Stats.fetch();
});

var error = require('../lib/error')
  , mongoose = require('mongoose')
  , stats = require('../lib/stats')

exports.DEFAULT_LIMIT = 6;

exports.by_engine_and_query = function(req, res) {

  var engine = req.params.engine
    , query_type = req.params.query_type
    , limit = req.query.limit || exports.DEFAULT_LIMIT;

  if ( !stats[query_type] ){
		return res.status(404).send(error.fail("No such statistic"));
	}
 
  stats[query_type]( engine, limit, function(err, pkgs){

    if ( err || !pkgs || pkgs.length === 0 ){
      return res.status(404).send(error.fail("No results"));
    }

    return res.send( error.success_with_content('Found stats', pkgs) );

  });

}

exports.all_engine_stats = function(req, res) {

  var engine = req.params.engine
    , limit = req.query.limit || exports.DEFAULT_LIMIT;
 
  stats.all_engine_stats( engine, limit, function(err, engine_stats){

    if ( err || !engine_stats ){
      return res.status(404).send(error.fail("No results"));
    }

    return res.send( error.success_with_content('Found stats', engine_stats) );
  
  });

}

exports.all_stats = function(req, res) {

  var limit = req.query.limit || exports.DEFAULT_LIMIT;
 
  stats.all_stats( limit, function(err, stats){

    if ( err || !stats ){
      return res.status(404).send(error.fail("No results"));
    }

    return res.send( error.success_with_content('Found stats', stats) );

  });

}

exports.all_user_stats = function(req, res) {

  var limit = req.query.limit || exports.DEFAULT_LIMIT;

  stats.all_user_stats( limit, function(err, stats){

    if ( err || !stats ){
      return res.status(404).send(error.fail("No results"));
    }

    return res.send( error.success_with_content('Found stats', stats) );

  });

}

exports.user_stats_by_query = function(req, res) {

  var query_type = req.params.query_type
    , limit = req.query.limit || exports.DEFAULT_LIMIT;
 
  if ( !stats[query_type] ){
    return res.status(404).send(error.fail("No such statistic"));
  }
 
  stats[query_type]( limit, function(err, users){

    if ( err || !users || users.length === 0 ){
      return res.status(404).send(error.fail("No results"));
    }

    return res.send( error.success_with_content('Found stats', users) );

  });

}


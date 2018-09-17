const error = require('../lib/error');
const statsLib = require('../lib/stats');

exports.DEFAULT_LIMIT = 6;

exports.by_engine_and_query = (req, res) => {
  const engine = req.params.engine;
  const query_type = req.params.query_type;
  const limit = parseInt(req.query.limit, 10) || exports.DEFAULT_LIMIT;

  if (!statsLib[query_type]) {
    return res.status(404).send(error.fail('No such statistic'));
  }

  statsLib[query_type](engine, limit, (err, pkgs) => {
    if (err || !pkgs || pkgs.length === 0) {
      return res.status(404).send(error.fail('No results'));
    }

    return res.send(error.success_with_content('Found stats', pkgs));
  });
};

exports.all_engine_stats = (req, res) => {
  const engine = req.params.engine;
  const limit = parseInt(req.query.limit, 10) || exports.DEFAULT_LIMIT;

  statsLib.all_engine_stats(engine, limit, (err, engine_stats) => {
    if (err || !engine_stats) {
      return res.status(404).send(error.fail('No results'));
    }

    return res.send(error.success_with_content('Found stats', engine_stats));
  });
};

exports.all_stats = (req, res) => {
  const limit = parseInt(req.query.limit, 10) || exports.DEFAULT_LIMIT;

  statsLib.all_stats(limit, (err, stats) => {
    if (err || !stats) {
      return res.status(404).send(error.fail('No results'));
    }

    return res.send(error.success_with_content('Found stats', stats));
  });
};

exports.all_user_stats = (req, res) => {
  const limit = parseInt(req.query.limit, 10) || exports.DEFAULT_LIMIT;

  statsLib.all_user_stats(limit, (err, stats) => {
    if (err || !stats) {
      return res.status(404).send(error.fail('No results'));
    }

    return res.send(error.success_with_content('Found stats', stats));
  });
};

exports.user_stats_by_query = (req, res) => {
  const query_type = req.params.query_type;
  const limit = parseInt(req.query.limit, 10) || exports.DEFAULT_LIMIT;

  if (!statsLib[query_type]) {
    return res.status(404).send(error.fail('No such statistic'));
  }

  statsLib[query_type](limit, (err, users) => {
    if (err || !users || users.length === 0) {
      return res.status(404).send(error.fail('No results'));
    }

    return res.send(error.success_with_content('Found stats', users));
  });
};

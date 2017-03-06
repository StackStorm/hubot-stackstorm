
var mongodb = require('mongodb');
var url = require('mongodb-url').get();

module.exports = function(robot) {
  robot.logger.info('mongodb: Connecting to `%s`...', url);
  var db;

  mongodb.connect(url, function(err, _db) {
    if (err) {
      robot.logger.error('mongodb: Connection failed: `%s`', err.message);
      robot.logger.error(err.stack);
      return;
    }
    db = _db;

    db.collection('hubot').findOne({
      _id: 'brain'
    }, function(_err, doc) {
      if (_err) {
        robot.logger.error('mongodb: Lookup failed');
        robot.logger.error(_err.stack);
        return;
      }
      if (doc) {
        robot.logger.info('mongodb: loaded brain from previous document');
        robot.brain.mergeData(doc);
      } else {
        robot.logger.info('mongodb: Initializing...');
        robot.brain.mergeData({});
      }
      robot.brain.resetSaveInterval(10);
      robot.brain.setAutoSave(true);
      robot.logger.info('mongodb: Ready.');
    });
  });

  robot.brain.on('save', function(data) {
    data = data || {};
    data._id = 'brain';
    robot.logger.info('mongodb: saving...');
    db.collection('hubot').save(data, function(err) {
      if (err) {
        robot.logger.error('mongodb: Save failed: `%s`', err.message);
        return;
      }
      robot.logger.info('mongodb: Saved!');
    });
  });

  robot.brain.on('close', function() {
    if (db) {
      robot.logger.info('mongodb: Closing client.  Goodbye.');
      db.close();
    }
  });
  robot.brain.setAutoSave(false);
};
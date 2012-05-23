/*!
 * Mongoose - Session
 * Copyright(c) 2012 Eric Kryski
 * MIT Licensed
 */

/**
 * Return the `MongooseStore` extending `connect`'s session Store.
 * This uses mongoose along with a predefined session model, and
 * also the mongoose connection.
 *
 * @param {object} connect
 * @param {object} model
 * @return {function}
 * @api public
 */

module.exports = function(connect, app) {

  var Store = connect.session.Store;
  var Session = app.models.session.getModel();

  function MongooseStore(options) {
    options = options || {};

    //Handle optional additional database connection
    if (options.uri){
      this.connection = app.mongoose.createConnection(options.uri);
    }
    else if (options.host && options.db && options.port) {
      connectionOptions = options.options || {};
      this.connection = app.mongoose.createConnection(options.host, options.db, options.port, connectionOptions);
    }

    Store.call(this, options);
  }

  //Inherit from Connect's store

  MongooseStore.prototype.__proto__ = Store.prototype;

  /**
   * Get a given session
   * @param {string} sid
   * @return {function}
   * @api public
  */

  MongooseStore.prototype.get = function(sid, callback) {
    var self = this;

    //Find a session excluding the sensitive information
    Session.findOne().where('sid', sid).exclude('_id', 'sid').run(function(err, session) {
      if (!session) return callback();
      if (err) return callback(err);
      else {
        if (!session.cookie.expires || new Date < session.cookie.expires) {
          callback(null, session.toJSON());
        } 
        else {
          self.destroy(sid, callback);
        }
      }
    });
  };

  /**
   * Create or update a given session
   * @param {string} sid
   * @param {object} session - the connect/express session object
   * @return {function}
   * @api public
  */

  MongooseStore.prototype.set = function(sid, session, callback) {
    session = session || {};
    session.cookie = session.cookie.toJSON() || {};
    session.sid = sid;

    var maxAge = 3600000; //1 hour in milliseconds

    //If cookie already has an expiry date string then convert it to date object
    if (session.cookie.expires) {
      session.cookie.expires = new Date(session.cookie.expires);

    }
    else {
      var now = new Date();
      session.cookie.expires = now.setTime(now.getTime() + maxAge);
    }

    Session.update({ "sid": sid }, session, { upsert: true }, callback);
  };

  /**
   * Destroy a given session
   * @param {string} sid
   * @return {function}
   * @api public
  */

  MongooseStore.prototype.destroy = function(sid, callback) {
    Session.remove({ "sid": sid }, callback);
  };

  /**
   * Count the number of sessions
   * @param {object} query - optional query params
   * @return {function}
   * @api public
  */

  MongooseStore.prototype.count = function(query, callback) {
    query = query || {};
    Session.count(query, callback);
  };

  /**
   * Clear all sessions in the collection
   * @return {function}
   * @api public
  */

  MongooseStore.prototype.clear = function(callback) {
    Session.collection.drop(callback);
  };

  return MongooseStore;
};
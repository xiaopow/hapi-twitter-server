var Bcrypt = require('bcrypt');
var Joi = require('joi');
var Auth = require('./auth');

exports.register = function(server, option, next) {
  // include routes
  server.route([
    {
      // Creating a session / logging in
      method: 'POST',
      path: '/sessions',
      handler: function(request,reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var user = request.payload.user;
        db.collection('users').findOne({"username": user.username}, function(err, userMongo) {

          if (err) { return reply('Internal MongoDB error' + err)};

          if (userMongo === null) {
            return reply({ "message": "User doesn't exist" });
          }

          Bcrypt.compare(user.password, userMongo.password, function(err, matched){
            if (matched) {
              // If password matches, please authenticate user and add to cookie
              function randomKeyGenerator() {
                return (((1+Math.random())*0x10000)|0).toString(16).substring(1); 
              }
   
              // Generate a random key
              var randomkey = (randomKeyGenerator() + randomKeyGenerator() + "-" + randomKeyGenerator() + "-4" + 
                randomKeyGenerator().substr(0,3) + "-" + randomKeyGenerator() + "-" + randomKeyGenerator() + 
                randomKeyGenerator() + randomKeyGenerator()).toLowerCase();

              var newSession = {
                "session_id": randomkey,
                "user_id": userMongo._id,
                "username": userMongo.username
              };

              db.collection('sessions').insert(newSession, function(err, writeResult) {
                if (err) { return reply('Internal MongoDB error', err); }
                // Store the Session information in the browser Cookie
                // using Yar
                request.session.set('hapi_twitter_session', {
                  "session_key": randomkey,
                  "user_id": userMongo._id
                });
                reply(writeResult);
              });

            } else {
              reply({ "message": "Not authorized" });
            }
          });

        });
      }
    },
    {
      method: 'GET',
      path: '/authenticated',
      handler: function(request, reply) {
        Auth.authenticated(request, function(result){
          reply(result);
        });
      }
    },
    {
      // logging out
      method: "DELETE",
      path: '/sessions',
      handler: function(request,reply) {
        // obtain the session
        var session = request.session.get('hapi_twitter_session');
        // initial db
        var db = request.server.plugins['hapi-mongodb'].db;
        // check if session exists
        if (!session) {
          return reply({ "message": "Already logged out"});
        }
        db.collection('sessions').remove({ "session_id": session.session_key},
        function(err, writeResult){
          if(err) { return reply('Internal MongoDB error', err)};
          reply(writeResult);
        });
      }
    }
  ]);
  next();
};

// give this file some attributes
exports.register.attributes = {
  name: 'sessions-route',
  version: '0.0.1'
};
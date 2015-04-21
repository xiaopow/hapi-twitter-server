var Joi = require('joi');
var Auth = require('./auth');

exports.register = function(server, option, next) {
  server.route([
    {
      // Retrieve all tweets
      method: 'GET',
      path: '/tweets',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;

        db.collection('tweets').find().toArray(function(err, tweets) {
          if (err) { return reply('Internal MongoDB error', err); }

          reply(tweets);
        });
      }
    },
    {
      // Retrieve all tweets by a specific user
      method: 'GET',
      path: '/users/{username}/tweets',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var username = encodeURIComponent(request.params.username);

        db.collection('users').findOne({ "username": username }, function(err, user) {
          if (err) { return reply('Internal MongoDB error', err); }

          db.collection('tweets').find({ "user_id": user._id }).toArray(function(err, tweets) {
            if (err) { return reply('Internal MongoDB error', err); }

            reply(tweets);
          });
        });
      }
    },
    {
      // Retrieve a specific tweet
      method: 'GET',
      path: '/tweets/{id}',
      handler: function(request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db;
        var tweetId = encodeURIComponent(request.params.id);
        var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

        db.collection('tweets').findOne({ "_id": ObjectId(tweetId) }, function(err, tweet) {
          if (err) { return reply('Internal MongoDB error', err); }

          reply(tweet);
        })
      }
    },
    {
      // Create a new tweet
      method: 'POST',
      path: '/tweets',
      config: {  
        handler: function(request, reply) {
          // first authenticate the user
          Auth.authenticated(request, function(result){
            if(result.authenticated) {
              // post the tweet
              var db = request.server.plugins['hapi-mongodb'].db;
              var session = request.session.get('hapi_twitter_session');
              var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

              db.collection('users').findOne({ "_id": ObjectId(session.user_id) }, function(err, user) {
                if (err) { return reply('Internal MongoDB error', err); }
                
                var tweet = {
                  'message': request.payload.tweet.message,
                  'user_id': ObjectId(session.user_id),
                  'username': user.username
                };

                db.collection('tweets').insert( tweet, function(err, writeResult){
                  if(err) {
                    return reply('Internal MongoDB error', err);
                  } else {
                    reply(writeResult);
                  }
                });
              });
            } else {
              // reply that user is not authenticated
              reply(result);
            }
          });
        },
        validate: {
          payload: {
            tweet: {
              message: Joi.string().max(140).required(),
            }
          }
        }
      }
    },
    {
      // Delete a tweet
      method: 'DELETE',
      path: '/tweets/{id}',
      handler: function(request, reply) {
        Auth.authenticated(request, function(result){
          if(result.authenticated) {
            // delete the tweet
            var db = request.server.plugins['hapi-mongodb'].db;
            var tweetId = encodeURIComponent(request.params.id);
            var ObjectId = request.server.plugins['hapi-mongodb'].ObjectID;

            db.collection('tweets').remove({ "_id": ObjectId(tweetId) }, function(err, tweet) {
              if (err) { return reply('Internal MongoDB error', err); }

              reply(tweet);
            });
          } else {
            // reply that user is not authenticated
            reply(result);
          }
        });
      }
    },
    {
      method: 'GET',
      path: '/tweets/search/{keyword}',
      handler: function (request, reply) {
        var db = request.server.plugins['hapi-mongodb'].db; 
        var query = { "$text": { "$search": request.params.keyword} };
        db.collection('tweets').find(query).toArray(function(err, result){
          if (err) throw err;
          reply(result);
        });
      }
    }
  ]);

  next();
};

// give this file some attributes
exports.register.attributes = {
  name: 'tweets-route',
  version: '0.0.1'
};
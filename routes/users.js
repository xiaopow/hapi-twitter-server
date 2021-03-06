var Bcrypt = require('bcrypt');
var Joi = require('joi');

exports.register = function(server, option, next) {
  // include routes
  server.route([
    {
      // Retrieve all users
      method: 'GET',
      path: '/users',
      handler: function(request,reply) {
        var db = request.server.plugins['hapi-mongodb'].db;

        db.collection('users').find().toArray(function(err, users) {
          if (err) { 
            return reply('Internal MongoDB error', err);
          }

          reply(users);

        });
      }
    },
    {
      // Retreive one user
      method: 'GET',
      path: '/users/{username}',
      handler: function(request, reply) {
        var username = encodeURIComponent(request.params.username);
        var db = request.server.plugins['hapi-mongodb'].db;

        db.collection('users').findOne({ "username": username }, function(err, user) {
          if (err) { return reply('Internal MongoDB error', err); }
          if (user === null) {
            return reply({ "message": "Cannot find user with that username"});
          }

          reply(user);
        })
      }
    },
    {
      // Creating a user
      method: 'POST',
      path: '/users',
      config: {
        handler: function(request,reply) {
          var db = request.server.plugins['hapi-mongodb'].db;
          var newUser = request.payload.user;

          Bcrypt.genSalt(10, function(err, salt){
            Bcrypt.hash(newUser.password, salt, function(err, hash){
              newUser.password = hash;
              
              var uniqUserQuery = {
                $or: [
                  { username: newUser.username },
                  { email: newUser.email }
              ]};

              db.collection('users').count(uniqUserQuery, function(err, userExist) {
                // if user already exists
                if (userExist) {
                  return reply('Error: Username already exist', err);
                }

                db.collection('users').insert(newUser, function(err, writeResult){
                  if(err) {
                    return reply('Internal MongoDB error', err);
                  } else {
                    reply(writeResult);
                  }
                });
              });
            
            });
          });
        },
        validate: {
          payload: {
            user: {
              username: Joi.string().min(3).max(20).required(),
              email: Joi.string().email().max(50).required(),
              password: Joi.string().min(5).max(20).required()
            }
          }
        }
      }
    }

  ]);
  next();
};

// give this file some attributes
exports.register.attributes = {
  name: 'users-route',
  version: '0.0.1'
};
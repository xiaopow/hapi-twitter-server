module.exports = {};

module.exports.authenticated = function(request, callback) {
  // retrieve the session information from the browser
  var session = request.session.get('hapi_twitter_session');
  // check if session exists
  if (!session) {
    return callback({ 
      "message": "Already logged out",
      "authenticated": false
    });
  };
  var db = request.server.plugins['hapi-mongodb'].db;
  db.collection('sessions').findOne({"session_id": session.session_key}, function(err, result) {
    if (result === null) {
      return callback({ 
        "message": "Unauthenticated",
        "authenticated": false
      });
    } else {
      return  callback({ 
        "message": "Authenticated",
        "authenticated": true
      });
    }
  });
}
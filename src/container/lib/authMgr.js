'use strict';
var passport = require('passport'),
    cacheMgr = require('./cacheMgr'),
    crypto = require('crypto'),
    log = require('./logMgr').getLogger('authMgr'),
    uuid = require("uuid");


function AuthMgr() {}

AuthMgr.prototype.createAuthTokenInCache = function(user, callback) {
    var token = crypto.createHash('sha1').update(user.toString()).digest('base64');
    var err;
    if(!global.cacheMgr.set(token, user)){
        err = new Error('Failed to set token on cache ...');
    }
    return callback(err, token);
};

AuthMgr.prototype.getUserByToken = function(token) {
    return global.cacheMgr.get(token);
};

/*Compare required role list with user role list, if one role match, grant the access  */
AuthMgr.prototype.auth = function(requiredRoles, req, callback) {
    var err;
    if (requiredRoles && requiredRoles.length > 0) {
        var token = req.header('Authorization');
        if (token) {
            var user = cacheMgr.get(token);
            if(user){
                req.user = user;
                requiredRoles.forEach (function(role){
                    if (user.hasRole(role)) {
                        return callback(err);
                    }
                });
            }
        }
    } else {
        return callback(err);
    }
    err = new Error('Unauthorized visit to url [' + req.originalUrl + ']...');
    err.httpStatusCode = 401;
    return callback(err);
};


/*    
    if(true){
        var token = uuid.v4();
        this.tokenCache.set(token, moment());
    } else {
        
    }
}

//token expiring on 30 min, and would be renew for each rest call
AuthMgr.prototype.authToken = function (token) {
    var timeStamp = this.tokenCache.get(token);
    if(timeStamp && moment(timeStamp).add(30, 'm').isAfter(moment())){
        this.tokenCache.set(token, moment());
        return true;
    } else {
        return false;
    }
}
*/

module.exports = new AuthMgr();

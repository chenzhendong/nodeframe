'use strict';
var log = require('./logMgr').getLogger('errMgr');

function ErrMgr() {
    
}

ErrMgr.prototype.handleError = function (err, req, res) {

    if(!err) return;
    if(!err.level){
        err.level = 'debug';
    }
    
    log[err.level](err.message);
    
    if (err.isRestfulSvc) {
        res.status(err.httpStatusCode).send({
            message: err.message 
        }).end();
    }
    else {
        res.send(
            '<html>' +
            '<p>message: '+ err.httpStatusCode +'</p>' +
            '</html>');
    }
};

module.exports = new ErrMgr();
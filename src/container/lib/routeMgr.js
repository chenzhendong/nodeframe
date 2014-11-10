'use strict';
var path = require('path'),
    log = require('./logMgr').getLogger('routeMgr');

function routeMgr(){
    
}

routeMgr.prototype.handleRoute = function(myModule){
    var api = myModule.api;
    var server = global.server;
    
    //add rest route
    var restRoutes = myModule.route.rest;
    for(var url in restRoutes){
        server.addRestRoute('/'+ myModule.name + url, api[restRoutes[url].api], restRoutes[url]);
    }
    
    //add web route
    var webRoutes = myModule.route.web;
    for(var url in webRoutes){
        /*resolve absolute path for html template*/
        if(webRoutes[url].view){
          webRoutes[url].view = path.resolve(myModule.rootPath, 'view', webRoutes[url].view);
          log.debug('Found view file as ['+webRoutes[url].view+']...');
        }
        server.addWebRoute('/'+ myModule.name + url, api[webRoutes[url].api], webRoutes[url]);
    }
    
};

routeMgr.prototype.register = function(myModule){
    this.handleRoute(myModule);
};

module.exports = new routeMgr();
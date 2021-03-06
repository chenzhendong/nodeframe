'use strict';
var path = require('path'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    express = require('express'),
    app = express(),
    fs = require('fs'),
    log = require('./logMgr').getLogger('server'),
    envMgr = require('./envMgr'),
    errMgr = require('./errMgr'),
    swig = require('swig'),
    domain = require('domain');

function Server() {
    this.express = express;
    this.app = app;
    this.viewPathList = [];
    this.views = {};
    var nconf = envMgr.nconf;

    this.init();

    this.host = nconf.get('server:host');
    this.port = nconf.get('server:port');
    
    swig.setDefaults({ loader: swig.loaders.memory(this.views)});
}

var REST_PREFIX = '/rest/v1';
//Server.prototype.WEB_PREFIX = '/pages';


Server.prototype.init = function() {
    app.use(bodyParser.json(), function(err, req, res, next) {

        if (req.originalUrl.slice(0, REST_PREFIX.length) == REST_PREFIX) {
            req.isRestful = true;
        }

        if (err) {
            err.message = 'Failed to parse the body: ' + err.message;
            err.httpStatusCode = 400;
            err.isRestfulSvc = req.isRestful;
            global.errMgr.handleError(err, req, res);
        }
        else {
            next();
        }
    });
    app.use(bodyParser.urlencoded({
        extended: true
    }));

    //mapping bower libs to /public/js/lib
    var prjRoot = path.resolve(__dirname, '..', '..', '..');
    this.mappingStaticResource(path.resolve(prjRoot, 'bower_components'), '/public/lib');
    app.get('/', function(req, res, next) {
        res.redirect('/web/index');
    });
};

// Add a single rest route to express.
Server.prototype.addRestRoute = function(url, apiFunc, route) {
    var mappingUrl = REST_PREFIX + url;
    log.info('Mapping rest url [', mappingUrl, ']...');
    app.use(mappingUrl, function(req, res, next) {

        global.authMgr.auth(route.roles, req, function(err) {
            if (err) {
                global.errMgr.handleError(err, req, res);
            }
            else {
                apiFunc(req, res, next);
            }
        });
    });
};

// Add a single page route to express.
Server.prototype.addWebRoute = function(url, apiFunc, route) {
    var mappingUrl = url;
    var views = this.views;
    log.info('Mapping web url [', mappingUrl, ']...');
    app.use(mappingUrl, function(req, res, next) {
        global.authMgr.auth(route.roles, req, function(err) {
            if (err) {
                global.errMgr.handleError(err, req, res);
            }
            else {
                apiFunc(req, res, next, function(model) {
                    var viewFileName = route.view;
                    if (viewFileName) {
                        if (model) {
                            if (views[viewFileName]) {
                                res.status(200).send(swig.renderFile(viewFileName, model)).end();
                                return;
                            }
                            else {
                                err = new Error('Invaild Url to this website.');
                                err.httpStatusCode = 404;
                            }
                        }
                        else {
                            err = new Error('Cannot find data model for reqest url, check if module api.js file return the data model ...');
                        }
                    }
                    else {
                        err = new Error('Cannot find swig template for reqest url, check module route.js file ...');
                    }

                    global.errMgr.handleError(err, req, res);
                });
            }
        });
    });
};

var setView = function(views, viewPath, filename){
    var fullFilePath = path.resolve(viewPath, filename);
    var content = fs.readFileSync(fullFilePath, 'utf8');
    views[filename] = content;
};

Server.prototype.compileViewInPath = function(viewPath) {
    var views = this.views;
    fs.readdir(viewPath, function(err, files) {
        if (files) {
            for (var idx in files) {
                var filename = files[idx];
                setView(views, viewPath, filename);
            }
        }
    });
}

Server.prototype.addViewPath = function(viewPath) {
    var viewPathList = this.viewPathList;
    var views = this.views;
    viewPathList[viewPathList.length] = viewPath;
    log.info('Adding view template path [' + viewPath + '] ...');
    this.compileViewInPath(viewPath);

    //TODO: optional, could be comment out after page done
    fs.watch(viewPath, function(event, filename) {
        setView(views, viewPath, filename);
        swig.invalidateCache();
    });
};


//add public resources from module.
Server.prototype.mappingStaticResource = function(staticPath, mappingUrl) {
    log.info('Mapping static path[' + staticPath + '] to [' + mappingUrl + ']...');
    app.use(mappingUrl, express.static(staticPath));
};

Server.prototype.listen = function() {
    log.info('Server is listening now on [', this.host, ': ', this.port, ']...');
    app.listen(this.port, this.host);
};




module.exports = new Server();
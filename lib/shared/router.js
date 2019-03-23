const http = require('http');
const path = require('path');
const FindMyWay = require('find-my-way');
const compose = require('./compose');
const Url = require('url');

function RouterPrefix(root, prefix = '/') {
  this.root = root;
  this.prefix = prefix;
  this.middlewares = [];
}

RouterPrefix.prototype.use = function(...args) {
  this.middlewares.push(...args);
  return this;
}

RouterPrefix.prototype.verb = function(methods, prefix = '/', ...middlewares) {
  const fn = compose([].concat(this.middlewares).concat(middlewares));
  const paths = prefix.startsWith('/') 
    ? path.resolve(this.prefix, '.' + prefix) 
    : path.resolve(this.prefix, prefix);
  this.root.on(methods, paths, (req, res, params) => handleRequest(req, res, params, fn));
}

http.METHODS.forEach(method => {
  RouterPrefix.prototype[method.toLowerCase()] = function(prefix, ...middlewares) {
    return this.verb(method, prefix, ...middlewares);
  }
});

module.exports = class Router {
  constructor() {
    this._ = FindMyWay({
      ignoreTrailingSlash: true,
      defaultRoute: (req, res) => {
        res.statusCode = 404;
        res.end();
      }
    });
  }

  prefix(prefix = '/') {
    if (!prefix.startsWith('/')) prefix = '/' + prefix;
    return new RouterPrefix(this._, prefix);
  }

  lookup(req, res) {
    this._.lookup(req, res);
  }
}

function handleRequest(req, res, params, fn) {
  const location = Url.parse(req.url, true);
  Object.defineProperty(location, 'params', { value: params });
  Object.defineProperty(req, 'state', { value: Object.create(null) });
  Object.defineProperty(req, 'location', { value: location });
  fn(req, res).catch(e => {
    res.statusCode = 500;
    res.end(e.message);
  });
}
const http = require('http');
const path = require('path');
const FindMyWay = require('find-my-way');
const compose = require('./compose');
const Context = require('./context');
const Response = require('./response');

function RouterPrefix(router, prefix = '/') {
  this.$router = router;
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
  this.$router._.on(methods, paths, (req, res, params) => handleRequest(this.$router, req, res, params, fn));
}

http.METHODS.forEach(method => {
  RouterPrefix.prototype[method.toLowerCase()] = function(prefix, ...middlewares) {
    return this.verb(method, prefix, ...middlewares);
  }
});

module.exports = class Router {
  constructor(app) {
    this.$app = app;
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
    return new RouterPrefix(this, prefix);
  }

  lookup(req, res) {
    this._.lookup(req, res);
  }
}

function handleRequest(router, req, res, params, fn) {
  const ctx = new Context(req, res);
  ctx.app = router.$app;
  ctx.location.params = params;
  ctx.app.emit('start', ctx)
  .then(() => fn(ctx))
  .then(() => ctx.emit('resolve'))
  .catch(e => ctx.emit('reject', e))
  .then(() => ctx.emit('stop'))
  .then(() => ctx.app.emit('stop', ctx))
  .then(() => Response(ctx))
  .catch(e => {
    if (!res.headersSent) {
      sendError(res, e);
    }
  });
}

function sendError(res, e) {
  res.statusCode = 500;
  res.end(e.message);
}
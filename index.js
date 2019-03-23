exports.Interface = {};
exports.Interface.Middlewares = {};
exports.Interface.Services = {};
exports.josify = require('./lib/master');
exports.Controller = require('./lib/decorates/controller');
exports.Middleware = require('./lib/decorates/middleware');
exports.Service = require('./lib/decorates/service');
exports.Public = require('./lib/decorates/public');
exports.Http = require('./lib/decorates/http');
exports.Decorate = require('./lib/decorates/interface');
exports.Validator = require('./lib/decorates/validator');
exports.Response = require('./lib/decorates/response');
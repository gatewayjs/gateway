const Response = require('../utils/response');
const Validator = require('./validator');
module.exports = function($plugin, $app, target, decorates) {
  const ControllerMetaData = Reflect.getMetadata('Controller', target);
  const MiddlewareMetaData = Reflect.getMetadata('Middleware', target) || [];
  const router = $app.$router.prefix(ControllerMetaData).use(...MiddlewareMetaData);
  const controllerProperties = Object.getOwnPropertyNames(target.prototype);
  for (let i = 0; i < controllerProperties.length; i++) {
    const property = controllerProperties[i];
    if (property === 'constructor') continue;
    const middlewares = Reflect.getMetadata('Middleware', target.prototype[property]) || [];
    const Https = Reflect.getMetadata('Http', target.prototype[property]);
    const Services = Reflect.getMetadata('Service', target.prototype[property]) || [];
    const ResponseSchema = Reflect.getMetadata('ResponseSchema', target.prototype[property]);
    const decorateOptions = {};
    for (const decorate in decorates) {
      const _decorateResult = decorates[decorate].get(target.prototype[property]);
      if (_decorateResult !== undefined) {
        decorateOptions[decorate] = {
          value: _decorateResult,
          render: decorates[decorate]
        };
      }
    }
    if (Https && Https.length) {
      Https.forEach(http => {
        const _middlewares = middlewares.slice(0);
        _middlewares.push(Validator(target, property));
        _middlewares.push(async (req, res) => {
          const controller = new target($plugin);
          const options = { Service: {} };
          for (let i = 0; i < Services.length; i++) {
            const _service = Services[i];
            options.Service[_service.name] = new _service($plugin);
            options.Service[_service.name].$plugin = $plugin;
          }
          for (const option in decorateOptions) {
            decorateOptions[option].render(
              decorateOptions[option].value, 
              { options, req, res }
            );
          }
          const result = await controller[property].call(controller, req, res, options);
          Response(req, res, result, ResponseSchema);
        });
        router[http.method.toLowerCase()](http.prefix, ..._middlewares);
      });
    }
  }
}
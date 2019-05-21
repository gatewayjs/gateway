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
        _middlewares.push(async ctx => {
          const controller = new target($plugin);
          const options = { Service: {} };
          controller.$plugin = $plugin;
          controller.$config = $plugin.$config;
          for (let i = 0; i < Services.length; i++) {
            const _service = Services[i];
            options.Service[_service.name] = _service.create();
          }
          for (const option in decorateOptions) {
            if (decorateOptions[option].render) {
              decorateOptions[option].render(
                decorateOptions[option].value, 
                { options, ctx }
              );
            }
          }
          ctx.schema = ResponseSchema;
          ctx.body = await controller[property].call(controller, ctx, options);
        });
        router[http.method.toLowerCase()](http.prefix, ..._middlewares);
      });
    }
  }
}
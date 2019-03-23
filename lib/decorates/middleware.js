const isClass = require('is-class');
module.exports = function Middleware(object, ...args) {
  if (!isClass(object)) throw new Error('Middleware must be a class. file:' + object.__file__);
  if (typeof object.prototype.middleware !== 'function' || object.prototype.middleware.length !== 3) {
    throw new Error('Middleware must have a middleware method and its arguments.length=3. file:' + object.__file__);
  }
  if (!object.__is_middleware__) throw new Error('it is not a middleware target. file: ' + object.__file__);
  const obj = new object(...args);
  return (target, propertyKey, descriptor) => {
    if (isClass(target)) {
      let parentMiddlewares = Reflect.getMetadata('Middleware', target);
      if (!parentMiddlewares) parentMiddlewares = [];
      parentMiddlewares.unshift(obj);
      Reflect.defineMetadata('Middleware', parentMiddlewares, target);
    } else {
      let childMiddlewares = Reflect.getMetadata('Middleware', target);
      if (!childMiddlewares) childMiddlewares = [];
      childMiddlewares.unshift(obj);
      Reflect.defineMetadata('Middleware', childMiddlewares, descriptor.value);
    }
  }
}
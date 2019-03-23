const isClass = require('is-class');
module.exports = function Controller(prefix) {
  if (isClass(prefix)) {
    return Reflect.defineMetadata('Controller', '/', prefix);
  }
  return target => {
    Reflect.defineMetadata('Controller', prefix, target);
  }
}
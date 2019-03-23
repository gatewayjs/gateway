const isClass = require('is-class');
module.exports = function Public(prefix) {
  if (isClass(prefix)) {
    return Reflect.defineMetadata('Public', true, prefix);
  }
}
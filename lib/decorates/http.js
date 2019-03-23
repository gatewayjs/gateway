const http = require('http');
const BodyParser = require('../shared/body-parser');
const FileParser = require('../shared/file-parser');
const Http = {};

http.METHODS.forEach(method => {
  Http[method] = function(path, key, desc) {
    if (!key && !desc) throw new Error(`You can not use '@Http.${method}' on class.`);
    if (typeof path === 'string') {
      return (target, propertyKey, descriptor) => {
        if (typeof descriptor.value !== 'function'/* || descriptor.value.length !== 2*/) {
          throw new Error(`@Http.${method}.${propertyKey} must be a function and its arguments.length=2. file: ${target.__file__}`);
        }
        let HttpMetaData = Reflect.getMetadata('Http', descriptor.value);
        if (!HttpMetaData) HttpMetaData = [];
        HttpMetaData.unshift({
          method: method,
          prefix: path
        });
        Reflect.defineMetadata('Http', HttpMetaData, descriptor.value);
      }
    } else {
      if (typeof desc.value !== 'function'/* || desc.value.length !== 2*/) {
        throw new Error(`@Http.${method}.${key} must be a function and its arguments.length=2. file: ${path.__file__}`);
      }
      let HttpMetaData = Reflect.getMetadata('Http', desc.value);
      if (!HttpMetaData) HttpMetaData = [];
      HttpMetaData.unshift({
        method: method,
        prefix: '/'
      });
      Reflect.defineMetadata('Http', HttpMetaData, desc.value);
    }
  }
});

Http.Body = BodyParser;
Http.File = FileParser;

module.exports = Http;
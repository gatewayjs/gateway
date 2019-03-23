const Ajv = require('ajv');
module.exports = schema => {
  return (target, key, descriptor) => {
    Reflect.defineMetadata('ResponseSchema', schema, descriptor.value);
  }
}
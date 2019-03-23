const Ajv = require('ajv');
const Validator = {};

['QueryString', 'Body', 'Header'].forEach(schema => {
  Validator[schema] = function(object) {
    return (target, key, descriptor) => {
      Reflect.defineMetadata('Validator' + schema, validData => {
        const ajv = new Ajv();
        const schema = { type: 'object', properties: object };
        const valid = ajv.validate(schema, validData);
        if(!valid) return ajv.errors;
      }, descriptor.value);
    }
  }
});

module.exports = Validator;
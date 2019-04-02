const Ajv = require('ajv');
const Validator = {};

['QueryString', 'Body', 'Header'].forEach(schema => {
  Validator[schema] = function(object) {
    return (target, key, descriptor) => {
      Reflect.defineMetadata('Validator' + schema, validData => {
        const ajv = new Ajv();
        const schema = typeof object === 'string' ? require(object) : object;
        const valid = ajv.validate(schema, validData);
        if(!valid) return ajv.errors;
      }, descriptor.value);
    }
  }
});

Validator.FormatObject = (...args) => {
  const result = {
    type: 'object',
    properties: {},
    required: []
  };
  args.forEach(arg => {
    if (typeof arg === 'string') {
      const i = arg.indexOf(':');
      let key = arg.substring(0, i).trim();
      const value = arg.substring(i + 1).trim();
      if (key.endsWith('?')) {
        key = key.substring(0, key.length - 1);
      } else {
        result.required.push(key);
      }
      result.properties[key] = {
        type: value
      }
    } else if (Array.isArray(arg)) {
      result.properties[arg[0]] = arg[1];
      if (arg[2]) result.required.push(arg[0]);
    }
  });
  return result;
}

module.exports = Validator;
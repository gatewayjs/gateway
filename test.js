var Ajv = require('ajv');
var ajv = new Ajv();
var schema = {
  "properties": {
      a: {
        type: 'number'
      },
      b: {
        type: 'number'
      }
  }
};

var validData = {
  a: 1,
  b:'2'
};
var valid = ajv.validate(schema, validData);
if(!valid) console.log(ajv.errors);
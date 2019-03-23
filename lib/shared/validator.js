const error = require('../utils/validator-error');
module.exports = function(target, property) {
  const controller = target.prototype[property];
  const path = target.__file__;
  const QueryStringValidator = Reflect.getMetadata('ValidatorQueryString', controller);
  const BodyValidator = Reflect.getMetadata('ValidatorBody', controller);
  const HeaderValidator = Reflect.getMetadata('ValidatorHeader', controller);
  return async (req, res, next) => {
    if (QueryStringValidator) error(property + ': @Validator.QueryString', QueryStringValidator(req.location.query), path);
    if (BodyValidator) error(property + ': @Validator.Body', BodyValidator(req.location.body), path);
    if (HeaderValidator) error(property + ': @Validator.Header', HeaderValidator(req.headers), path);
    await next();
  }
}
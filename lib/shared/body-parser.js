const Body = require('./body-middleware');
// from: https://github.com/koajs/bodyparser#options
module.exports = options => {
  const handler = Body(options);
  return async (ctx, next) => {
    await handler(ctx, next);
  }
}
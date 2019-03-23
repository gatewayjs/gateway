const { Public } = require('../../../');

@Public
class TextMiddleware {
  async middleware(req, res, next) {
    req.abc = 123;
    await next();
  }
}

module.exports = TextMiddleware;
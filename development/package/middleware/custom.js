const { Public } = require('../../../');

@Public
class TextMiddleware {
  async middleware(req, res, next) {
    req.state.custom = {
      abc: 123
    };
    await next();
  }
}

module.exports = TextMiddleware;
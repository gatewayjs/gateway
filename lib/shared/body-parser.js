const Body = require('./body-middleware');
// from: https://github.com/koajs/bodyparser#options
module.exports = class HttpBodyParser {
  constructor(options) {
    this.handler = Body(options);
  }

  async middleware(req, res, next) {
    await this.handler(req, res, next);
  }
}

module.exports.__is_middleware__ = true;
module.exports.__file__ = '@Http.Body';
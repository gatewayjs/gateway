const multer = require('multer');
const fs = require('fs');
// from https://github.com/expressjs/multer/blob/master/doc/README-zh-cn.md#multeropts
module.exports = class HttpBodyParser {
  constructor(options = {}) {
    options.dest = process.env.HOME;
    this.upload = multer(options);
  }

  async middleware(req, res, next) {
    await new Promise((resolve, reject) => {
      const any = this.upload.any();
      any(req, res, err => {
        if (err) return reject(err);
        resolve();
      })
    });
    if (!req.location.files) req.location.files = {};
    if (!req.location.body) req.location.body = {};
    if (req.files && req.files.length) {
      req.files.forEach(file => req.location.files[file.fieldname] = file);
      delete req.files;
    }
    if (req.body) {
      req.location.body = Object.assign(req.location.body, req.body);
      delete req.body;
    }
    await next();
  }
}

module.exports.__is_middleware__ = true;
module.exports.__file__ = '@Http.File';
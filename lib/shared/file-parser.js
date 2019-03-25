const multer = require('multer');
// from https://github.com/expressjs/multer/blob/master/doc/README-zh-cn.md#multeropts
module.exports = (options = { dest: process.env.HOME }) => {
  const upload = multer(options);
  return async (req, res, next) => {
    await new Promise((resolve, reject) => {
      const any = upload.any();
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
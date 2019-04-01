const multer = require('multer');
// from https://github.com/expressjs/multer/blob/master/doc/README-zh-cn.md#multeropts
module.exports = (options = { dest: process.env.HOME }) => {
  const upload = multer(options);
  return async (ctx, next) => {
    const { req, res } = ctx;
    await new Promise((resolve, reject) => {
      const any = upload.any();
      any(req, res, err => {
        if (err) return reject(err);
        resolve();
      })
    });
    if (!ctx.location.files) ctx.location.files = {};
    if (!ctx.location.body) ctx.location.body = {};
    if (req.files && req.files.length) {
      req.files.forEach(file => ctx.location.files[file.fieldname] = file);
      delete req.files;
    }
    if (req.body) {
      ctx.location.body = Object.assign(ctx.location.body, req.body);
      delete req.body;
    }
    await next();
  }
}
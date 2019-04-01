const statuses = require('statuses');
const Stream = require('stream');
const fastJson = require('fast-json-stringify');
module.exports = ctx => {
  const { schema, req, res } = ctx;
  let body = ctx.body;
  const code = ctx.status;
  if (statuses.empty[code]) {
    ctx.body = null;
    return res.end();
  }
  if ('HEAD' == req.method) {
    if (!res.headersSent && isJSON(body)) {
      res.setHeader('Content-Length', Buffer.byteLength(JSON.stringify(body)));
    }
    return res.end();
  }
  if (null == body || undefined == body) {
    if (req.httpVersionMajor >= 2) {
      body = String(code);
    } else {
      body = ctx.message || String(code);
    }
    if (!res.headersSent) {
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('Content-Length', Buffer.byteLength(statuses[code]));
    }
    return res.end(body);
  }
  if (Buffer.isBuffer(body)) return res.end(body);
  if ('string' == typeof body) return res.end(body);
  if (body instanceof Stream) return body.pipe(res);
  if (schema) {
    body = fastJson(schema)(body);
  } else {
    body = JSON.stringify(body);
  }
  if (!res.headersSent) {
    res.setHeader('Content-Length', Buffer.byteLength(body));
    res.setHeader('Content-Type', 'application/json');
  }
  res.end(body);
}

function isJSON(body) {
  if (!body) return false;
  if ('string' == typeof body) return false;
  if ('function' == typeof body.pipe) return false;
  if (Buffer.isBuffer(body)) return false;
  return true;
}
const Url = require('url');
const Emitter = require('./events');
const Cookies = require('cookies');
const statuses = require('statuses');

module.exports = class ServerRequestContext extends Emitter {
  constructor(app, req, res) {
    super();
    this.app = app;
    this.req = req;
    this.res = res;
    this.location = Url.parse(req.url, true);
    this.state = {};
    this._statusCode = 404;
    this.schema = null;
    this._stacks = [];
    this.socket = req.socket;
    if (this.socket.encrypted) {
      this.protocol = 'https';
    } else {
      const proto = this.get('X-Forwarded-Proto');
      this.protocol = proto ? proto.split(/\s*,\s*/, 1)[0] : 'http';
    }
    this.cookies = new Cookies(req, res, {
      keys: this.app.$cookieKeys,
      secure: 'https' == this.protocol
    });
    this.on('reject', async () => await this.rollback());
    Object.defineProperty(this, 'status', {
      get: () => {
        return this._statusCode;
      },
      set(code) {
        this._statusCode = code;
        res.statusCode = code;
      }
    });
  }

  redirect(url, alt) {
    // location
    if ('back' == url) url = this.get('Referrer') || alt || '/';
    this.set('Location', url);

    // status
    if (!statuses.redirect[this.status]) this.status = 302;

    // text
    this.set('Content-Type', 'text/plain; charset=utf-8');
    this.body = `Redirecting to ${url}.`;
  }

  set(field, val) {
    if (this.headerSent) return;

    if (2 == arguments.length) {
      if (Array.isArray(val)) val = val.map(v => typeof v === 'string' ? v : String(v));
      else if (typeof val !== 'string') val = String(val);
      this.res.setHeader(field, val);
    } else {
      for (const key in field) {
        this.set(key, field[key]);
      }
    }
  }

  get(field) {
    const req = this.req;
    switch (field = field.toLowerCase()) {
      case 'referer':
      case 'referrer': return req.headers.referrer || req.headers.referer || '';
      default: return req.headers[field] || '';
    }
  }

  catch(fn) {
    this._stacks.push(fn);
    return this;
  }

  async rollback() {
    let i = this._stacks.length;
    while (i--) {
      await this._stacks[i]();
    }
  }
}
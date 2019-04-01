const Url = require('url');
const Emitter = require('./events');

module.exports = class ServerRequestContext extends Emitter {
  constructor(req, res) {
    super();
    this.req = req;
    this.res = res;
    this.location = Url.parse(req.url, true);
    this.state = {};
    this._statusCode = 404;
    this.schema = null;
    this._stacks = [];
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
const Url = require('url');
const Emitter = require('./events');

module.exports = class ServerRequestContext extends Emitter {
  constructor(req, res) {
    super();
    this.req = req;
    this.res = res;
    this.location = Url.parse(req.url, true);
    this.state = {};
    this.status = 404;
    this.schema = null;
    this._stacks = [];
    this.on('reject', async () => await this.rollback());
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
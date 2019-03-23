const Message  = require('./message');
const Factory = require('./shared/factory');
const Router = require('./shared/router');
const http = require('http');
const Port = require('./utils/port');
const Plugins = require('./shared/plugins');
module.exports = class Worker extends Message {
  constructor(options = {}) {
    super();
    this.$options = options;
    this.$factory = new Factory(this);
    this.$router = new Router();
    this.$plugins = new Plugins(this);
    process.on('message', (message, socket) => {
      switch (message.event) {
        case 'unregister': this.unRegister(message.data); break;
        case 'sticky:balance': this.resumeConnection(socket); break;
      }
    });
  }

  async create() {
    const port = await Port();
    await this.connect(this.$options.gateway);
    await this.$plugins.install(this.$factory);
    this.$factory.addPackage(this.$options.cwd);
    this.$factory.bootstrap_worker();
    this.$factory.service();
    this.$factory.midddleware();
    this.$factory.decorate();
    this.$factory.controller();
    await this.$factory.compile();
    await this.emit('connect');
    this.$app = http.createServer((req, res) => this.$router.lookup(req, res));
    await this.emit('create');
    const message = await new Promise((resolve, reject) => {
      this.$app.listen(port, err => {
        if (err) return reject(err);
        resolve(`http://127.0.0.1:${port}`);
      })
    });
    await this.emit('start');
    return message;
  }

  async destroy() {
    await this.emit('disconnect');
    await this.disconnect();
    await this.emit('close');
    if (this.$app) this.$app.close();
    await this.emit('end');
  }

  resumeConnection(socket) {
    if (socket && this.$app) {
      this.$app.emit('connection', socket);
      socket.resume();
    }
  }
}
const Message  = require('./message');
const Factory = require('./shared/factory');
const Router = require('./shared/router');
const http = require('http');
const Plugins = require('./shared/plugins');
const IO = require('socket.io');
module.exports = class Worker extends Message {
  constructor(options = {}) {
    super();
    this.$options = options;
    this.$factory = new Factory(this);
    this.$router = new Router(this);
    this.$plugins = new Plugins(this);
    this.$cookieKeys = ['GateWay'];
    process.on('message', (message, socket) => {
      switch (message.event) {
        case 'unregister': this.unRegister(message.data); break;
        case 'sticky:balance': this.resumeConnection(socket); break;
      }
    });
  }

  async create() {
    const t = Date.now();
    await this.connect(this.$options.gateway);
    await this.$plugins.install(this.$factory);
    this.$factory.addPackage(this.$options.cwd);
    this.$factory.bootstrap_worker();
    this.$factory.websocket();
    this.$factory.service();
    this.$factory.middleware();
    this.$factory.decorate();
    this.$factory.controller();
    await this.$factory.compile();
    await this.emit('connect');
    this.$app = http.createServer((req, res) => this.$router.lookup(req, res));
    await this.emit('beforeCreate');
    const port = this.$options.socket ? Number(this.$options.socket) : Number(this.$options.port);
    if (this.$options.socket) {
      this.$io = IO(this.$app);
      this.$factory.initWebsocket(this.$io);
    }
    const message = await new Promise((resolve, reject) => {
      this.$app.listen(port, err => {
        if (err) return reject(err);
        resolve({
          port, 
          pid: process.pid, 
          time: Date.now() - t
        });
      })
    });
    await this.emit('created');
    return message;
  }

  async destroy() {
    await this.emit('disconnect');
    await this.disconnect();
    if (this.$io) this.$io.close();
    await this.emit('beforeDestroy');
    if (this.$app) this.$app.close();
    await this.emit('destroyed');
  }

  resumeConnection(socket) {
    if (socket && this.$app) {
      this.$app.emit('connection', socket);
      socket.resume();
    }
  }
}
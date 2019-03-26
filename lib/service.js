const tcpServer = require('./utils/tcp-server');
const Message = require('./message');
module.exports = class Service extends Message {
  constructor(options = {}) {
    super();
    this.$options = options;
  }

  async create() {
    await this.createSocket();
    const service = require(this.$options.service);
    this.$app = new service(this);
    this.$app.$app = this;
    if (this.$app.create) await this.$app.create();
    return {
      port: this.$server.port
    };
  }

  async destroy() {
    if (this.$client) await this.disconnect();
    if (this.$server) this.$server.close();
    if (this.$app && this.$app.destroy) await this.$app.destroy();
  }

  async createSocket() {
    if (!this.$options.gateway) throw new Error('miss gateway port');
    this.$client = await this.connect(this.$options.gateway);
    this.$server = await tcpServer(async (event, data, extra) => await this.onMessage(event, data, extra));
  }

  async onMessage(event, data, extra) {
    if (['create', 'destroy'].indexOf(event) > -1) throw new Error('you can not use ' + event);
    if (event === 'unregister') {
      this.unRegister(data);
      return true;
    }
    if (!this.$app[event]) throw new Error('can not find event of ' + event);
    return await this.$app[event](data, extra);
  }
}
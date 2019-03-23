const path = require('path');
const tcpClient = require('./utils/tcp-client');
const tcpServer = require('./utils/tcp-server');
const Factory = require('./shared/factory');
const Plugins = require('./shared/plugins');
const Emitter = require('./shared/events');
const serviceFile = path.resolve(__dirname, './service.js');
const CUSTOM_TIME = 3 * 60 * 1000;

module.exports = class GateWay extends Emitter {
  constructor(options = {}) {
    super();
    this.$options = options;
    this.$service = {};
    this.$factory = new Factory(this);
    this.$plugins = new Plugins(this);
  }

  async create() {
    const timeStart = Date.now();
    this.$server = await tcpServer((event, data, socket) => this.onMessage(event, data, socket));
    await this.$plugins.install(this.$factory);
    this.$factory.addPackage(this.$options.cwd);
    this.$factory.decorate();
    this.$factory.micro_service();
    this.$factory.bootstrap_gateway();
    await this.$factory.compile();
    await this.emit('create');
    return {
      timeStart,
      timeEnd: Date.now(),
      port: this.$server.port
    }
  }

  async destroy() {
    await this.emit('close');
    for (const i in this.$service) clearInterval(this.$service[i].timer);
    if (this.$server) {
      this.$server.close();
    }
    await this.emit('end');
  }

  async onMessage(event, data) {
    switch (event) {
      case 'tcp:heart': return this.Hearts();
      case 'tcp:agent': return this.Agent(data);
      case 'tcp:create': return await this.createService(data);
      case 'tcp:kill': return await this.unRegister(data);
    }
  }

  async createService(data = {}) {
    if (!data.name || !data.file) throw new Error('miss name or file');
    if (!data.args) data.args = {};
    const args = [];
    for (const i in data.args) args.push(`--${i}=${data.args[i]}`);
    const client = await this.register(data.name, data.file, ...args);
    return client.port;
  }

  Hearts() {
    const result = {};
    for (const i in this.$service) {
      const client = this.$service[i];
      const lastCheckTime = client.lastCheckTime;
      const status = checkStatusByTimeStamp(lastCheckTime);
      result[i] = {
        lastCheckTime, status,
        port: client.port
      }
    }
    return result;
  }

  Agent(name) {
    if (this.$service[name]) {
      return {
        lastCheckTime: this.$service[name].lastCheckTime,
        status: checkStatusByTimeStamp(this.$service[name].lastCheckTime),
        port: this.$service[name].port
      }
    }
  }

  async register(name, file, ...args) {
    if (!this.$server) throw new Error('GateWay is not ready');
    args.push('--service=' + file, '--gateway=' + this.$server.port, '--name=' + name);
    const { port } = await this.CREATE_AGENT(this.$options.cwd, name, serviceFile, ...args);
    const client = await tcpClient(port);
    client.port = port;
    this.$service[name] = client;
    client.timer = setInterval(() => client.send('tcp:alive'), CUSTOM_TIME);
    client.lastCheckTime = Date.now();
    client.on('data', data => {
      data = data.toString();
      if (data.indexOf('tcp:alive') === 0) {
        client.lastCheckTime = Number(data.substring('tcp:alive'.length + 1));
      }
    });
    return client;
  }

  async unRegister(name) {
    if (this.$service[name]) {
      clearInterval(this.$service[name].timer);
      await tcpClient.close(this.$service[name]);
      await this.SIGKILL(name);
      delete this.$service[name];
      process.send({
        event: 'unregister',
        data: name
      });
      await Promise.all(Object.values(this.$service).map(client => client.send('unregister', name)));
      return true;
    }
  }
}

function checkStatusByTimeStamp(lastCheckTime) {
  return Date.now() > (lastCheckTime + CUSTOM_TIME + 2000) ? false : true;
}
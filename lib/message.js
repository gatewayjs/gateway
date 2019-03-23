const Emitter = require('./shared/events');
const tcpClient = require('./utils/tcp-client');
const randomstring = require("randomstring");
const CUSTOM_TIMEOUT = 20 * 1000;
module.exports = class Message extends Emitter {
  constructor() {
    super();
    this.$id = 1;
    this.$callbacks = {};
    this.$timer = {};
    this.$agents = {};
  }

  $heartbeats() {
    if (!this.$gateway) throw new Error('GateWay is not ready');
    return this.fetch(this.$gateway, 'tcp:heart');
  }

  $discover(name) {
    if (!this.$gateway) throw new Error('GateWay is not ready');
    return this.fetch(this.$gateway, 'tcp:agent', name);
  }

  $link(name, file, options = {}) {
    if (!this.$gateway) throw new Error('GateWay is not ready');
    return this.fetch(this.$gateway, 'tcp:create', {
      name, file, args: options
    });
  }

  $unlink(name) {
    if (!this.$gateway) throw new Error('GateWay is not ready');
    return this.fetch(this.$gateway, 'tcp:kill', name);
  }

  unRegister(name) {
    if (this.$agents[name]) {
      delete this.$agents[name];
    }
  }

  fetch(target, event, data = null) {
    return new Promise((resolve, reject) => {
      const id = this.$id++;
      const callback = (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
      this.$callbacks[id] = callback;
      const timer = setTimeout(() => {
        delete this.$callbacks[id];
        delete this.$timer[id];
        reject(new Error('tcp fetch timeout'));
      }, CUSTOM_TIMEOUT);
      this.$timer[id] = timer;
      target.send(JSON.stringify({
        event, data,
        __TCP_CALLBACK_ID__: id
      }));
    });
  }

  async send(target, event, data) {
    if (typeof target === 'string') target = await this.getConnection(target);
    return await this.fetch(target, event, data);
  }

  async getConnection(target) {
    if (this.$agents[target]) return this.$agents[target];
    if (!this.$gateway) throw new Error('GateWay is not ready');
    const result = await this.fetch(this.$gateway, 'tcp:agent', target);
    if (!result) throw new Error(target + ' is a invaild agent service.');
    if (!result.status) throw new Error(target + ' is been shutdown.');
    const client = await tcpClient(result.port);
    client.on('data', data => this.onMessage(data));
    this.$agents[target] = client;
    return client;
  }

  async watch(service, event, data, callback) {
    const client = await this.getConnection(service);
    const str = randomstring.generate();
    const listener = (_data) => {
      if (!_data) return;
      let data = _data.toString();
      if (!data) return;
      data = JSON.parse(data);
      if (str !== data.__TCP_WATCH_SCHEMA__) return;
      if (typeof data.error === 'string') data.error = new Error(data.error);
      callback && callback(data.error, data.data);
    }
    client.on('data', listener);
    client.send(JSON.stringify({
      event, __TCP_WATCH_SCHEMA__: str, data
    }))
    return () => client.off('data', listener);
  }

  async connect(port) {
    this.$gateway = await tcpClient(port);
    this.$gateway.on('data', data => this.onMessage(data));
    return this.$gateway;
  }

  async disconnect() {
    await Promise.all(Object.values(this.$agents).map(target => tcpClient.close(target)));
    await tcpClient.close(this.$gateway);
  }

  onMessage(_data) {
    if (!_data) return;
    let data = _data.toString();
    if (!data) return;
    data = JSON.parse(data);
    const id = data.__TCP_CALLBACK_ID__;
    if (!id) return;
    const callback = this.$callbacks[id];
    if (!callback) return;
    delete this.$callbacks[id];
      clearTimeout(this.$timer[id]);
      delete this.$timer[id];
      if (data.error) {
        callback(new Error(data.error));
      } else {
        callback(null, data.data);
      }
  }
}
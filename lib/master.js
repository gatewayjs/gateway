const os = require('os');
const net = require('net');
const path = require('path');
const Processer = require('./processer');
const stickyBalance = require('./utils/sticky-blalance');
const gatewayRuntimeFile = path.resolve(__dirname, './gateway.js');
const workerRuntimeFile = path.resolve(__dirname, './worker.js');

module.exports = class MasterService extends Processer {
  constructor(options = {}) {
    super();
    this.$options = options;
  }

  async create() {
    if (this.$options.socket) await this.createSocketInterceptor();
    const { timeStart, timeEnd, port } = await this.CREATE_AGENT(this.$options.cwd, 'GATEWAY', gatewayRuntimeFile);
    if (this.SYS_AGENTS.GATEWAY) {
      this.SYS_AGENTS.GATEWAY.process.on('message', message => {
        switch (message.event) {
          case 'unregister': this.unRegisterNotify(message.data); break;
        }
      });
    }
    this.debug('GateWay tcp:', port, (timeEnd - timeStart) + 'ms');
    const data = await this.CREATE_WORKER(
      this.$options.cwd, 
      this.$options.max || os.cpus().length, 
      workerRuntimeFile, 
      '--gateway=' + port,
      '--framework=' + this.$options.framework
    );
    this.debug('Worker Data', data);
    console.log(`\nSuccess: ${this.$options.port || 3000}\n`);
    data.forEach((s, i) => console.info('', '(' + (i + 1) + '.\t', s));
    console.log('\n');
  }

  async destroy() {
    if (this.$masterNet) {
      this.$masterNet.close();
    }
  }

  unRegisterNotify(data) {
    this.SYS_WORKERS.forEach(worker => worker.process.send({
      event: 'unregister',
      data
    }));
  }

  createSocketInterceptor() {
    return new Promise((resolve, reject) => {
      this.$masterNet = net.createServer({ pauseOnConnect: true }, socket => {
        if (!socket.remoteAddress) return socket.close();
        const hash = stickyBalance(socket.remoteAddress.replace(/(\d+\.\d+\.\d+\.\d+)/, '$1'));
        const worker = this.SYS_WORKERS[hash % this.SYS_WORKERS.length];
        if (!worker) return;
        worker.process.send({ event: 'sticky:balance' }, socket);
      });
      this.$masterNet.listen(this.$options.port || 3000, err => {
        if (err) return reject(err);
        resolve();
      })
    });
  }
}
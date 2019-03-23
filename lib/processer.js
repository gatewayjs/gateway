const path = require('path');
const cluster = require('cluster');
const childProcess = require('child_process');
const Debug = require('debug');
const agentFile = path.resolve(__dirname, './agent.js');
const CUSTOM_TIME = 10;

/**
 * 自定义进程守护类
 * 主要用于守护进程的启动与关闭
 * @life create {async function} 进程创建生命周期
 * @life destroy {async function} 进程销毁生命周期
 * @method INIT {function} 创建初始化
 * @constructor {isAgent?: boolean} 是否是agent类型
 */
module.exports = class Processor {
  constructor(isAgent, name) {
    // 系统workers启动守护列表
    this.SYS_WORKERS = [];
    // 系统agents启动守护列表
    this.SYS_AGENTS = {};
    // 关闭过程状态码
    this.SYS_CLOSING = 0;
    // 错误列表
    this.SYS_ERRORS = [];
    // 只有master和agent进程才为true
    this.SYS_IS_MASTER = cluster.isMaster;
    // 强制退出，主要用户worker进程
    this.FORCE_KILL = false;
    /**
     * agent: 辅助进程
     * worker: 子进程
     * false: 主进程
     */
    this.SYS_CHILD = cluster.isWorker 
      ? 'worker' 
      : (isAgent ? 'agent' : false);

    if (this.SYS_IS_MASTER && this.SYS_CHILD === 'worker') {
      throw new Error('you can not set ismaster=true and child=worker');
    }
    
    this.debug = Debug('PROCESSER:' + (this.IS_AGENT ? ('AGENT:' + (name || 'GATEWAY')) : (this.SYS_IS_MASTER ? 'MASTER' : 'WORKER:' + process.pid)));
    this.SYS_TIMER = setInterval(() => {}, 24 * 60 * 60 * 1000);

    process.on('SIGTERM', () => this.kill());
    process.on('SIGINT', () => this.kill());
    process.on('SIGQUIT', () => this.kill());
    process.on('message', (message, socket) => {
      const Method = 'ipc:' + message.event;
      if (this[Method]) {
        this[Method]({
          data: message.data,
          error: message.error,
        }, socket);
      }
    });
  }

  // 当前进程是否为真正的agent进程
  get IS_AGENT() {
    return this.SYS_IS_MASTER && this.SYS_CHILD === 'agent';
  }

  ['ipc:teardown'](data = {}) {
    if (data.type === 'SIGKILL') this.SYS_SIGKILL = true;
    this.SYS_WORKERS.forEach(worker => {
      worker.status === 0 && process.kill(worker.process.process.pid, 'SIGTERM');
    });
    for (const i in this.SYS_AGENTS) {
      this.SYS_AGENTS[i].status === 0 && process.kill(this.SYS_AGENTS[i].process.pid, 'SIGTERM');
    }
    this.CLOSE(data.error);
    if (this.SYS_SIGKILL) return;
    if (['agent', 'worker'].indexOf(this.SYS_CHILD) > -1) {
      process.send({
        event: 'teardown',
        error: data.error
      });
    }
  }

  ['ipc:close']() {
    this.SYS_CLOSING++;
  }

  ['ipc:kill']() {
    this.kill({ type: 'SIGKILL' });
  }

  kill(data) {
    this.FORCE_KILL = true;
    this['ipc:teardown'](data);
  }

  async SIGKILL(name) {
    if (this.SYS_AGENTS[name]) {
      const Agent = this.SYS_AGENTS[name].process;
      await new Promise((resolve, reject) => {
        Agent.send({ event: 'kill' });
        Agent.on('message', message => {
          if (message.event === 'SIGKILLED') {
            if (message.error.length) return reject(new Error(message.error.join('\n')));
            resolve();
          }
        });
      });
      delete this.SYS_AGENTS[name];
    }
  }

  INIT() {
    if (this.SYS_IS_MASTER) {
      if (this.IS_AGENT) {
        this.create()
          .then(data => process.send({ event: 'ready', data }))
          .catch(e => process.send({ event: 'ready', error: e.message }));
      } else {
        this.create().catch(() => this.kill());;
      }
    } else {
      this.create()
        .then(data => process.send({ event: 'ready', data }))
        .catch(e => process.send({ event: 'ready', error: e.message }));
    }
  }

  registerAgent(name, target) {
    const component = {};
    component.status = 0;
    component.process = target;
    target.on('close', () => component.status = 2);
    const teardownListener = ({ event, error }) => {
      if (event === 'teardown') {
        this.kill({ error });
        target.off('message', teardownListener);
      }
    }
    target.on('message', teardownListener);
    this.SYS_AGENTS[name] = component;
    return this;
  }

  registerWorker(target) {
    const component = {};
    component.status = 0;
    component.process = target;
    target.component = component;
    this.SYS_WORKERS.push(component);
  }

  CLOSE(error) {
    if (error && this.SYS_ERRORS.indexOf(error) === -1) {
      this.SYS_ERRORS.push(error);
    }
    if (this.SYS_CLOSING !== 0) return;
    this.SYS_CLOSING++; // 1
    if (this.SYS_SIGKILL) this.SYS_CLOSING++;
    this.debug('prepare closing');
    const timer = setInterval(() => {
      if (this.SYS_IS_MASTER) {
        switch (this.SYS_CLOSING) {
          case 1: !this.IS_AGENT && this.CLOSE_WORKERS(); break;
          case 2:  this.IS_AGENT && this.CLOSE_WORKERS(); break;
          case 3: !this.IS_AGENT && this.CLOSE_AGENTS();  break;
          case 4:  this.IS_AGENT && this.CLOSE_AGENTS();  break;
          case 5: !this.IS_AGENT && this.CLOSING(timer);  break;
          case 6:  this.IS_AGENT && this.CLOSING(timer);  break;
        }
      } else if (this.SYS_CLOSING === 2) {
        this.CLOSING(timer);
      }
    }, CUSTOM_TIME);
  }

  CLOSE_TIMER(...args) {
    args.forEach(arg => clearInterval(arg));
  }

  CLOSE_AGENTS() {
    this.SYS_CLOSING++; // 4
    this.debug('closing agents');
    if (!Object.keys(this.SYS_AGENTS).length) return this.SYS_CLOSING++;
    const timer = setInterval(() => {
      for (const agent in this.SYS_AGENTS) {
        if (this.SYS_AGENTS[agent].status !== 2) return;
        clearInterval(timer);
        this.SYS_CLOSING++; // 5
        this.debug('closed agents');
      }
    }, CUSTOM_TIME);
    for (const agent in this.SYS_AGENTS) {
      this.SYS_AGENTS[agent].status = 1;
      this.SYS_AGENTS[agent].process.send({ event: 'close' });
    }
  }

  CLOSE_WORKERS() {
    this.SYS_CLOSING++; // 2
    this.debug('closing workers');
    if (!this.SYS_WORKERS.length) return this.SYS_CLOSING++;
    const timer = setInterval(() => {
      for (let i = 0; i < this.SYS_WORKERS.length; i++) {
        const worker = this.SYS_WORKERS[i];
        if (worker.status !== 2) return;
      }
      clearInterval(timer);
      this.SYS_CLOSING++; // 3
      this.debug('closed workers');
    }, CUSTOM_TIME);
    for (let j = 0; j < this.SYS_WORKERS.length; j++) {
      const worker = this.SYS_WORKERS[j];
      worker.status = 1;
      worker.process.send({ event: 'close' });
    }
  }

  CLOSING(...timer) {
    this.SYS_CLOSING++;
    this.debug('closing self');
    if (!this.destroy) {
      this.CLOSE_TIMER(this.SYS_TIMER, ...timer);
      this.CLOSE_WITH_ERROR();
      this.CLOSE_WITH_MASTER();
      return process.exit(0);
    }
    this.destroy()
    .then(() => this.CLOSE_TIMER(this.SYS_TIMER, ...timer))
    .catch(e => this.SYS_ERRORS.push(e.message))
    .then(() => this.CLOSE_WITH_ERROR())
    .then(() => {
      this.CLOSE_WITH_MASTER();
      this.debug('closed');
      process.exit(0);
    });
  }

  CLOSE_WITH_ERROR() {
    if (this.SYS_SIGKILL) {
      process.send({
        event: 'SIGKILLED',
        error: this.SYS_ERRORS
      });
    } else {
      if (this.SYS_IS_MASTER && !this.SYS_CHILD) {
        if (this.SYS_ERRORS.length) {
          console.info('\nErrors:\n');
          this.SYS_ERRORS.forEach((err, index) => console.error('', '(' + (index + 1) + '.\t', err));
          console.info('\n');
        }
      }
    }
  }

  CLOSE_WITH_MASTER() {
    if (this.SYS_IS_MASTER && !this.SYS_CHILD) {
      this.debug('all closed, exit with code 0');
    }
  }

  CREATE_AGENT(cwd, name, exec_file, ..._args) {
    const opts = {
      cwd: cwd || process.cwd(),
      env: Object.create(process.env),
      stdio: 'inherit',
      execArgv: process.execArgv.slice(0)
    };
    const args = [
      '--cwd=' + opts.cwd,
      '--env=' + (opts.env.NODE_ENV || 'production'),
      '--script=' + exec_file,
      ..._args
    ];
    const agent = childProcess.fork(agentFile, args, opts);
    this.registerAgent(name, agent);
    const listener = ({ event, data, error }) => {
      if (event === 'ready') {
        agent.off('message', listener);
        if (error) return agent.reject(new Error(error));
        agent.resolve(data);
      }
    }
    agent.on('message', listener);
    return new Promise((resolve, reject) => {
      agent.resolve = resolve;
      agent.reject = reject;
    });
  }

  CREATE_WORKER(cwd, n, exec_file, ..._args) {
    let x = 0, y = 0;
    const datas = [];
    const errors = [];
    const opts = {
      cwd: cwd || process.cwd(),
      exec: agentFile,
      stdio: 'inherit',
      env: Object.create(process.env),
      execArgv: process.execArgv.slice(0)
    };
    opts.args = [
      '--cwd=' + cwd,
      '--env=' + (opts.env.NODE_ENV || 'production'),
      '--script=' + exec_file,
      ..._args
    ];

    cluster.setupMaster(opts);
    
    for (let i = 0; i < n; i++) cluster.fork();

    const listener = (worker, message, socket) => {
      if (message.event === 'ready') {
        if (!message.error) x++;
        if (message.data) datas.push(message.data);
        if (message.error) errors.push(message.error);
        y++;
      } else if (message.event === 'teardown') {
        this.kill(message);
      }
    }

    cluster
      .on('fork', worker => this.registerWorker(worker))
      .on('message', listener)
      .on('exit', worker => {
        if (!this.FORCE_KILL) {
          const index = this.SYS_WORKERS.indexOf(worker.component);
          if (index > -1) {
            this.SYS_WORKERS.splice(index, 1);
          }
          this.CREATE_WORKER(cwd, 1, exec_file, _args);
        } else {
          worker.component.status = 2;
        }
      });

    return new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        if (y === n) {
          clearInterval(timer);
          cluster.off('message', listener);
          cluster.on('message', (worker, message) => {
            if (message.event === 'teardown') {
              this.kill(message);
            }
          });
          if (x < y) {
            errors.forEach(error => {
              if (error && this.SYS_ERRORS.indexOf(error) === -1) {
                this.SYS_ERRORS.push(error);
              }
            })
            return reject();
          }
          resolve(datas);
        }
      }, CUSTOM_TIME);
    })
  }
}
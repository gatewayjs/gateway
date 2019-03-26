const Compiler = require('./compiler');
const isClass = require('is-class');
const { Interface, Decorate } = require('../../index');
const ControllerMatter = require('./controller');
module.exports = class Factory extends Compiler {
  constructor(app) {
    super();
    this.app = app;
    this.decorateCallbacks = {};
    this.rooms = {};
  }

  micro_service() {
    this.addCompiler({
      match: 'package/micro/**/*.js',
      handler: async file => {
        const target = require(file);
        const $plugin = this.app.$plugins.get(name);
        target.__file__ = file;
        target.__is_micro_service__ = true;
        target.$plugin = $plugin;
        if (!isClass(target)) throw new Error('Micro service required a class object. file: ' + file);
        if (!target.name) throw new Error('Micro service must have a name. file: ' + file);
        await this.app.register(target.name, file);
      }
    });
  }

  bootstrap_worker() {
    this.addCompiler({
      match: 'bootstrap/worker.js',
      handler: async (file, name, cwd) => {
        const plugin = this.app.$plugins.get(name);
        const target = require(file);
        target.__file__ = file;
        plugin.$name = name;
        plugin.$file = file;
        plugin.$cwd = cwd;
        await target(plugin);
      }
    });
  }

  bootstrap_gateway() {
    this.addCompiler({
      match: 'bootstrap/gateway.js',
      handler: async (file, name, cwd) => {
        const plugin = this.app.$plugins.get(name);
        const target = require(file);
        target.__file__ = file;
        plugin.$name = name;
        plugin.$file = file;
        plugin.$cwd = cwd;
        await target(plugin);
      }
    })
  }

  websocket() {
    this.addCompiler({
      match: 'package/websocket/**/*.js',
      handler: (file, name) => {
        const target = require(file);
        const $plugin = this.app.$plugins.get(name);
        target.__file__ = file;
        target.$plugin = $plugin;
        if (!isClass(target)) throw new Error('Websocket must be a class. file: ' + file);
        const room = Reflect.getMetadata('WebsocketRoom', target);
        this.rooms[room] = {
          events: [],
          target: target,
          $plugin: $plugin
        };
        const properties = Object.getOwnPropertyNames(target.prototype);
        properties.forEach(property => {
          if (property === 'constructor') return;
          if (property === 'connect') return;
          const event = Reflect.getMetadata('WebsocketEvent', target.prototype[property]);
          if (event) this.rooms[room].events.push(event);
        });
      }
    });
  }

  initWebsocket(io) {
    for (const room in this.rooms) {
      const socketRoom = io.of(room);
      const socketTarget = this.rooms[room];
      socketRoom.on('connection', socket => {
        const target = new socketTarget.target(socketTarget.$plugin);
        target.$plugin = socketTarget.$plugin;
        if (target.connect) target.connect(socket);
        socketTarget.events.forEach(event => {
          if (typeof target[event] === 'function') {
            socket.on(event, data => target[event](socket, data));
          }
        })
      });
    }
  }

  decorate() {
    this.addCompiler({
      match: 'package/decorate/**/*.js',
      handler: (file, name) => {
        const target = require(file);
        const $plugin = this.app.$plugins.get(name);
        target.__file__ = file;
        target.$plugin = $plugin;
        if (!isClass(target)) throw new Error('Middleware must be a class. file: ' + file);
        if (!(target instanceof Decorate)) throw new Error('Custom decorate must instanceof `Decorate`. file: ' + file);
        if (!target.name) throw new Error('Decorate must have a name. file: ' + file);
        const decorate = new target($plugin);
        decorate.$plugin = $plugin;
        decorate.name = target.name;
        if (typeof decorate.interfaceWillInject === 'function') {
          Interface[target.name] = decorate.interfaceWillInject.bind(decorate);
        }
        if (typeof decorate.interfaceDidRendered === 'function') {
          this.decorateCallbacks.push(decorate.interfaceDidRendered.bind(decorate));
        }
      }
    });
  }

  service() {
    this.addCompiler({
      match: 'package/service/**/*.js',
      handler: (file, name) => {
        const target = require(file);
        target.__file__ = file;
        target.__is_service__ = true;
        const $plugin = this.app.$plugins.get(name);
        target.$plugin = $plugin;
        if (!isClass(target)) throw new Error('Service must be a class. file: ' + file);
        const isPublic = Reflect.getMetadata('Public', target);
        if (isPublic) {
          if (!target.name) throw new Error('Public Service must have a name. file: ' + file);
          Interface.Services[target.name] = target;
        }
      }
    });
  }

  controller() {
    this.addCompiler({
      match: 'package/controller/**/*.js',
      handler: (file, name) => {
        const target = require(file);
        const $plugin = this.app.$plugins.get(name);
        target.__file__ = file;
        target.__is_controller__ = true;
        target.$plugin = $plugin;
        if (!isClass(target)) throw new Error('Controller must be a class. file: ' + file);
        ControllerMatter($plugin, this.app, target, this.decorateCallbacks);
      }
    });
  }
}
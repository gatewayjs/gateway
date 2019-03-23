const Compiler = require('./compiler');
const isClass = require('is-class');
const { Interface, Decorate } = require('../../index');
const Plugin = require('./plugin');
const ControllerMatter = require('./controller');
module.exports = class Factory extends Compiler {
  constructor(app) {
    super();
    this.app = app;
    this.decorateCallbacks = {};
  }

  micro_service() {
    this.addCompiler({
      match: 'package/micro/**/*.js',
      handler: async file => {
        const target = require(file);
        // const $plugin = this.app.$plugins.childrens[name];
        target.__file__ = file;
        target.__is_micro_service__ = true;
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
        const plugin = new Plugin(this.app, this.app.$plugins.configs[name]);
        const target = require(file);
        target.__file__ = file;
        plugin.$name = name;
        plugin.$file = file;
        plugin.$cwd = cwd;
        this.app.$plugins.childrens[name] = plugin;
        await target(plugin);
      }
    });
  }

  bootstrap_gateway() {
    this.addCompiler({
      match: 'bootstrap/gagteway.js',
      handler: async (file, name, cwd) => {
        const plugin = new Plugin(this.app, this.app.$plugins.configs[name]);
        const target = require(file);
        target.__file__ = file;
        plugin.$name = name;
        plugin.$file = file;
        plugin.$cwd = cwd;
        this.app.$plugins.childrens[name] = plugin;
        await target(plugin);
      }
    })
  }

  decorate() {
    this.addCompiler({
      match: 'package/decorate/**/*.js',
      handler: (file, name) => {
        const target = require(file);
        const $plugin = this.app.$plugins.childrens[name];
        target.__file__ = file;
        if (!isClass(target)) throw new Error('Middleware must be a class. file: ' + file);
        if (!(target instanceof Decorate)) throw new Error('Custom decorate must instanceof `Decorate`. file: ' + file);
        if (!target.name) throw new Error('Decorate must have a name. file: ' + file);
        const decorate = new target($plugin);
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

  midddleware() {
    this.addCompiler({
      match: 'package/middleware/**/*.js',
      handler: file => {
        const target = require(file);
        target.__file__ = file;
        target.__is_middleware__ = true;
        if (!isClass(target)) throw new Error('Middleware must be a class. file: ' + file);
        const isPublic = Reflect.getMetadata('Public', target);
        if (isPublic) {
          if (!target.name) throw new Error('Public Middleware must have a name. file: ' + file);
          Interface.Middlewares[target.name] = target;
        }
      }
    });
  }

  service() {
    this.addCompiler({
      match: 'package/service/**/*.js',
      handler: file => {
        const target = require(file);
        target.__file__ = file;
        target.__is_service__ = true;
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
        const $plugin = this.app.$plugins.childrens[name];
        target.__file__ = file;
        target.__is_controller__ = true;
        if (!isClass(target)) throw new Error('Controller must be a class. file: ' + file);
        ControllerMatter($plugin, this.app, target, this.decorateCallbacks);
      }
    });
  }
}
const fs = require('fs');
const path = require('path');
const intersect = require('@evio/intersect');
const compare = require('node-version-compare');
module.exports = class Plugins {
  constructor(app) {
    this.app = app;
    this.cwd = app.$options.cwd;
    this.env = app.$options.env;
    this.stacks = {};
    this.param = 'josify';
    this.childrens = {};
  }

  getActivedPlugins() {
    const result = {};
    const plugins = this.getPluginList();
    for (const pluginName in plugins) {
      const config = plugins[pluginName];
      config.enable = !!config.enable;
      if (!config.env) config.env = [];
      if (!Array.isArray(config.env)) config.env = [config.env];
      if (!config.env.length) config.env = [this.env];
      if (!config.enable) continue;
      if (config.env.indexOf(this.env) === -1) continue;
      const pluginPath = config.path ? config.path : path.resolve(this.cwd, 'node_modules', pluginName);
      if (!fs.existsSync(pluginPath)) continue;
      const pluginPackagePath = path.resolve(pluginPath, 'package.json');
      if (!fs.existsSync(pluginPackagePath)) continue;
      const packageExports = require(pluginPackagePath);
      if (!packageExports[this.param]) packageExports[this.param] = {};
      const dependencies = packageExports[this.param].dependencies || {};
      result[pluginName] = {
        path: pluginPath,
        dependencies,
        version: packageExports.version
      }
    }
    return {
      list: result,
      sort: this.sort(result)
    };
  }

  sort(tree) {
    const result = [];
    const keys = Object.keys(tree);
    let j = keys.length;
    while (j--) {
      const obj = tree[keys[j]];
      const depkeys = Object.keys(obj.dependencies);
      if (depkeys.length) {
        const res = intersect(depkeys, keys);
        if (res.removes.length) {
          throw new Error(`Plugin(${keys[j]}) miss dependencies '${res.removes.join(',')}', you should setup them first, using 'npm i <package>.'`);
        }
      }
      Object.defineProperty(obj, 'deep', {
        get() {
          if (!depkeys.length) return 0;
          return Math.max(...depkeys.map(d => tree[d] ? tree[d].deep : 0)) + 1;
        }
      });
    }
    for (const i in tree) {
      tree[i].name = i;
      result.push(tree[i]);
    }
    return result.sort((a, b) => a.deep - b.deep);
  }

  getPluginList() {
    const pluginFile = path.resolve(this.cwd, 'package.json');
    if (!fs.existsSync(pluginFile)) throw new Error('miss package.json, at ' + pluginFile);
    const packages = require(pluginFile);
    if (!packages.plugins) return {};
    return packages.plugins;
  }

  getPluginConfigs() {
    const configFile = path.resolve(this.cwd, `config/plugin.${this.env}.json`);
    if (!fs.existsSync(configFile)) return {};
    return require(configFile);
  }

  getProgramConfigs() {
    const configFile = path.resolve(this.cwd, `config/package.${this.env}.json`);
    if (!fs.existsSync(configFile)) return {};
    return require(configFile);
  }

  async install(factory) {
    const pluginConfigs = this.getPluginConfigs();
    const programCofnigs = this.getProgramConfigs();
    const { sort, list } = this.getActivedPlugins();
    this.configs = { _: programCofnigs };
    for (let i = 0; i < sort.length; i++) {
      const plugin = sort[i];
      for (const j in plugin.dependencies) {
        const _version = plugin.dependencies[j].version;
        const version = list[plugin.name].version;
        if (compare(version, _version) === -1) throw new Error(`plugin(${plugin.name}) need version ${_version}, but got ${version}.You should update this package first.`);
      }
      factory.addPackage(plugin.path, plugin.name);
      this.configs[plugin.name] = pluginConfigs[plugin.name];
    }
  }
}
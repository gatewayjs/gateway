const ArgvFormatter = require('./utils/argv');
const Processer = require('./processer');
const BabelRegister = require('@babel/register');

require('reflect-metadata');
BabelRegister({
  cache: true,
  only: [ /\/package\// ],
  extensions: ['.js', '.mjs'],
  plugins: [
    ["@babel/plugin-proposal-decorators", { "legacy": true }]
  ]
});

class Agent extends Processer {
  constructor(argv) {
    const argvs = ArgvFormatter(argv);
    const target = require(argvs.script);
    super(true, argvs.name);
    this.$server = new target(argvs);
    this.$server.CREATE_AGENT = this.CREATE_AGENT.bind(this);
    this.$server.SIGKILL = this.SIGKILL.bind(this);
  }

  async create() {
    if (this.$server.create) {
      return await this.$server.create();
    }
  }

  async destroy() {
    if (this.$server.destroy) {
      return await this.$server.destroy();
    }
  }
}

new Agent(process.argv.slice(2)).INIT();
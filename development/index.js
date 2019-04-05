const { GateWay } = require('../index');
new GateWay({
  cwd: __dirname,
  max: 1,
  port: 3000,
  socket: true
}).INIT();
const detectPort = require('detect-port');
module.exports = function(port) {
  return new Promise((resolve, reject) => {
    const args = [];
    port && args.push(port);
    args.push((err, port) => {
      if (err) return reject(err);
      resolve(port);
    });
    detectPort(...args);
  });
};

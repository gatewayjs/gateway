const net = require('net');
const MSG = require('stickpackage').msgCenter;
module.exports = function createTcpClient(port) {
  return new Promise((resolve, reject) => {
    const timeStamp = Date.now();
    const stick = new MSG();
    let timer = null;
    const client = net.createConnection({ port: Number(port) }, () => {
      client.send('tcp:connecting:' + timeStamp);
      timer = setTimeout(() => reject(new Error('tcp connection timeout')), 1000);
    });
    client.send = str => client.write(stick.publish(str));
    const listener = data => {
      data = data.toString();
      if (data.indexOf('tcp:connected') === 0) {
        clearTimeout(timer);
        client.off('data', listener);
        if (data.substring('tcp:connected'.length + 1) == timeStamp) {
          resolve(client);
        } else {
          reject(new Error('tcp connection catch error'));
        }
      }
    }
    client.on('data', listener);
  });
}

module.exports.close = function(client) {
  return new Promise(resolve => client.end(resolve));
}
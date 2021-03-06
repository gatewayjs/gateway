const net = require('net');
const Port = require('./port');
const MSG = require('stickpackage').msgCenter;
module.exports = async function createTCPServer(callback) {
  const port = await Port();
  const server = net.createServer(socket => {
    const stick = new MSG();
    socket.on('data', data => stick.putData(data));
    stick.onMsgRecv(data => onMessage(socket, data, callback));
  });
  return await new Promise((resolve, reject) => {
    server.listen(port, err => {
      if (err) return reject(err);
      server.port = port;
      resolve(server);
    });
  });
}

function onMessage(socket, data, callback) {
  data = data.toString();
  if (data === 'tcp:alive') {
    socket.write('tcp:alive:' + Date.now());
  } else if (data.indexOf('tcp:connecting') === 0) {
    const timestamp = data.substring('tcp:connecting'.length + 1);
    socket.write('tcp:connected:' + timestamp);
  } else {
    if (callback) {
      const body = wrapTcpData(data);
      const id = body.__TCP_CALLBACK_ID__;
      if (id) {
        callback(body.event, body.data)
          .then(dat => send(socket, id, null, dat))
          .catch(e => send(socket, id, e.message));
      }
    }
  }
}


function wrapTcpData(data) {
  if (data.indexOf('{') === 0) {
    data = JSON.parse(data);
  } else {
    data = {
      event: data
    }
  }
  return data;
}

function send(socket, id, error, data) {
  if (!socket || socket.destroyed) return;
  const options = { __TCP_CALLBACK_ID__: id };
  if (error) {
    options.error = error;
  } else {
    options.data = data;
  }
  socket.write(JSON.stringify(options));
}
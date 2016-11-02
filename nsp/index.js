const server = require('http').createServer();
const io = require('socket.io')(server);

io.on('connection', function (socket) {
  console.log('socket is opened');

  io.emit('hello', { hello: 'venacle!'});

  socket.on('disconnect', function () {
    io.emit('user disconnected');
  });
});

module.exports = {
  server: server,
  io: io
};
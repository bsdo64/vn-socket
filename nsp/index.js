const server = require('http').createServer();
const io = require('socket.io')(server);

io.on('connection', function (socket) {
  console.log('socket is opened');

  socket.on('disconnect', function () {
    io.emit('user disconnected');
  });
});

module.exports = {
  server: server,
  io: io
};
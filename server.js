var io = require('socket.io')(3003);

io.on('connection', function (socket) {
  console.log('socket is opened');

  io.emit('this', { will: 'be received by everyone'});

  socket.on('private message', function (from, msg) {
    console.log('I received a private message by ', from, ' saying ', msg);
  });

  socket.on('disconnect', function () {
    io.emit('user disconnected');
  });
});


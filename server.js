const cookieParser = require('cookie-parser');
const Cookie = require('cookie');
const M = require('vn-api-model');

const io = require('socket.io')(3003);

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


const notiIo = io.of('/noti');

notiIo.on('connection', function (socket) {
  console.log('Noti socket is opened');

  socket.on('send noti', function (result) {
    
    notiIo.to(result.to).emit('comment_write noti', result.notis);
  });


  socket.on('join_room', function () {
    console.log(socket.request);
    const headers = socket.request.headers;
    const cookie = Cookie.parse(headers.cookie);
    if (cookie.sessionId && cookie.token) {
      const sessionId = cookieParser.signedCookie(cookie.sessionId, '1234567890QWERTY');
      const token = cookie.token;

      M
        .User
        .checkUserByToken(token, sessionId)
        .then((user) => {
          console.log('Join the socket room : ', user.nick);
          socket.join(user.nick);
        });
    }
  });

  socket.on('disconnect', function () {
    console.log('user disconnected');
    socket.leave();
  });
});
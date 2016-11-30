const io = require('./index').io;
const cookieParser = require('cookie-parser');
const Cookie = require('cookie');
const M = require('vn-api-model');

const notiIo = io.of('/noti');

notiIo.on('connection', function (socket) {
  console.log('Noti socket is opened');

  socket.on('send noti', function (result) {

    notiIo.to(result.to).emit('comment_write noti', result.notis);
  });


  socket.on('join_room', function () {
    const headers = socket.request.headers;
    const cookie = Cookie.parse(headers.cookie);
    console.log(cookie.sessionId && cookie.token);
    if (cookie.sessionId && cookie.token) {
      const sessionId = cookieParser.signedCookie(cookie.sessionId, '1234567890QWERTY');
      const token = cookie.token;

      M
        .User
        .checkUserAuth(token, sessionId)
        .then((user) => {
          console.log('Join the noti socket room : ', user.nick);
          socket.join(user.nick);
        });
    }
  });

  socket.on('disconnect', function () {
    console.log('user disconnected in noti socket');
  });
});

module.exports = notiIo;
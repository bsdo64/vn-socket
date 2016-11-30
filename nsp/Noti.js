const io = require('./index').io;
const cookieParser = require('cookie-parser');
const Cookie = require('cookie');
const M = require('vn-api-model');

const notiIo = io.of('/noti');

notiIo.on('connection', function (socket) {
  console.log('Noti socket is opened');

  socket.on('send noti', function (result) {

    const { to, notis, userId } = result;
    notiIo.to(to).emit('comment_write noti', { notis, userId });
  });


  socket.on('join_room', function () {
    const headers = socket.request.headers;
    const cookie = Cookie.parse(headers.cookie);
    if (cookie.sessionId && cookie.token) {
      const sessionId = cookieParser.signedCookie(cookie.sessionId, '1234567890QWERTY');
      const token = cookie.token;

      console.log('sessionId: ', sessionId);
      console.log('token: ', token);
      M
        .User
        .checkUserAuth(sessionId, token)
        .then((user) => {
          console.log('Join the noti socket room : ', user.nick);
          socket.join(user.nick);
        })
        .catch(err => {
          console.error(err);
        })
    }
  });

  socket.on('disconnect', function () {
    console.log('user disconnected in noti socket');
  });
});

module.exports = notiIo;
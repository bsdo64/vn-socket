const io = require('./index').io;
const cookieParser = require('cookie-parser');
const Cookie = require('cookie');
const M = require('vn-api-model');

// Point Socket
const pointIo = io
  .of('/point')
  .on('connection', function (socket) {
    console.log('Point socket is opened');

    socket.on('send point', function (result) {
      console.log(result);
      pointIo.to(result.to).emit('receive point', result.data);
    });

    socket.on('join_room', function () {

      const headers = socket.request.headers;
      const cookie = Cookie.parse(headers.cookie);
      if (cookie.sessionId && cookie.token) {
        const sessionId = cookieParser.signedCookie(cookie.sessionId, '1234567890QWERTY');
        const token = cookie.token;

        M
          .User
          .checkUserByToken(token, sessionId)
          .then((user) => {
            console.log('Join the point socket room : ', user.nick);
            socket.join(user.nick);
          });
      }
    });

    socket.on('disconnect', function () {
      console.log('user disconnected in point socket');
    });
  });

module.exports = pointIo;
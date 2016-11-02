const server = require('./nsp/index').server;

require('./nsp/Noti');
require('./nsp/Point');
require('./nsp/Venalink');

server.listen(3003);
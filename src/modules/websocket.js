var WebSocketServer = require('websocket').server;
var WebSocketRouter = require('websocket').router;

module.exports.apply = function (server) {
    var wsServer = new WebSocketServer({
        httpServer: server
    });

    var router = new WebSocketRouter();
    router.attachServer(wsServer);
    router.mount(RegExp('/ws/proxy/[\\S]*/[\\S]*'), 'proxy', require('../modules/proxy').newConnection)
}

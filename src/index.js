const config = require('./modules/config')

async function runApp() {
    app = await require('./app').initApp()

    const http = require('http')
    var server = http.createServer(app);

    const websocket = require('./modules/websocket')
    websocket.apply(server)

    port = config.PORT || 8080
    host = config.LISTEN_ADDR

    server.listen(port, host);
    server.on('listening', function () {
        console.log('Express server started on port %s at %s', server.address().port, server.address().address);
    });
}

if (config) {
    runApp().then(() => {}).catch((err) => {
        console.log("App error:", err)
    })
}

const crypto = require('crypto');
const fs = require('fs')
const config = require('./config')

var turnSecret = config.turnSecret

if (!turnSecret) {
    if (config.turnConfigFile) {
        try {
            configFile = fs.readFileSync(config.turnConfigFile).toString()
            configFile.split('\n').forEach((line) => {
                line = line.trim()
                parts = line.split('=')
                if (parts.length == 2) {
                    if (parts[0] == 'static-auth-secret') {
                        turnSecret = parts[1]
                    }
                }
            })
        } catch (e) {
            console.log(e.message)
        }
    }
}

module.exports.createCredentials = function () {
    if (!turnSecret) {
        throw new Error("TURN secret not configured. Cannot create credentials")
    }

    var expiry = parseInt(Date.now() / 1000) + 86500;
    var username = expiry + ':' + require('uuid').v4()

    var hm = crypto.createHmac('sha1', turnSecret);
    hm.setEncoding('base64');
    hm.write(username);
    hm.end();

    return {
        username: username,
        password: hm.read(),
        host: config.turnHost
    };
}

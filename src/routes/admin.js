const express = require('express')
const router = express.Router()
const crypto = require('crypto');
const config = require('../modules/config')

router.use((req, res, next) => {
    if (config.apiKey) {
        authHeader = req.header('Authorization')
        if (typeof authHeader === 'string') {
            parts = authHeader.split("Basic ");
            if (parts.length == 2) {
                const hash = crypto.createHash('sha256');
                hash.update(Buffer.from(parts[1], 'base64'));

                if (hash.digest('hex') == config.apiKey) {
                    return next()
                }
            }
        }

        res.setHeader('WWW-Authenticate', 'Basic realm="Authentication"')
        return res.sendError(401, 'Authentication header invalid')
    } else {
        next()
    }
})

router.get('/rooms/', (req, res) => {
    try {
        result = require('../modules/proxy').listRooms();
        res.send(result)
    } catch (e) {
        res.sendError(400, e.message)
    }
})

function postRoom(req, res) {
    if (typeof req.body.options === 'undefined') {
        req.body.options = null
    }

    var roomId = req.params.roomId
    if (typeof req.params.roomId == "undefined") {
        roomId = require('uuid').v4()
    }

    try {
        result = require('../modules/proxy').createRoom(roomId, req.body.options, req.header('Host'));
        res.send(result)
    } catch (e) {
        res.sendError(400, e.message)
    }
}

router.post('/rooms/', (req, res) => {
    postRoom(req, res)
})

router.post('/rooms/:roomId', (req, res) => {
    postRoom(req, res)
})

router.delete('/rooms/:roomId', (req, res) => {
    var roomId = req.params.roomId
    try {
        require('../modules/proxy').closeRoom(roomId);
        res.sendOk()
    } catch (e) {
        res.sendError(400, e.message)
    }
})

router.get('/rooms/:roomId', (req, res) => {
    var roomId = req.params.roomId
    try {
        res.send(require('../modules/proxy').getRoom(roomId));
    } catch (e) {
        res.sendError(400, e.message)
    }
})

module.exports = router

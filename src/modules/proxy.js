const TimeoutHandler = require('./timeout')
const Turn = require('./turn')

class Room {
    constructor(roomId, options, doneCb) {
        this.roomId = roomId
        this.options = options
        this.doneCb = doneCb
        this.timeoutHandler = new TimeoutHandler((() => {
            this.closeRoom()
        }).bind(this))

        this.conns = []
        this.clients = 0
        this.acceptingClients = true

        this.timeoutHandler.setupTimeout('init', options.initTimeout)
        this.timeoutHandler.setupTimeout('duration', options.maxDuration)
    }

    addSock(clientId, request) {
        if (!this.acceptingClients) {
            return false
        }

        if (clientId < 0 || clientId >= this.options.maxSockets) {
            return false
        }

        if (typeof this.conns[clientId] !== 'undefined') {
            return false
        }

        var sock = request.accept(request.origin);
        var conn = new Connection(this.options, room, clientId, sock)

        //Tell the existing clients about the new one
        var connectMsg = (id) => {
            return JSON.stringify({
                type: 'connected',
                clientId: id
            })
        }
        this.broadcast(null, connectMsg(conn.clientId))

        //Tell the new client about the settings
        conn.send(JSON.stringify({
            type: 'init',
            roomId: this.roomId,
            options: this.options
        }))

        //Tell the new client about the ones that are already connected
        this.conns.forEach((oldConn) => {
            conn.send(connectMsg(oldConn.clientId))
        })

        this.conns[conn.clientId] = conn
        this.clients++;
        if (this.clients >= this.options.minSockets) {
            this.timeoutHandler.cancelTimeout('init')
        }
        return true
    }

    getInfo() {
        return {
            numClients: this.clients,
            acceptingClients: this.acceptingClients,
            initTimeoutActive: this.timeoutHandler.isActive('init'),
            durationTimeoutActive: this.timeoutHandler.isActive('duration'),
        }
    }

    close(closed) {
        this.clients--;

        if (this.clients >= this.options.minSockets) {
            delete this.conns[closed.clientId]

            this.broadcast(null, JSON.stringify({
                type: 'disconnected',
                clientId: closed.clientId
            }))
        } else {
            this.closeRoom()
        }
    }

    closeRoom() {
        this.timeoutHandler.cancelTimeout('init')
        this.timeoutHandler.cancelTimeout('duration')

        this.acceptingClients = false

        this.conns.forEach((conn) => {
            conn.close()
        })

        this.conns = []

        if (this.doneCb) {
            this.doneCb()
        }
    }

    broadcast(exclude, data) {
        this.conns.forEach((conn) => {
            if (exclude !== conn) {
                conn.send(data)
            }
        })
    }

    received(source, msg) {
        var makeFwd = (data) => {
            return JSON.stringify({
                type: msg.type,
                data: data,
                clientId: source.clientId,
            })
        }

        switch (msg.type) {
        case 'bc':
            if (typeof msg.data === 'string') {
                this.broadcast(source, makeFwd(msg.data))
            }
            case 'direct':
                if (typeof msg.data === 'string' && typeof msg.clientId === 'number') {
                    var peer = this.conns[msg.clientId]
                    if (typeof peer === 'object') {
                        peer.send(makeFwd(msg.data))
                    }
                }
        }
    }
}

class Connection {
    constructor(options, room, clientId, sock) {
        this.sock = sock
        this.room = room
        this.options = options
        this.clientId = clientId

        this.charsReceived = 0
        this.timeoutHandler = new TimeoutHandler((() => {
            this.close()
        }).bind(this))

        this.timeoutHandler.setupTimeout('rx', options.receiveTimeout)

        sock.on('message', function (message) {
            if (message.type !== 'utf8') {
                return this.close()
            }

            this.charsReceived += message.utf8Data.length
            if (this.options.maxChars && this.charsReceived > this.options.maxChars) {
                return this.close()
            }

            var msg = {}
            try {
                msg = JSON.parse(message.utf8Data)
            } catch (e) {
                return
            }

            this.timeoutHandler.setupTimeout('rx', options.receiveTimeout)

            if (typeof msg.type !== 'string') {
                return
            }

            if (msg.type === 'echo') {
                this.sock.send(message.utf8Data)
                return
            }

            if (this.room) {
                this.room.received(this, msg)
            }
        }.bind(this))

        sock.on('error', function (err) {
            this.close()
        }.bind(this))

        sock.on('close', function (closeReason, description) {
            this.close()
        }.bind(this))
    }

    send(message) {
        this.sock.send(message)
    }

    close() {
        this.timeoutHandler.cancelTimeout('rx')

        room = this.room
        this.room = null
        if (room) {
            room.close(this)
        }
        this.sock.close()
    }
}

module.exports.newConnection = function (request) {
    parts = request.resource.split('/')
    if (parts.length == 5) {
        room = rooms.get(parts[3])
        clientId = parseInt(parts[4], 10)

        if (typeof room !== 'undefined') {
            if (room.addSock(clientId, request)) {
                return
            }
        }
    }
    request.reject()
}

var rooms = new Map()

module.exports.defaultOptions = {
    initTimeout: 16000,
    receiveTimeout: 16000,
    maxDuration: 0,
    maxChars: 256 * 1024,

    minSockets: 0,
    maxSockets: 2,
}

module.exports.createRoom = function (roomId, options, host) {
    if (!roomId.match(/^[0-9a-z\-]+$/)) {
        throw new Error("Invalid roomId")
    }

    if (rooms.get(roomId)) {
        throw new Error("Room already exists")
    }

    options = Object.assign({
        ...module.exports.defaultOptions
    }, options)

    if (options.turn === true) {
        options.turn = Turn.createCredentials()
    }

    rooms.set(roomId, new Room(roomId, options, () => {
        rooms.delete(roomId)
    }))
    return {
        roomId: roomId,
        options: options,
        uri: "wss://" + host + "/ws/proxy/" + roomId + '/'
    }
}

module.exports.closeRoom = function (roomId) {
    room = rooms.get(roomId);

    if (!room) {
        throw new Error("Room does not exist")
    }

    room.closeRoom()
}

module.exports.getRoom = function (roomId) {
    room = rooms.get(roomId);

    if (!room) {
        throw new Error("Room does not exist")
    }

    return room.getInfo()
}

module.exports.listRooms = function () {
    result = [];

    rooms.forEach((room, roomId) => {
        result.push(roomId)
    })

    return result
}

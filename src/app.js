async function initApp() {
    const express = require('express')
    const helmet = require('helmet')
    const morgan = require('morgan')

    const app = express();
    app.set('trust proxy', true)
    app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" - :response-time ms'))
    app.use(express.json());
    app.use(helmet())

    app.use((req, res, next) => {
        res.sendError = ((res, code, msg) => {
            res.status(code).send({
                status: 'error',
                reason: msg
            })
        }).bind(null, res)

        res.sendOk = ((res) => {
            res.status(200).send({
                status: 'ok'
            })
        }).bind(null, res)

        next()
    })

    app.use('/admin', require('./routes/admin'))
    app.use((req, res, next) => {
        res.sendError(404, 'Resource does not exist')
    })

    return app;
}

module.exports.initApp = initApp

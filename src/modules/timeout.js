class TimeoutHandler {
    constructor(callback) {
        this.callback = callback
    }

    setupTimeout(name, value) {
        this.cancelTimeout(name)

        if (value > 0) {
            this['timeout-' + name] = setTimeout((() => {
                this['timeout-' + name] = null
                this.callback()
            }).bind(this), value);
        }
    }

    cancelTimeout(name) {
        var timeout = this['timeout-' + name];
        this['timeout-' + name] = null

        if (timeout) {
            clearTimeout(timeout)
        }
    }

    isActive(name) {
        return this['timeout-' + name] ? true : false
    }
}

module.exports = TimeoutHandler

const fs = require('fs')

configPath = process.env.CONFIG_PATH || "config.json"

config = null
try {
    config = JSON.parse(fs.readFileSync(configPath))
} catch (e) {
    console.log("Failed to parse config", e.message)
}


module.exports = config

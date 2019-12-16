const fs = require('fs')

configPath = process.env.CONFIG_PATH

if(configPath){
    config = null
    try {
        config = JSON.parse(fs.readFileSync(configPath))
    }catch(e){
        console.log("Failed to parse config", e.message)
    }
}else{
    config = process.env
}

module.exports = config
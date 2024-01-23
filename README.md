# api.SolarCollector
This is the API for handling the websocket connections used in my SolarCollector Project.<br />
The project uses MQTT to transmit data from my Victron Energy CCGX to a Node.js server using websockets. This data is then sent again through websockets to the frontend.<br />
You can find a demo of the frontend connection [here](https://www.solar.mc.hzuccon.com/#/demo)
- [MQTT SolarCollector](https://github.com/harvmaster/SolarCollector)
- [Frontend SolarCollector](https://github.com/harvmaster/www.SolarCollector)
  
# Config
```ts
export const config = {
  port: 3000,
  mongoDB: 'mongodb url',
}

export default config
```

# Installation
```bash
git clone git@github.com:harvmaster/api.solarCollector.git
cd api.solarCollector
npm install
npm run start
```


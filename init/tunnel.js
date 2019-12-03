const log4js = require('log4js');
const logger = log4js.getLogger('system');
const config = appRequire('services/config').all();
const spawn = require('child_process').spawn;

const run = async () => {
    if(!config.shadowsocks.tunnel.use) {
      return;
    }
    
    let jsonConfig = config.shadowsocks.tunnel.config;
    let remote = config.shadowsocks.tunnel.remote;
    let localHost = config.shadowsocks.address.split(':')[0];
    let localPort = config.shadowsocks.address.split(':')[1];

    let ssTunnel = spawn('ss-tunnel', [ '-c', jsonConfig, '-U', '-L', remote, '-l', localPort, '-b', localHost]);
  
    ssTunnel.on('close', (code) => {
      logger.error(`child process ss-tunnel exited with code ${code}`);
    });
    logger.info(`Run ss-tunnel with config ${ jsonConfig }`);
    return;
  };
  
  exports.run = run;

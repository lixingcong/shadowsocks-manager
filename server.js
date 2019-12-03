const cluster = require('cluster');
if(!process.env.numCPUs) {
  process.env.numCPUs = 1;
}
if(process.argv.indexOf('--multiCore') > 1) {
  process.env.numCPUs = require('os').cpus().length;
}
require('./init/log');
const log4js = require('log4js');
const logger = log4js.getLogger('system');
if(cluster.isMaster) {
  logger.info(`System start[${ process.pid }].`);
} else {
  logger.info(`Worker start[${ process.pid }].`);
}

process.on('unhandledRejection', (reason, p) => {
  logger.error('Unhandled Rejection at: Promise', p, 'reason:', reason);
});
process.on('uncaughtException', (err) => {
  logger.error(`Caught exception:`);
  logger.error(err);
});

const startWorker = async () => {
  require('./init/utils'); // 全局定义，如appRequire()

  require('./init/moveConfigFile'); // 复制默认的配置文件default.yml到HOME下
  require('./init/checkConfig'); // 读取yml参数
  require('./init/knex'); // 数据库操作

  const initDb = require('./init/loadModels').init; // 创建models目录下的基本的数据table
  const runShadowsocks = require('./init/runShadowsocks').run;
  const runSSTunnel = require('./init/tunnel').run;
  await initDb();
  await runShadowsocks();
  await runSSTunnel();
  require('./init/loadServices'); // 根据m端还是s端，运行不同的实例
  require('./init/loadPlugins'); // 载入plugins下的插件
  process.send('Worker start');
};

if(cluster.isMaster) {
  // 主进程用于管理子进程
  process.env.mainWorker = 1;
  cluster.fork();
  cluster.on('message', (worker, message, handle) => {
    if(message === 'Worker start' && Object.keys(cluster.workers).length < (+process.env.numCPUs)) {
      cluster.fork();
    }
  });
  cluster.on('exit', (worker, code, signal) => {
    if(code === 0) { return; }
    logger.error(`worker [${ worker.process.pid }][${ worker.id }] died`);
    for(const w in cluster.workers) {
      process.env.mainWorker = w;
      break;
    }
    cluster.fork();
  });
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.on('line', input => {
    if(input === 'rs') {
      for(const w in cluster.workers) {
        cluster.workers[w].kill();
        break;
      }
    }
  });
} else {
  // 子进程进行s端或者m端操作
  startWorker();
}



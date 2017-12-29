var Horseman = require('node-horseman');
var horseman = new Horseman({
  cookiesFile: './cookies.txt',
  diskCache: true,
  diskCachePath: './browsercache'
});

horseman
  .open('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched')
  .cookies()
  .log()
  .click('#term_input_id')
  .close();

const Horseman = require('node-horseman');


//const dict = require('./crndict.json')

const config = require('./config.json')
const initDB = require('./lib/initDB')
const db = initDB()

function parseBody(body, subject, crns, resolve) {
    console.log(crns)
    resolve()
}


function fetchStatus(termID, subject, crns) {

return new Promise(function(resolve, reject){
  const horseman = new Horseman({
      cookiesFile: './cookies.txt',
      diskCache: true,
      diskCachePath: './browsercache'
  });

  horseman
      .open('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched')
      .waitForSelector('#term_input_id')
      .cookies()
      .evaluate( function(termID){
        $('#term_input_id').val(termID)
      }, termID)
      .click('input[value="Submit"]')
      .waitForNextPage()
      .cookies()
      .evaluate( function(subject){
        $('#subj_id').val(subject)
      }, subject)
      .click('input[value="Class Search"]')
      .waitForNextPage()
      .html()
      .then(function(body){
        parseBody(body, subject, crns, resolve)
        return horseman.close()
      })
    })
}

var subjects = ['BIO', "ART", 'WRI']

function fetchNext() {

  subjects.forEach(function(item, i){
    //Search if we even need to check this subject
    db.CRN.findAll({where: {
      subject: item
    }}).then(function(crns){
      if (crns.length > 0) {
        console.log('crawling', item)
        // fetchStatus(config.misc.termID, item, crns).then(function(){
        //   fetchNext()
        // })
      } else {
        //No need to crawl
        console.log('No need to crawl!', item)
        fetchNext()
      }
    })
  })
}

setTimeout(function(){
  fetchNext()
}, 2000)

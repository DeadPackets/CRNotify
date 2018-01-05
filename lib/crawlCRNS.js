const request = require('request');
const config = require('../config.json');
const cheerio = require('cheerio');
const chalk = require('chalk');
const sleep = require('sleep')

//Lib
const sendNotif = require('./sendNotif')

//Functions
function parseBody(body, subject, crns, db, resolve) {

  const $ = cheerio.load(body.toString(), {
    normalizeWhitespace: true,
    xmlMode: true,
    decodeEntities: true
  })

  let crnsProcessed = 0;

  crns.forEach(function(crn, i) {

    //Dear god, i have suffered for this
    const status = $(`a[href="/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${config.misc.termID}&crn_in=${crn.dataValues.crn}"]`).parent().closest('tr').next().find('td[colspan="1"]').text()

    let currentState = ''

    if (crn.dataValues.state == 'closed') {
      currentState = 'N'
    } else {
      currentState = 'Y'
    }

    let newState = ''

    if (status.toUpperCase() == 'N') {
      newState = 'closed'
    } else {
      newState = 'open'
    }

    console.log(chalk.yellow(`CRN [${crn.dataValues.crn}]: Banner says ${status} [${newState}] and DB says ${currentState} [${crn.dataValues.state}]`))

    if (status.length > 0) {
      if (status.toUpperCase() == currentState) {
        //Nothing to do here
      } else {

        //SOUND THE ALARM
        db.sequelize.query('SELECT email,name,ifttt_enabled,ifttt_key FROM crns,users WHERE crns.userID = users.id AND crns.crn = ?', {
          replacements: [crn.dataValues.crn]
        }).then(function(data) {

          //Pass to the notification function
          const users = data[0]
          sendNotif(crn.dataValues, newState, users)

          //Update with the new state
          db.crnStatus.update({
            state: newState
          }, {
            where: {
              crn: crn.dataValues.crn
            }
          })

        })
      }
    } else {
      console.log(chalk.red('Faulty crawl.'))
    }

    crnsProcessed++;

    if (crnsProcessed == crns.length) {
      resolve()
    }

  })

}

function fetchStatus(termID, subject, crns, db) {

  return new Promise(function(resolve, reject) {

    const Horseman = require('node-horseman');

    const horseman = new Horseman({
      cookiesFile: './cookies.txt',
      diskCache: true,
      diskCachePath: './browsercache',
      timeout: 10000,
      loadImages: false,
      proxyType: 'socks5',
      proxy: '127.0.0.1:9050',
      ignoreSSLErrors: true
    });

    horseman
      .on('error', function(msg){
        //Nothing we can do but ignore it
        console.log(`ERROR for ${subject}: ${msg}`)
        resolve()
      })
      .open('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched')
      .waitForSelector('#term_input_id')
      .cookies()
      .value('#term_input_id', termID)
      .waitForSelector('input[value="Submit"]')
      .click('input[value="Submit"]')
      .waitForNextPage()
      .waitForSelector('#subj_id')
      .cookies()
      .value('#subj_id', subject)
      .waitForSelector('input[value="Class Search"]')
      .click('input[value="Class Search"]')
      .waitForNextPage()
      .waitForSelector('.pagebodydiv')
      .html()
      .then(function(body) {
      //Ok we got the HTML, time to parse it
      parseBody(body, subject, crns, db, resolve)
      return horseman.close()
    })
  })
}

module.exports = (db, cb) => {
  if (db) {
    //Okay lets do this step by step
    //First, we need to find which subjects are we going to crawl
    db.sequelize.query('SELECT DISTINCT subject FROM crnStatuses').then(function(data) {
      if (data[0].length > 0) {
        //Voila, we have a list of subjects
        const subjects = data[0]
        let index = 0

        function startCrawl() {

          //Wait 5 seconds for RAM to clear
          sleep.sleep(5)

          if (index > (subjects.length - 1)) {
            console.log(chalk.green('Done fetching everything!'))
            cb()
          } else {

            let sub = subjects[index];
            console.log(chalk.blue('Starting fetch for ' + sub.subject))

            db.crnStatus.findAll({
              where: {
                subject: sub.subject
              }
            }).then(function(crns) {

              //Lets fetch the page
              fetchStatus(config.misc.termID, sub.subject, crns, db).then(function() {
                console.log(chalk.green(`Done fetching for ${sub.subject}`))
                index++;
                startCrawl()
              })

            })
          }
        }

        //Lets get ready to craaaaawwwwwwwl!
        startCrawl()
      } else {
        console.log('Nobody subscribed to any CRNs!')
      }
    })
  } else {
    return;
  }
}

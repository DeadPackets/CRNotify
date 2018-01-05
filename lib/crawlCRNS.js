const request = require('request');
const config = require('../config.json');
const cheerio = require('cheerio');
const chalk = require('chalk');
const sleep = require('sleep')
const random_useragent = require('random-useragent');

//Lib
const sendNotif = require('./sendNotif')

//Functions
function parseBody(body, subject, crns, db, resolve) {

  const $ = cheerio.load(body, {
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
      reject()
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

    const postData = `term_in=${termID}&sel_subj=dummy&sel_day=dummy&sel_schd=dummy&sel_insm=dummy&sel_camp=dummy&sel_levl=dummy&sel_sess=dummy&sel_instr=dummy&sel_ptrm=dummy&sel_attr=dummy&sel_subj=${subject}&sel_crse=&sel_title=&sel_from_cred=&sel_to_cred=&sel_levl=%25&sel_instr=%25&sel_attr=%25&begin_hh=0&begin_mi=0&begin_ap=a&end_hh=0&end_mi=0&end_ap=a`

    const horseman = new Horseman({
      // cookiesFile: './cookies.txt',
      diskCache: true,
      diskCachePath: './browsercache',
      timeout: 15000,
      loadImages: false,
      // proxyType: 'socks5',
      // proxy: '127.0.0.1:9050',
      ignoreSSLErrors: true
    });

    horseman
      .userAgent(random_useragent.getRandom())
      .on('error', function(msg){
        reject()
      }, reject)
      .on('timeout', function(){
        console.log(chalk.red(`Timeout for ${subject}!`))
        reject()
      }, reject)
      .post('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_get_crse_unsec', postData)
      .waitForSelector('.pagebodydiv')
      .catch(function(e) {
        reject()
      }, reject)
      .html()
      .then(function(body){
        parseBody(body, subject, crns, db, resolve)
        return horseman.close();
      })

    // horseman
    //   .on('error', function(msg){
    //     //Nothing we can do but ignore it
    //     console.log(chalk.red(`ERROR for ${subject}: ${msg}`))
    //     reject()
    //   })
    //   .open('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched')
    //   .waitForSelector('#term_input_id')
    //   .cookies()
    //   .value('#term_input_id', termID)
    //   .waitForSelector('input[value="Submit"]')
    //   .click('input[value="Submit"]')
    //   .waitForNextPage()
    //   .waitForSelector('#subj_id')
    //   .cookies()
    //   .value('#subj_id', subject)
    //   .waitForSelector('input[value="Class Search"]')
    //   .click('input[value="Class Search"]')
    //   .waitForNextPage()
    //   .waitForSelector('.pagebodydiv')
    //   .html()
    //   .then(function(body) {
    //   //Ok we got the HTML, time to parse it
    //   parseBody(body, subject, crns, db, resolve)
    //   return horseman.close()
    // })
    //
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

          //Wait 30 seconds for RAM to clear
          sleep.sleep(30)

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
              }).catch(function(e){
                  console.log(chalk.red(`ERROR for ${sub.subject}`))
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

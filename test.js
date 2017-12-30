var Horseman = require('node-horseman');
const horseman = new Horseman({
    cookiesFile: './cookies.txt',
    diskCache: true,
    diskCachePath: './browsercache'
});

//const dict = require('./crndict.json')




function parseBody(body, subject) {
    console.log(subject)
}


function fetchStatus(termID, subject) {


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
        parseBody(body, subject)
      })
      .close()
}

var subjects = ['BIO', "ART", 'WRI']

subjects.forEach(function(item, i){
  fetchStatus('201820', item)
})

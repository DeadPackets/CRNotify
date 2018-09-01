/* eslint-disable require-jsdoc */
/* eslint-disable no-console */
/* eslint-disable no-inner-declarations */

//Requires
const random_useragent = require('random-useragent');
const Horseman = require('node-horseman');

const horseman = new Horseman({
	diskCache: true,
	diskCachePath: '../browsercache',
	timeout: 15000,
	loadImages: false,
	ignoreSSLErrors: true
});

// horseman
// .userAgent(random_useragent.getRandom())
// .on('error', function(msg){
//   console.log(chalk.red(`Error crawling CRN!`))
// })
// .on('timeout', function(){
//   console.log(chalk.red(`Timeout crawling CRN!`))
//   cb(true, null)
// })
// .cookies([])
// .open(`https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_detail_sched?term_in=${termID}&crn_in=${crn}`)
// .catch(function(e){
//   console.log(chalk.red(`Error crawling CRN!`))
//   cb(true, null)
// })
// .wait(5000)
// .evaluate(function(){
//   const final = {
// 	error: $('.errortext').text(),
// 	title: $('.ddlabel').text()
//   }
//   return final;
// })
// .then(function(data) {
//   cb(false, data)
//   return horseman.close()
// })
// }

horseman
	.userAgent(random_useragent.getRandom())
	.cookies([])
	.open('https://banner.aus.edu/axp3b21h/owa/bwckctlg.p_disp_dyn_ctlg')
	.waitForNextPage()
	.waitForSelector('#term_input_id')
	.wait(2000)
	.select('#term_input_id', '201910') //TODO:
	.click('input[type="submit"]')
	.waitForNextPage()
	.wait(2000)
	.evaluate(() => {
		const list = {};
		const items = $('#subj_id').children();

		for (let i = 0; i < items.length; i++) {
			const shortName = $(items[i]).val();
			const name = $(items[i]).text();
			list[shortName] = name;
		}

		return list;
	})
	.then((data) => {
		console.log(data);
	});
const request = require('request');
const nodeTorControl = require('node-tor-control');
const UserAgent = require("user-agents");
const cheerio = require("cheerio");
const TERM_ID = '202010';
const socksClient = require('socks5-https-client/lib/Agent');


function getCourseList() {
    return new Promise((resolve, reject) => {
        request({
            url: "https://banner.aus.edu/axp3b21h/owa/bwckctlg.p_disp_cat_term_date",
            method: "POST",
            gzip: true,
            agentClass: socksClient,
            agentOptions: {
                socksHost: '127.0.0.1', // Defaults to 'localhost'.
                socksPort: 9050, // Defaults to 1080.
            },
            headers: {
                'User-Agent': (new UserAgent({
                    deviceCategory: 'desktop'
                })).toString()
            },
            body: `call_proc_in=bwckctlg.p_disp_dyn_ctlg&cat_term_in=${TERM_ID}`
        }, (err, response, body) => {
            if (err) {
                reject(err);
            } else {
                let arr = [];
                const $ = cheerio.load(body.toString());
                if ($('noscript').length) {
                    console.log(body.toString());
                } else {
                    const length = $('select[name="sel_subj"]').children().length;
                    console.log(body.toString());
                    $('select[name="sel_subj"]').children().each((i, item) => {
                        arr.push({
                            courseCode: $(item).val(),
                            courseName: $(item).text()
                        });
                        if ((i + 1) == length) {
                            resolve(arr);
                        }
                    })
                }
            }
        })
    });
}

getCourseList()
const Sequelize = require('sequelize').Sequelize;
const chalk = require('chalk');
const puppeteer = require('puppeteer');
const termID = '202010';
const sequelize = new Sequelize(`sqlite:./${termID}.db`, {
    logging: false
});
async function crawl() {
    const CRNS = sequelize.define('crns', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        crn: Sequelize.STRING,
        subject: Sequelize.STRING,
        classTitle: Sequelize.STRING,
        classShortName: Sequelize.STRING,
        classNumber: Sequelize.STRING,
        classSection: Sequelize.INTEGER,
        classType: Sequelize.STRING,
        isLab: Sequelize.BOOLEAN,
        instructor: Sequelize.STRING,
        startTime: Sequelize.DATE,
        endTime: Sequelize.DATE,
        isSunday: Sequelize.BOOLEAN,
        isMonday: Sequelize.BOOLEAN,
        isTuesday: Sequelize.BOOLEAN,
        isWednesday: Sequelize.BOOLEAN,
        isThursday: Sequelize.BOOLEAN,
        levels: Sequelize.STRING,
        attributes: Sequelize.STRING,
        credits: Sequelize.INTEGER,
        classroom: Sequelize.STRING
    });

    const instructors = sequelize.define('instructors', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: Sequelize.STRING,
        email: Sequelize.STRING
    });

    const subjects = sequelize.define('subjects', {
        id: {
            type: Sequelize.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        shortName: Sequelize.STRING,
        longName: Sequelize.STRING
    });

    await sequelize.authenticate();
    await sequelize.sync({
        force: true
    });

    //Now that the database has been setup, time to start crawling
    const browser = await puppeteer.launch({
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    page.on('error', async (err) => { //For generic errors
        console.log(chalk.red(err));
        await browser.close();
    });

    //Open the first page
    console.log(chalk.blue('Browser and page launched.'))
    await page.goto('https://banner.aus.edu/axp3b21h/owa/bwckschd.p_disp_dyn_sched');
    await page.waitForSelector(`option[VALUE="${termID}`, {
        timeout: 10000
    }).catch(async (err) => {
        await browser.close();
    });
    //Select the semester from the input
    await page.select('select', termID);

    //Click the submit button
    console.log(chalk.blue('Term selected and submitted.'))
    await page.waitForSelector('input[type="submit"]');
    await page.click('input[type="submit"]').catch(async err => {
        await browser.close();
        console.log("INPUT TIMEOUT");
    });

    await page.waitForSelector('select[name="sel_subj"]', {
        timeout: 10000
    }).catch(async err => {
        await browser.close();
    });

    //Time to fetch the subjects
    const subjectFullName = await page.$eval('select[name="sel_subj"]', result => result.innerText.trim().split('\n'));
    const subjectShortName = await page.$$eval('select[name="sel_subj"] option', result => result.map((item) => {
        return item.value
    }));
    
    //Create array for bulk create
    let subjectsArr = [];
    for (let i = 0; i < subjectFullName.length; i++) {
        subjectsArr.push({
            'shortName': subjectShortName[i],
            'longName': subjectFullName[i]
        })
    }

    //Insert subjects into the database
    await subjects.bulkCreate(subjectsArr);
    console.log(chalk.blue(`${subjectFullName.length} subjects inserted into the database.`));

    //Time to crawl CRNs
    // await page.select('select[name="sel_subj"]', ...subjectShortName);
    await page.select('select[name="sel_subj"]', 'ACC');
    await page.waitForSelector('input[type="submit"]').catch(async err => {
        await browser.close();
        console.log("INPUT TIMEOUT");
    });
    await page.click('input[type="submit"]');
    await page.waitForSelector('td.dddefault').catch(async err => {
        await browser.close();
    });
    console.log(chalk.blue('CRN Page loaded.'));

    const bruhMoment = await page.$$eval('th a', result => {
        result.map(item => {
            return item.parentElement.parentElement.innerText;
            let descriptionElement = item.parentElement.parentElement.nextElementSibling;
            let descriptionText = descriptionElement.innerText;
            let classTable = descriptionElement.querySelector('table');
            let result =  {
                isLab: false,
                fullTitle: crnTitle[0],
                crn: crnTitle[1],
                shortTitle: crnTitle[2],
                section: crnTitle[3],
                levels: descriptionText.match(/(?<=Levels: ).*/g)[0].split(', '),
                attributes: descriptionText.match(/(?<=Attributes: ).*/g)[0].split(', '),
                scheduleType: descriptionText.match(/.+?(?= Schedule)/g)[0],
                credits: parseInt(descriptionText.match(/.+?(?= Credits)/g)[0]),
                classType: classTable.querySelectorAll('td')[6].innerText,
                classroom: classTable.querySelectorAll('td')[4].innerText,
                startTime: classTable.querySelectorAll('td')[1].innerText.split(' - ')[0],
                endTime: classTable.querySelectorAll('td')[1].innerText.split(' - ')[1],
                instructor: classTable.querySelectorAll('td')[7].innerText.split('(P)')[0],
                days: classTable.querySelectorAll('td')[2].innerText
            }
            result.instructorEmail = (result.instructor === 'TBA') ? 'none' : classTable.querySelector('td a').href.split('mailto:')[1];
            result.isLab = (crnTitle.length === 5);
            return result;
        })
    })

    console.log(bruhMoment);
    await browser.close();

}

crawl();
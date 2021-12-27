let inquirer = require('inquirer');
const puppeteer = require('puppeteer');
const winston = require('winston');
const uuid = require('uuid');
var fs = require('fs');
const yargs = require('yargs');
var xlsx = require('node-xlsx');


const argv = yargs
    .option('debug', {
        alias: 'd',
        description: 'Debug mode - dumps html and screenshots',
        type: 'boolean'
    })
    .alias('f', 'file')
    .nargs('f', 1)
    .describe('f', 'Avoid downloading and specify an already downloaded Vanguard Transaction Report')

    .version(false)
    .help()
    .alias('help', 'h').argv;

const executionId = uuid.v4()
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.json(),
    transports: [
        //
        // - Write all logs with level `error` and below to `error.log`
        // - Write all logs with level `info` and below to `combined.log`
        //
        new winston.transports.File({ filename: 'executions/' + executionId + '/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'executions/' + executionId + '/combined.log' }),
    ],
});


const downloadVanguardStatement = async (credentials) => {

    const puppeteerSteps = [
        {
            description: "Navigating To Vanguard UK",
            preReqs: [],
            actions: [async (page) => page.goto('https://www.vanguardinvestor.co.uk')],
            postReqs: [],
        },
        {
            description: "Clearing Cookie Banner",
            preReqs: [async (page) => page.waitForSelector("#bannerButton")],
            actions: [async (page) => page.click("#bannerButton")],
            postReqs: []
        },
        {
            description: "Go to Login Page",
            preReqs: [async (page) => page.waitForSelector("#utility-logon")],
            actions: [async (page) => page.click("#utility-logon")],
            postReqs: []
        },
        {
            description: "Submit Login",
            preReqs: [async (page) => page.waitForSelector("#__GUID_1007")],
            actions:
                [async (page) => page.type("#__GUID_1007", credentials.username),
                async (page) => page.type("#__GUID_1008", credentials.password),
                async (page) => page.keyboard.press('Enter')],
            postReqs:
                []
        },
        {
            description: "Go To Documents Page",
            preReqs: [async (page) => page.waitForSelector("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div.layout-aside-page > div.container.container-page > div > div > div:nth-child(3) > table > thead > tr > th.cell-30")],
            actions:
                [async (page) => page.goto(removeLastPath(page.url()) + "/document/document")],
            postReqs:
                []
        },
        {
            description: "Bring Up Generate Reports Form",
            preReqs: [async (page) => page.waitForSelector("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div.tabs-highlighted > div.tabs > div:nth-child(2) > a")],
            actions:
                [async (page) => page.click("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div:nth-child(2) > div.row > div:nth-child(1) > div > div > div.col-fluid.col-right.col-xxs-order-1 > button")],
            postReqs:
                []
        },
        {
            description: "Choose Client Transaction Listing - Excel",
            preReqs: [async (page) => await page.waitForXPath("//select[contains(., 'Choose a report')]")],
            actions:
                [async (page) => await (await page.$x("//select[contains(., 'Choose a report')]"))[0].click()],
            postReqs:
                []
        },
        {
            description: "Click Generate Report",
            preReqs: [async (page) => await page.waitForXPath("//button[contains(., 'Generate report')]")],
            actions:
                [async (page) => await (await page.$x("//button[contains(., 'Generate report')]"))[0].click()],
            postReqs:
                [async (page) => await page.waitForXPath("//button[contains(@class, 'action-download')]")]
        },
        {
            description: "Download Report",
            preReqs:
                [async (page) => page.waitForTimeout(5000),
                async (page) => await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] }),
                async (page) => await page.waitForXPath("//button[contains(@class, 'action-download')]")],
            actions:
                [async (page) => await (await page.$x("//button[contains(@class, 'action-download')]"))[0].click(),
                ],
            postReqs:
                [async (page) => page.waitForTimeout(5000)] //allow document to download
        }
    ]


    let ui = new inquirer.ui.BottomBar();

    // pipe a Stream to the log zone
    console.log("Called with " + JSON.stringify(credentials))
    ui.updateBottomBar('Opening browser.');
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: './executions/' + executionId + '/' });


    await page.setViewport({ width: 1366, height: 1768 });

    let stepNumber = 1
    for (let step of puppeteerSteps) {
        //puppeteerSteps.forEach((step) => {
        if (JSON.stringify(step) !== JSON.stringify({})) {
            logger.info(`Starting: ${step.description}`)
            ui.updateBottomBar(`Starting: ${step.description}`)
            let subStep = 1
            if (step.preReqs != null) {
                for (let preReq of step.preReqs) {
                    logger.info(`Starting: ${step.description} - pre-req: ${String(preReq)}`)
                    await preReq(page)
                    const res = await page.evaluate(() => {

                        return document.documentElement.outerHTML;
                    });
                    if (argv.debug) {
                        const filename = 'executions/' + executionId + '/step_' + stepNumber + 'substep_' + subStep + '.html'

                        fs.writeFile(filename, `${res}`, function (err) {
                            if (err) throw err;
                            logger.info(`Wrote rendered html to ${filename}`);
                        });
                    }


                    subStep++

                }
            }
            if (step.actions != null) {

                for (let action of step.actions) {
                    logger.info(`Starting: ${step.description} - action: ${String(action)}`)
                    await action(page)
                }

                subStep++
            }
            if (step.postReqs != null) {
                for (let postReq of step.postReqs) {
                    logger.info(`Starting: ${step.description} - post-req: ${String(postReq)}`)
                    await postReq(page)
                }

                subStep++
            }
            ui.updateBottomBar(`Completed: ${step.description}`)
            stepNumber++
        }
    }

    await browser.close();
    ui.close()
};

const main = async () => {
    let filename = ''
    if (!argv.file) {
        const credentials = await inquirer
            .prompt([
                {
                    type: 'text',
                    message: 'Enter Vanguard UK Username',
                    name: 'username'
                },
                {
                    type: 'password',
                    message: 'Enter Vanguard UK Password',
                    name: 'password',
                    mask: '*'
                },
            ])

        await downloadVanguardStatement(credentials)
        filename = executionId + '/LoadDocstore.Xls'
    }
    else {
        logger.info('Beginning from already downloaded file ' + argv.file)
        filename = argv.file
    }
    writeBeanFile(filename)

}
const writeBeanFile = (filename) => {
    logger.info("Parsing " + filename)
    let obj = xlsx.parse(filename); // parses a file
    const transactions = []
    for (let sheet of obj) {
        logger.info("Inspect sheet " + sheet.name)
        if (sheet.name !== 'Summary') {
            logger.info("Reading sheet " + sheet.name)
            let rownumber = 0
            let inTable = false
            for (let row of sheet.data) {
                logger.info("Reading row " + rownumber)
                //fine the start fo the investment transaction table
                if (inTable && String(row[0]) != 'Cost') {
                    logger.info("Adding transaction from row " + String(row))
                    transactions.push({
                        account: sheet.data[0][0],
                        date: ExcelDateToJSDate(row[0]),
                        security: row[1].replaceAll(' ', '_'),
                        quantity: row[3],
                        price: row[4],
                        cost: row[5]
                    })
                }
                if (String(row[0]) == 'Date' && rownumber > 5) {
                    logger.info("Found top of transaction table")
                    inTable = true
                }

                rownumber++
            }
        }
        else {
            logger.info("Skipping sheet " + sheet.name)
        }
    }
    console.log(transactions)
    let beanFileOutput = ''
    for (let transaction of transactions) {
        let buystring = transaction.quantity < 0 ? "Selling" : "Buying"
        beanFileOutput += `${transaction.date} * "${buystring} ${transaction.security}"`;
        beanFileOutput += `\n\tAssets:UK:Vanguard:${transaction.account}:${transaction.security}\t\t\t${transaction.quantity} ${transaction.security} {${transaction.price} GBP}`
        beanFileOutput += `\n\tAssets:UK:Vanguard:${transaction.account}:Cash\t\t\t${transaction.cost} GBP\n\n`
    }

    fs.writeFile('beancount.beancount', `${beanFileOutput}`, function (err) {
        if (err) throw err;
        logger.info(`Wrote beanfile to beancount.beancount`);
    });

}

function ExcelDateToJSDate(serial) {
    var utc_days = Math.floor(serial - 25569);
    var utc_value = utc_days * 86400;
    var date_info = new Date(utc_value * 1000);

    var fractional_day = serial - Math.floor(serial) + 0.0000001;

    var total_seconds = Math.floor(86400 * fractional_day);

    var seconds = total_seconds % 60;

    total_seconds -= seconds;

    var hours = Math.floor(total_seconds / (60 * 60));
    var minutes = Math.floor(total_seconds / 60) % 60;

    return date_info.getFullYear() + '-' + String(date_info.getMonth()).padStart(2, '0') + '-' + String(date_info.getDate()).padStart(2, '0');
}


const removeLastPath = (url) => {
    return url.substring(0, url.lastIndexOf('/'));
}

main()



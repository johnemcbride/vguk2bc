let inquirer = require('inquirer');
const puppeteer = require('puppeteer');




const downloadVanguardStatement = async (credentials) => {

    let ui = new inquirer.ui.BottomBar();

    // pipe a Stream to the log zone
    console.log("Called with " + JSON.stringify(credentials))
    ui.updateBottomBar('Opening browser.');
    const browser = await puppeteer.launch({ headless: false });
    const page = await browser.newPage();
    await page._client.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: './' });


    await page.setViewport({ width: 1366, height: 1768 });
    ui.updateBottomBar('Navigating to Vanguard UK');
    await page.goto('https://www.vanguardinvestor.co.uk');


    ui.updateBottomBar('Clearing cookie banner');
    await page.waitForSelector("#bannerButton")

    await page.click("#bannerButton")

    ui.updateBottomBar('Going to login page');
    await page.waitForSelector("#utility-logon")
    await page.click("#utility-logon")


    ui.updateBottomBar('Waiting for login form');
    await page.waitForSelector("#__GUID_1007")
    await page.type("#__GUID_1007", credentials.username)
    await page.type("#__GUID_1008", credentials.password)

    ui.updateBottomBar('Logging in');
    await page.keyboard.press('Enter')

    await page.waitForFunction(() => !document.querySelector("#__GUID_1008"));
    ui.updateBottomBar('Waiting for dashboard');

    await page.screenshot({ path: 'broken.png' });
    await page.waitForSelector("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div.layout-aside-page > div.container.container-page > div > div > div:nth-child(3) > table > thead > tr > th.cell-30")
    let documentsUrl = removeLastPath(page.url()) + "/document/document"

    ui.updateBottomBar('Going to documents page');
    await page.goto(documentsUrl)
    await page.waitForSelector("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div.tabs-highlighted > div.tabs > div:nth-child(2) > a")

    ui.updateBottomBar('Scrolling Down & Clicking generate report');
    page.$eval("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div:nth-child(2) > div.row > div:nth-child(1) > div > div > div.col-fluid.col-right.col-xxs-order-1 > button", e => {
        e.scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' });
    });
    await page.screenshot({ path: 'afterscroll.png' });
    //await page.querySelector("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div:nth-child(2) > div.row > div:nth-child(1) > div > div > div.col-fluid.col-right.col-xxs-order-1 > button")
    //    .scrollIntoView({ behavior: 'smooth', block: 'end', inline: 'end' })
    await page.click("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div:nth-child(2) > div.row > div:nth-child(1) > div > div > div.col-fluid.col-right.col-xxs-order-1 > button")
    //await page.click("body > div:nth-child(7) > div > div.layout-aside-wrap > div > div:nth-child(2) > div:nth-child(1) > div > div.container.container-page > div:nth-child(2) > div.row > div:nth-child(1) > div > div > div.col-fluid.col-right.col-xxs-order-1 > button")


    ui.updateBottomBar('Choosing Client Transaction Listing - Excel');
    ui.updateBottomBar('Waiting for popup transition to complete...');
    await page.waitForTimeout(500); //hack to wait for transition
    const reportSelector = (await page.$x("//select[contains(., 'Choose a report')]"))[0];


    ui.updateBottomBar('...moving on');
    await page.screenshot({ path: 'reportgenerator.png' });
    await reportSelector.select("3")
    await page.screenshot({ path: 'afterselection.png' });


    // //todo select start date to be ages ago

    ui.updateBottomBar('Clicking Generate report');
    await page.waitForXPath("//button[contains(., 'Generate report')]")
    const elements = await page.$x("//button[contains(., 'Generate report')]")
    await elements[0].click()


    ui.updateBottomBar('Waiting for report - will refresh in five seconds');
    await page.waitForTimeout(5000); //hack to wait for transition
    await page.screenshot({ path: 'vanguard.png' });
    await page.reload({ waitUntil: ["networkidle0", "domcontentloaded"] });

    await page.waitForXPath("//button[contains(@class, 'action-download')]")


    await page.screenshot({ path: 'vanguard.png' });

    const buttons = await page.$x("//button[contains(@class, 'action-download')]")


    await buttons[0].click()
    ui.updateBottomBar('Clicked download, waiting a few seconds before closing browser');
    await page.waitForTimeout(5000); //hack to wait for transition

    await browser.close();
    ui.close()
};

const main = async () => {
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

}

const removeLastPath = (url) => {
    return url.substring(0, url.lastIndexOf('/'));
}

main()



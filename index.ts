import dotenv from 'dotenv';
import puppeteer from 'puppeteer-extra';
// Add stealth plugin and use defaults (all tricks to hide puppeteer usage)
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
// Add adblocker plugin to block all ads and trackers (saves bandwidth)
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';
import {getEdgePath} from "edge-paths";
import {GoogleTrends} from "./googleTrend.js";
import {Page} from 'puppeteer';

dotenv.config();

puppeteer.use(StealthPlugin())

puppeteer.use(AdblockerPlugin({blockTrackers: true}))

const REWARD_PAGE_URL = 'https://rewards.bing.com/';
if (process.env['BING_USERNAME'] === undefined || process.env['BING_PASSWORD'] === undefined) {
    throw new Error('BING_USERNAME and BING_PASSWORD must be set in .env file');
}
const BING_USERNAME = process.env['BING_USERNAME']
const BING_PASSWORD = process.env['BING_PASSWORD'];

/**
 * Wait for a given amount of time
 * @param {number} ms - The amount of time to wait in milliseconds
 * @returns {Promise} - A promise that resolves after the given amount of time
 */
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Make research on Bing
 * @param client - The puppeteer client
 * @param {string} query - The query to search
 */
const search = async (client: Page, query: string | undefined) => {
    await client.goto(`https://www.bing.com/search?q=${query}`);
    await wait(1000);
};

/**
 * Login to Bing
 * @param client - The puppeteer client
 * @returns {Promise<void>} - A promise that resolves after the login
 */
const bingLoginAction = async (client: Page) => {
    await client.goto(REWARD_PAGE_URL);
    await client.type('#i0116', BING_USERNAME);
    await client.click('#idSIButton9');
    await client.waitForSelector('#i0118');
    await client.type('#i0118', BING_PASSWORD);
    await wait(500);
    await client.click('#idSIButton9');
    await client.waitForNavigation();
    console.log('Logged in');
};

/**
 * Get Google Trend and make research on Bing on PC and mobile agent
 * @param client - The puppeteer client
 */
const searchAction = async (client: Page) => {
    const googleTrends = new GoogleTrends();
    const googleTrendTab = await googleTrends.getGoogleTrends(client);
    if (googleTrendTab != null) {
        console.log("Recherche des tendances Google avec un user agent PC");
        await client.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36');
        for (let i = 0; i < googleTrendTab.length; i++) {
            await search(client, googleTrendTab[i]?.query);
        }
        console.log("Recherche des tendances Google avec un user agent mobile");
        await client.setUserAgent('Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Mobile Safari/537.36');
        for (let i = 0; i < googleTrendTab.length; i++) {
            await search(client, googleTrendTab[i]?.query);
        }
    } else {
        console.log("No Google Trend");
    }
}

puppeteer.launch({
    headless: false,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
    executablePath: getEdgePath()
}).then(async browser => {
    const Page = await browser.newPage();
    await Page.setViewport({width: 1200, height: 700});
    await Page.setDefaultNavigationTimeout(60000);

    //Login
    await bingLoginAction(Page);

    // Get Google Trend
    await searchAction(Page);

    // Set user agent to default
    await Page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36');

    await browser.close();
});
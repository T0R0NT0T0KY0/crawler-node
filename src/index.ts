import fs from "node:fs/promises";
import puppeteer, { Page } from "puppeteer";

const OUTPUT_DIR = __dirname+"/выкачка";
const INDEX_FILE = __dirname+"/index.txt";

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

async function parse(page: Page, url: string) {
    await page.goto(url);
    // Получить HTML-код страницы
    const html = await page.content();

    if (html.includes("Доступ закрыт")) {
        throw new Error("Forbidden")
    }
    return html;
}

async function run() {
    const browser = await puppeteer.launch();
    const page = await browser.newPage();

    const basePath = "https://habr.com/ru/articles/";
    const startArticleId = 20000;
    const maxCount = 100;
    let currentCount = 0;

    for (let articleId = startArticleId; maxCount > currentCount; articleId++) {
        const url = `${basePath}${articleId}`;

        const filename = `habr-article-${articleId}.html`;

        console.log(`Download ${articleId}`);
        try {
           const html = await parse(page, url);

            // Записать HTML-код в файл
            await fs.writeFile(`${OUTPUT_DIR}/${filename}`, html, { flag: "wx" });

            // Записать номер файла и ссылку в index.txt
            await fs.appendFile(
               INDEX_FILE,
               `${filename}: ${url}\n`,
            );

            ++currentCount;
            console.log(`Saved ${articleId} ${currentCount}`);
        } catch (e) {
            console.log(`Error ${articleId}.  ${e.message}`);
        }
        await sleep(2000);
    }

    await browser.close();
}

run();

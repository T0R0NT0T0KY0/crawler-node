import * as cheerio from "cheerio";
import { PorterStemmerRu } from "natural";
import path, { join } from "path";
import { readdir, readFile, writeFile } from "fs/promises";

const FILES_DIR = __dirname + "/выкачка";
const OUTPUT_DIT = __dirname + "/tf-idf";
const OUTPUT_DIT_LEMMA = __dirname + "/lemma-tf-idf";
const TOKENS_FILE = path.join(__dirname, "../tokens.txt");

const tokens: string[] = [];
const tokenFileUsage = new Map<string, number>()
const tokenFileUsageWithLemma = new Map<string, number>()
let documentCount: number = 0; // To store the total number of documents

function tokensFileUsage(documentText: string) {
    const words = [...new Set(documentText.split(/\W+/).map((token) => token.toLowerCase()))];

    words.map((token) => tokenFileUsage.set(token, tokenFileUsage.get(token) + 1))

    const wordsSetWithLemma = [...new Set(documentText.split(/\W+/).map((token) => PorterStemmerRu.stem(token.toLowerCase())))];

    wordsSetWithLemma.map((token) => tokenFileUsageWithLemma.set(token, tokenFileUsage.get(token) + 1))
}

function countTf(documentText: string) {
    const termFrequencies = new Map<string, number>(tokens.map(token => [token, 0]));
    const words = documentText.split(/\W+/);

    // Podschet chastoty kazhdogo slova (Frequency counting)
    for (const word of words) {
        const key = word.toLowerCase();
        if (!termFrequencies.has(key)) continue;
        termFrequencies.set(key, termFrequencies.get(key) + 1);
    }

    for (const term of tokens) {
        termFrequencies.set(term, termFrequencies.get(term) / words.length);
    }

    return termFrequencies;
}

function countTfWithLemma(documentText: string) {
    const termFrequencies = new Map<string, number>(tokens.map(token => [PorterStemmerRu.stem(token), 0]));
    const words = documentText.split(/\W+/);

    for (const word of words) {
        const key = PorterStemmerRu.stem(word.toLowerCase());
        if (!termFrequencies.has(key)) continue;
        termFrequencies.set(key, termFrequencies.get(key) + 1);
    }

    for (const term of tokens) {
        termFrequencies.set(term, termFrequencies.get(term) / words.length);
    }

    return termFrequencies;
}

function calculateIdf() {
    const idf: Map<string, number> = new Map();

    for (const term of tokens) {
        const documentCountWithTerm = tokenFileUsage.get(term);


        const idfValue = Math.log(documentCount / (documentCountWithTerm + 1));
        idf.set(term, idfValue);
    }

    return idf;
}

function calculateIdfWithLemma() {
    const idf: Map<string, number> = new Map();

    for (const term of tokens) {
        const documentCountWithTerm = tokenFileUsageWithLemma.get(term);


        const idfValue = Math.log(documentCount / (documentCountWithTerm + 1));
        idf.set(term, idfValue);
    }

    return idf;
}

async function calculateTfIdf() {
    const parsedTokens = (await readFile(TOKENS_FILE, 'utf-8')).split('\n');
    tokens.push(...parsedTokens);
    parsedTokens.map(token => (tokenFileUsage.set(token, 0), tokenFileUsageWithLemma.set(PorterStemmerRu.stem(token), 0)));
    let tfl: Map<string,number>;
    let idfl: Map<string,number>;
    const fileNames = await readdir(FILES_DIR);
    documentCount = fileNames.length; // Update document count
    for (const fileName of fileNames) {
        const htmlFile = await readFile(path.join(FILES_DIR, fileName), 'utf-8');
        const cheerioApi = cheerio.load(htmlFile);
        const text = cheerioApi("body").text();
        tfl = countTfWithLemma(text);
        idfl = calculateIdfWithLemma();

        tokensFileUsage(text)
    }

    for (const fileName of fileNames) {
        const htmlFile = await readFile(path.join(FILES_DIR, fileName), 'utf-8');
        const cheerioApi = cheerio.load(htmlFile);
        const text = cheerioApi("body").text();
        const tf = countTf(text);

        const idf = calculateIdf();

        const res = tokens.map(token => {
            const idfValue = idf.get(token);
            const tfValue = tf.get(token);
            return `${token} ${idfValue} ${tfValue} ${tfValue - idfValue}`;
        })
        const resWithLemma = tokens.map(token => {
            const idfValue = idfl.get(token);
            const tfValue = tfl.get(token);
            return `${token} ${idfValue} ${tfValue} ${tfValue - idfValue}`;
        })

        await writeFile(join(OUTPUT_DIT, fileName.replace(".html", ".txt")), res.join("\n"), { flag: "w" });
        await writeFile(join(OUTPUT_DIT_LEMMA, fileName.replace(".html", ".txt")), resWithLemma.join("\n"), { flag: "w" });
    }

}

calculateTfIdf();

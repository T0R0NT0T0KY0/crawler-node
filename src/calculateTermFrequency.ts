import * as cheerio from "cheerio";
import { PorterStemmerRu, WordTokenizer } from "natural";
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
    const tokenizer = new WordTokenizer();
    const currentTokens = tokenizer.tokenize(documentText).map((token) => token.toLowerCase());

    const words = [...new Set(currentTokens)];

    words.map((token) => tokenFileUsage.set(token, tokenFileUsage.get(token) + 1))

    const wordsWithLemma = [...new Set(words.map((token) => PorterStemmerRu.stem(token)))];

    wordsWithLemma.map((token) => tokenFileUsageWithLemma.set(token, tokenFileUsageWithLemma.get(token) + 1))
}

function calculateTf(documentText: string) {
    const termFrequencies = new Map<string, number>(tokens.map(token => [token, 0]));

    const tokenizer = new WordTokenizer();
    const currentTokens = tokenizer.tokenize(documentText);

    // Podschet chastoty kazhdogo slova (Frequency counting)
    for (const token of currentTokens) {
        const key = token.toLowerCase();
        if (!termFrequencies.has(key)) continue;
        termFrequencies.set(key, termFrequencies.get(key) + 1);
    }

    for (const [key, value] of [...termFrequencies.entries()]) {
        termFrequencies.set(key, value / currentTokens.length);
    }

    return termFrequencies;
}

function calculateTfWithLemma(documentText: string) {
    const termFrequencies = new Map<string, number>(tokens.map(token => [PorterStemmerRu.stem(token), 0]));

    const tokenizer = new WordTokenizer();
    const currentTokens = tokenizer.tokenize(documentText);

    for (const token of currentTokens) {
        const key = PorterStemmerRu.stem(token.toLowerCase());
        if (!termFrequencies.has(key)) continue;
        termFrequencies.set(key, termFrequencies.get(key) + 1);
    }

    for (const term of tokens) {
        termFrequencies.set(term, termFrequencies.get(term) / currentTokens.length);
    }

    return termFrequencies;
}

function calculateIdf() {
    const idf: Map<string, number> = new Map();

    for (const term of tokens) {
        const documentCountWithTerm = tokenFileUsage.get(term);


        const idfValue = Math.log(documentCount / documentCountWithTerm);
        idf.set(term, idfValue);
    }

    return idf;
}

function calculateIdfWithLemma() {
    const idf: Map<string, number> = new Map();
    const tokensWithLemma = [...new Set(tokens.map(token => PorterStemmerRu.stem(token)))];
    for (const term of tokensWithLemma) {
        const documentCountWithTerm = tokenFileUsageWithLemma.get(term);

        const idfValue = Math.log(documentCount / documentCountWithTerm);
        idf.set(term, idfValue);
    }

    return idf;
}

async function calculateTfIdf() {
    const parsedTokens = (await readFile(TOKENS_FILE, 'utf-8')).split('\n');
    tokens.push(...parsedTokens);
    parsedTokens.map(token => (tokenFileUsage.set(token, 0), tokenFileUsageWithLemma.set(PorterStemmerRu.stem(token), 0)));
    const fileNames = await readdir(FILES_DIR);
    documentCount = fileNames.length; // Update document count
    for (const fileName of fileNames) {
        const htmlFile = await readFile(path.join(FILES_DIR, fileName), 'utf-8');
        const cheerioApi = cheerio.load(htmlFile);
        const text = cheerioApi("body").text();

        tokensFileUsage(text)
    }

    const idf = calculateIdf();
    const idfl = calculateIdfWithLemma();

    for (const fileName of fileNames) {
        const htmlFile = await readFile(path.join(FILES_DIR, fileName), 'utf-8');
        const cheerioApi = cheerio.load(htmlFile);
        const text = cheerioApi("body").text();
        const tf = calculateTf(text);
        const tfl = calculateTfWithLemma(text);


        const res = [...idf].map(([token, idfValue]) => {
            const tfValue = tf.get(token);
            return `${token} ${idfValue} ${tfValue - idfValue}`;
        })
        const resWithLemma = [...idfl].map(([token, idfValue]) => {
            const tfValue = tfl.get(token);
            return `${token} ${idfValue} ${tfValue - idfValue}`;
        })

        await writeFile(join(OUTPUT_DIT, fileName.replace(".html", ".txt")), res.join("\n"), { flag: "w" });
        await writeFile(join(OUTPUT_DIT_LEMMA, fileName.replace(".html", ".txt")), resWithLemma.join("\n"), { flag: "w" });
    }

}

calculateTfIdf();

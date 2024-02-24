import * as cheerio from "cheerio";
import { readdir, readFile, writeFile } from "fs/promises";
import { WordTokenizer, PorterStemmerRu, stopwords } from "natural";
import { join } from "path";

const FILES_DIR = __dirname+"/выкачка";
const TOKENS_FILE = __dirname+"/tokens.txt";
const LEMMATIZED_TOKENS_FILE = __dirname+"/lemmatized-tokens.txt";

export const blackSet: Set<Lowercase<string>> = new Set([
	"также",
	"можно",
	"могут",
	"может",
	"будет",
	"перед",
	"после",
	"этот",
	"имеют",
	"имеет",
	"такая",
	"станет",
	"отлично",
	"всей",
	"подходит",
	"более",
	"которые",
	"чтобы",
	"хотя",
	"какими",
	"какую",
	"какой",
	"какие",
	"какие",
	"какая",
	"какого",
	"каком",
	"какое",
	"каких",
	// add new
]);

const stopwordsSet = new Set(stopwords);


async function readHtmlFileNamesFromDirectory(directoryPath: string): Promise<string[]> {
	const fileNames = await readdir(directoryPath);

	return fileNames
		.filter(file => file.endsWith(".html"));
}

function filterTokens(token: string) {
	return token.length > 3 && !/[\d"'+a-z«»“„]/g.test(token) && !stopwordsSet.has(token) && !blackSet.has(token.toLowerCase() as Lowercase<string>) && /^[а-яёА-ЯЁ]+$/i.test(token)
}


function extractTokensFromHtml(htmlFile: string): string[] {
	const cheerioApi = cheerio.load(htmlFile);
	const text = cheerioApi("body").text();
	const tokenizer = new WordTokenizer();
	const tokens = tokenizer.tokenize(text);

	return tokens.filter(filterTokens);
}

async function writeTokens(tokens: string[]) {
	await writeFile(TOKENS_FILE, tokens.join("\n"), { flag: "w" });
}

async function writeLemmatizedTokens(lemmatizedTokens: [string, Set<string>][]) {
	const data = lemmatizedTokens.map(([lemma, tokens]) => `${lemma} ${Array.from(tokens).join(" ")}`).join("\n");

	await writeFile(LEMMATIZED_TOKENS_FILE, data, { flag: "w" });
}

async function run() {
	const fileNames = await readHtmlFileNamesFromDirectory(FILES_DIR);
	const tokensSet = new Set<string>();
	const lemmaTokensMap = new Map<string, Set<string>>();

	await Promise.all(fileNames.map(async (fileName) => {
		console.time(fileName);
		const file = await readFile(join(FILES_DIR, fileName), "utf-8");
		const htmlTokens = extractTokensFromHtml(file);

		htmlTokens.forEach((token) => {
			const lowerToken = token.toLowerCase();
			tokensSet.add(lowerToken);
			const lemma = PorterStemmerRu.stem(lowerToken); // Лемматизация
			const lemmaTokens = lemmaTokensMap.get(lemma);

			if (!lemmaTokens) {
				return lemmaTokensMap.set(lemma, new Set([lowerToken]));
			}

			lemmaTokens.add(lowerToken);
		});

		console.timeEnd(fileName);
	}));


	await Promise.all([writeTokens(Array.from(tokensSet)), writeLemmatizedTokens(Array.from(lemmaTokensMap))]);
}

run();

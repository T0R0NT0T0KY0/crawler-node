import * as cheerio from "cheerio";
import * as fs from "fs";
import { readFile } from "fs/promises";
import { join } from "path";

interface IndexEntry {
	index: string;
	filename: string;
}

interface InvertedIndexEntry {
	count: number;
	inverted_array: string[];
	word: string;
}

const FILES_DIR = __dirname+"/выкачка";
const INDEX_FILE_NAME = "index.csv"; // Укажите путь к вашему файлу index.csv
const OUTPUT_FILE_NAME = "../inverted_index.txt";
const OUTPUT_FILE_NAME_V2 = "../inverted_index_2.txt";

async function createInvertedIndex(): Promise<void> {
	// Read index.csv file
	const indexContent: string = fs.readFileSync(INDEX_FILE_NAME, "utf-8");
	const indexEntries: IndexEntry[] = indexContent.split("\n")
		.map(line => line.trim())
		.filter(line => line !== "")
		.map(line => {
			const [index, filename] = line.split(/\s+/);
			return { index, filename };
		});

	// Create inverted index
	const invertedIndex: Map<string, InvertedIndexEntry> = new Map();
	for (const { index, filename } of indexEntries) {
		const file = await readFile(join(FILES_DIR, filename), "utf-8");
		const cheerioApi = cheerio.load(file);
		const fileContent = cheerioApi("body").text();
		const words = fileContent.split(/[\s\n\.\,\"\'\:\?\!\»\«\…]+/).filter((text) => text).map((text) => text.toLowerCase().replace(/^[-\(\[\/]*|[\)\]]*$/g, ''));
		const uniqueWords = Array.from(new Set(words));

		for (const word of uniqueWords) {
			if (invertedIndex.has(word)) {
				const entry = invertedIndex.get(word)!;
				entry.count++;
				entry.inverted_array.push(index);
			} else {
				invertedIndex.set(word, {
					count: 1,
					inverted_array: [index],
					word: word,
				});
			}
		}
	}

	// Write inverted index to file
	const outputStream = fs.createWriteStream(OUTPUT_FILE_NAME);
	const outputStreamV2 = fs.createWriteStream(OUTPUT_FILE_NAME_V2);
	for (const entry of invertedIndex.values()) {
		const outputLine = JSON.stringify(entry)+"\n";
		outputStreamV2.write(outputLine);

		outputStream.write(`${entry.word} ${entry.inverted_array.join(" ")}`);
	}
	outputStream.close();

	console.log(`Inverted index created and saved to ${OUTPUT_FILE_NAME} and ${OUTPUT_FILE_NAME_V2}`);
}

createInvertedIndex().catch(console.error);

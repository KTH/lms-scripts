require("dotenv").config();
const Canvas = require("@kth/canvas-api").default;
import * as csv from "fast-csv";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

// @ts-ignore
import type { course, submission, assignment } from "./types.ts";
const canvas = new Canvas(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_KEY
);

function createCsvSerializer(name) {
  const writer = fs.createWriteStream(name);
  const serializer = csv.format({ headers: true });
  serializer.pipe(writer);
  return serializer;
}

async function start() {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  const dir = path.join(baseDir, "csv");
  fs.mkdirSync(dir);
  console.log(`Creating csv files in ${dir}`);
  const resultCsv = createCsvSerializer(`${dir}/import-exams-stats.csv`);
  console.log("hti");
  resultCsv.end();
}

start();

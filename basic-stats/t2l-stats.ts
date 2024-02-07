require("dotenv").config();
const Canvas = require("@kth/canvas-api").default;
import * as csv from "fast-csv";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_CONNECTION_STRING || "");

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
  await client.connect();
  console.log("connected to the server");
  const collection = client.db("transfer-to-ladok").collection("transfers_1.1");
  const docs = await collection.find({});
  console.log(docs);
  // const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  // const dir = path.join(baseDir, "csv");
  // fs.mkdirSync(dir);
  // console.log(`Creating csv files in ${dir}`);
  // const resultCsv = createCsvSerializer(`${dir}/import-exams-stats.csv`);
  // console.log("hti");
  // resultCsv.end();

  client.close();
}

start();
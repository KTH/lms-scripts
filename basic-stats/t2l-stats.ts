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
type T2LDocument = {
  _id: any;
  user: {
    canvasId: number;
    email: string;
  };
  parameters?: { courseId: string; destination: any };
  results?: any[];
  summary?: { success: number; error: number };
};
function createCsvSerializer(name) {
  const writer = fs.createWriteStream(name);
  const serializer = csv.format({ headers: true });
  serializer.pipe(writer);
  return serializer;
}

async function start() {
  await client.connect();
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "sync-"));
  const dir = path.join(baseDir, "csv");
  fs.mkdirSync(dir);
  console.log(`Creating csv files in ${dir}`);
  const resultCsv = createCsvSerializer(`${dir}/t2l-stats.csv`);
  console.log("connected to the server");
  const db = client.db("transfer-to-ladok");

  const docs: T2LDocument[] = [
    ...(await db.collection<T2LDocument>("transfers").find({}).toArray()),
    ...(await db.collection<T2LDocument>("transfers_1.1").find({}).toArray()),
  ];

  // TODO: using slice to subset the data
  for await (const doc of docs) {
    // console.log(doc);
    // for await (const doc of docs.slice(0, 4)) {
    const { body: canvasCourse } = await canvas.get(
      `courses/${doc.parameters?.courseId}`
    );
    const { body: account } = await canvas.get(
      `accounts/${canvasCourse.account_id}`
    );
    const accountName = account.name
      .replaceAll(" - Examinations", "")
      .replaceAll(" - Imported course rounds", "");
    // console.log(doc);
    let dateString;
    try {
      dateString = doc._id.getTimestamp().toLocaleDateString("Sv");
    } catch (e) {
      // Our custom id:s are in date format already
      dateString = doc._id;
    }
    // console.log(doc);

    const result = {
      school: accountName,
      created_at: `${dateString.substring(0, 7)}`,
      error: doc.summary?.error,
      success: doc.summary?.success,
      user_id: doc.user.canvasId,
      courseId: doc.parameters?.courseId,
      type: doc.parameters?.destination.aktivitetstillfalle
        ? "examinationsrum"
        : "kursrum",
    };
    process.stdout.write(".");
    await new Promise<void>((resolve, reject) => {
      resultCsv.write(result, (err) => {
        if (err) reject(err);
        resolve();
      });
    });
  }

  resultCsv.end();

  client.close();
}

start();

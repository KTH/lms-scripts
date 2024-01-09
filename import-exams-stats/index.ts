require("dotenv").config();
const Canvas = require("@kth/canvas-api").default;
import * as csv from "fast-csv";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";

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

  const courses = canvas.listItems("accounts/1/courses");

  // Now `courses` is an iterator that goes through every course
  for await (const course of courses) {
    const assignments = canvas.listItems(`courses/${course.id}/assignments`);
    for await (const assignment of assignments) {
      if (assignment.integration_data?.ladokId) {
        console.log(
          `Assignment is created by import exams: ${assignment.name}`
        );
      } else {
        process.stdout.write(".");
      }
    }
    // resultCsv.write(course);
  }
  resultCsv.end();
}

start();

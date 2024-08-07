import fs from "node:fs";
import { parse } from "csv-parse";

async function run() {
  const records = [];
  const parser = fs.createReadStream(`course-rooms.csv`).pipe(
    parse({
      // CSV options if any
    })
  );
  for await (const record of parser) {
    // Work with each record
    const [
      canvas_course_id,
      course_id,
      integration_id,
      short_name,
      long_name,
      canvas_account_id,
      account_id,
      canvas_term_id,
      term_id,
      status,
      start_date,
      end_date,
      course_format,
      canvas_blueprint_course_id,
      blueprint_course_id,
      created_by_sis,
    ] = record;
    records.push({ course_id, short_name, status });
  }
  console.log(records);
  return records;
}
run();

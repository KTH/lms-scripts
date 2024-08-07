import fs from "node:fs";
import { parse } from "csv-parse";
import { request } from "undici";

async function run() {
  // const records = [];
  const parser = fs.createReadStream(`course-rooms.csv`).pipe(
    parse({
      // CSV options if any
    })
  );
  let i = 0;
  const courseRounds: any[] = [];
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

    // First row is header
    if (i !== 0) {
      // Find the course round in Kopps, to get the roundId
      const courseCode = short_name.split(" ")[0];
      const koppsUrl = `https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`;

      console.log(koppsUrl);
      const { statusCode, headers, trailers, body } = await request(koppsUrl);
      const detailedinformation: any = await body.json();
      const { roundInfos } = detailedinformation;

      const matchingRound = roundInfos.find(
        (roundInfo: any) => roundInfo.round.ladokUID === course_id
      );

      // console.log("matchingRound", matchingRound);
      // TODO: Same format as course/offerings?
      courseRounds.push({
        course_id,
        short_name,
        status,
        courseCode,
        round: matchingRound.round,
      });
      // break;
    }
    i++;
  }
  fs.writeFileSync(
    "course-rooms-with-rounds.json",
    JSON.stringify(courseRounds, null, 2)
  );
}
run();

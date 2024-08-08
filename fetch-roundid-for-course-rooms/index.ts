import fs from "node:fs";
import { parse } from "csv-parse";
import { request } from "undici";

require("dotenv").config();
const canvasApiUrl = process.env.CANVAS_API_URL;
const canvasApiToken = process.env.CANVAS_API_TOKEN;

import CanvasApi from "@kth/canvas-api";
const canvas = new CanvasApi(canvasApiUrl as string, canvasApiToken as string);

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
    const [canvas_course_id, course_id] = record;

    // First row is header
    i++;
    if (i <= 1) continue;
    if (!course_id) continue; // Skip course rooms without sis_id
    //
    // Some course rooms can have multiple sections, one per course round
    const { body: sections } = await canvas.get(
      `courses/${canvas_course_id}/sections`
    );

    /** Example section
     * {
    id: 67257,
    course_id: 50374,
    name: 'SF1624 HT24 (CINTE1)',
    start_at: null,
    end_at: null,
    created_at: '2024-02-02T03:36:23Z',
    restrict_enrollments_to_section_dates: false,
    nonxlist_course_id: 50378,
    sis_section_id: 'a8611bb8-9a88-11ee-bfe5-0721067a4fbf',
    sis_course_id: '0772a941-98c8-11ee-888d-8a62d8d3440a',
    integration_id: null,
    sis_import_id: 1745682
  },
     */
    for await (const section of sections as any[]) {
      if (!section.sis_section_id) continue;

      const courseCode = section.name.split(" ")[0];
      const koppsUrl = `https://api.kth.se/api/kopps/v2/course/${courseCode}/detailedinformation`;
      console.log(koppsUrl, " for course with id: ", canvas_course_id);

      try {
        const { body } = await request(koppsUrl);
        const detailedinformation: any = await body.json();
        const { roundInfos } = detailedinformation;

        const matchingRound = roundInfos.find(
          (roundInfo: any) =>
            roundInfo.round.ladokUID === section.sis_section_id
        );

        // console.log("matchingRound", matchingRound);
        // TODO: Same format as course/offerings?
        courseRounds.push({
          courseCode,
          firstYearSemester: "20242", // Not used when enrolling
          roundId: matchingRound.round.ladokRoundId,
          language: "Svenska",
          schoolCode: "ABE", // Not used when enrolling
          ladokUID: section.sis_section_id,
          applicationCode: "12345", // Not used when enrolling
          title: {
            sv: "Svensk titel", // Not used when enrolling
            en: "English title", // Not used when enrolling
          },
          startTerm: "20242", // Not used when enrolling
          offeredSemesters: [
            // Not used when enrolling
            {
              semester: "20242",
              startDate: "2024-10-30",
              endDate: "2024-01-15",
            },
          ],
        });
      } catch (error) {
        console.error(`Error fetching course from Kopps ${koppsUrl}`, error);
      }
      break;
    }
  }
  fs.writeFileSync(
    "course-rooms-with-rounds.json",
    JSON.stringify(courseRounds, null, 2)
  );
}
run();

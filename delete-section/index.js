import "dotenv/config.js";
import CanvasAPI from "@kth/canvas-api";
import inquirer from "inquirer";

console.log(process.env.CANVAS_API_URL);
const canvas = new CanvasAPI(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_TOKEN
);

const { sectionId } = await inquirer.prompt({
  name: "sectionId",
  message: "Write the section ID",
});

const { body: section } = await canvas.get(`sections/${sectionId}`);

console.log(`Section name is ${section.name}`);
console.log("Getting enrollments");

const enrollments = await canvas
  .list(`sections/${sectionId}/enrollments`, {
    role: ["StudentEnrollment"],
  })
  .toArray();
console.log(`Obtained ${enrollments.length} enrollments`);

const { proceed } = await inquirer.prompt({
  name: "proceed",
  message: "Proceed?",
  type: "confirm",
});

if (proceed) {
  for (const e of enrollments) {
    await canvas.requestUrl(
      `courses/${e.course_id}/enrollments/${e.id}`,
      "DELETE",
      {
        task: "delete",
      }
    );

    console.log(`Deleted ${e.sis_user_id} (${e.user.short_name})`);
  }
}

require('dotenv').config()
const CanvasApi = require("@kth/canvas-api");

const canvas = new CanvasApi(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_TOKEN
);

async function start() {
  const courses = canvas.list("accounts/1/courses/", {per_page:100, page: 800});

  for await (const course of courses) {
    const assignments = await canvas.list(`courses/${course.id}/assignments`)
    for await (const assignment of assignments){
      // console.log(assignment.name)
      if(assignment.name === 'Unnamed quiz'){
        console.log('\nProblematic quiz?', course.sis_course_id ,`${process.env.CANVAS_API_URL}/courses/${course.id}/assignments/${assignment.id}`)
      }else{
        process.stdout.write('.')
      }
    }
  }

}
start();

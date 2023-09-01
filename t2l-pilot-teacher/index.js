const { default: CanvasApi, minimalErrorHandler } = require("@kth/canvas-api");
require("dotenv").config();

const courses = [
  42415, 41991, 38955, 41992, 41411, 42467, 39768, 39768, 41780, 43414, 43204,
  43589, 34768, 36066, 35088, 41954, 35292, 37651, 35087, 35714, 38003, 37553,
  37555, 41500, 37008, 35116, 37743, 41416, 42000, 34769, 45729, 37733, 41418,
];

console.log(process.env.CANVAS_API_URL, "::::::::::");
const canvasApi = new CanvasApi(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_KEY
);

async function run() {
  for await (const id of courses) {
    const course = await canvasApi
      .get(`courses/${id}?include[]=teachers`)
      .then((res) => res.body);

    console.log(course);
  }
}
run();

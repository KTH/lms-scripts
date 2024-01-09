require("dotenv").config();
const Canvas = require("@kth/canvas-api").default;

const canvas = new Canvas(
  process.env.CANVAS_API_URL,
  process.env.CANVAS_API_KEY
);
async function start() {
  console.log("Making a GET request to /accounts/1");

  const { body } = await canvas.get("accounts/1");
  console.log(body);
}

start();

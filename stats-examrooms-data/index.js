require("dotenv").config();
const got = require("got");
const csv = require('fast-csv')
const path = require("path")
const fs = require('fs')

function* dateRange (start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T23:59:59Z`);

  for (let date = startDate; date < endDate; date.setDate(date.getDate() + 1)) {
    yield date.toISOString().split("T")[0];
  }
}

async function getExaminations (date) {
  console.log(`Getting examinations from ${date}`)
  const { body } = await got(
    `${process.env.AKTIVITETSTILLFALLEN_API_URL}/aktivitetstillfallen/students?fromDate=${date}&toDate=${date}`,
    {
      responseType: 'json',
      headers: {
        canvas_api_token: process.env.AKTIVITETSTILLFALLEN_API_TOKEN
      }
    }
  )

  return body.aktivitetstillfallen.map((akt, i) => ({
    uid: akt.ladokUID,
    date: akt.date,
    type: body.aktivitetstillfallenraw[i].type.Kod,
    activities: akt.aktiviteter.map(a => `${a.courseCodes.join('/')} ${a.activityCode}`),
    courseCodes: akt.aktiviteter.flatMap(a => a.courseCodes),
    school: akt.aktiviteter[0].courseOwner,
  }))
}
async function start () {
  const range = dateRange("2020-04-01", "2021-01-15")

  const filePath = path.resolve(__dirname, "exam-list-1.csv")
  const writer = fs.createWriteStream(filePath)
  const stream = csv.format({ headers: true })
  stream.pipe(writer)

  for (const date of range) {
    const exams = await getExaminations(date);
    for (const exam of exams) {
      console.log(`Exam ${exam.uid}`)
      stream.write(exam);
    }
  }

  stream.end();

  await new Promise((resolve, reject) => {
    writer1.on('error', reject)
    writer1.on('finish', resolve)
  })
}

start();

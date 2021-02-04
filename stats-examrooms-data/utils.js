const got = require("got");

function * dateRange (start, end) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T23:59:59Z`);

  for (let date = startDate; date < endDate; date.setDate(date.getDate() + 1)) {
    yield date.toISOString().split("T")[0];
  }
}

async function getOneDayExaminations (date) {
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

async function * getExaminations (start, end) {
  const range = dateRange(start, end)

  for (const date of range) {
    const exams = await getOneDayExaminations(date);
    for (const exam of exams) {
      yield exam;
    }
  }
}

module.exports = {
  getExaminations
}

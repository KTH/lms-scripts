var inquirer = require('inquirer')

console.log(`Välkommen! Detta program skapar upp csv-filer
  för att importera i Canvas.
  Välj dina alternativ nedan.
  `)
async function run () {
  const {choice} = await inquirer.prompt(
    {
      message: 'Vad vill du skapa för fil?',
      name: 'choice',
      choices: [
        {name: 'För att ta bort antagna ur samtliga kurser i Canvas', value: 'createUnenrollmentFile'},
        {name: 'För att lägga till antagna i perioder i Canvas', value: 'createAntagnaEnrollmentFile'},
        {name: 'För att skapa upp kurser, sektioner och enrollments i Canvas', value: 'createCoursesSectionsEnrollment'}
      ],
      type: 'list'
    })
  switch (choice) {
    case 'createCoursesSectionsEnrollment':
      const createCoursesSectionsEnrollment = require('./createCoursesSectionsEnrollmentsFile.js')
      await createCoursesSectionsEnrollment()
      break
    case 'createAntagnaEnrollmentFile':
      const createAntagnaEnrollmentFile = require('./createAntagnaEnrollmentFile.js')
      try {
        await createAntagnaEnrollmentFile()
      } catch (e) {
        console.log(e)
      }
      break
    case 'createUnenrollmentFile':
      const createUnenrollmentFile = require('./createUnenrollmentFile.js')
      await createUnenrollmentFile()
      break
    default:
      throw new Error('Invalid choice:' + choice)
  }
}
run()

import got from "got";
import { getCourseRounds } from "./kopps";

const log = console;
const TERMS_TO_IMPORT = [
  "20201"
];

(function run() {
  for (const term of TERMS_TO_IMPORT) {
    const courseRounds = getCourseRounds(term);
  }
})();



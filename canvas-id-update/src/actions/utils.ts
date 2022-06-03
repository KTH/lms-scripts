import * as csv from "fast-csv";
import fs from "node:fs";

export function createFolder(folderPath: string) {
  try {
    fs.statSync(folderPath);
  } catch (err) {
    // Folder doesn't exist, create
    fs.mkdirSync(folderPath, { recursive: true });
  }
}

export function createCsvSerializer(name: string) {
  const writer = fs.createWriteStream(name);
  const serializer = csv.format({ headers: true });
  serializer.pipe(writer);
  return serializer;
}
#!/usr/bin/env tsx

import { promises as fs } from "fs";
import * as csv from "csv-parse/sync";
import JSZip from "jszip";

// https://opentransportdata.swiss/de/cookbook/masterdata-cookbook/servicepoints/
type RecordType = {
    status: "DRAFT" | "VALIDATED" | "IN_REVIEW" | "WITHDRAWN" | "REVOKED",
};

const rawzip = await fs.readFile("actual_date-swiss-only-service_point-2025-08-02.csv.zip");
const zip = await JSZip.loadAsync(rawzip);
const entries = zip.file(/.*/);
if (entries.length != 1) {
    throw Error(`invalid file count ${entries.length}`);
}
const zipentry = entries[0];
console.log(`Reading ${zipentry.name}`);
const csvdata = await zipentry.async("string");

const records = csv.parse(csvdata, { delimiter: ";", columns: true }) as RecordType[];

let count = 0;
for (const r of records) {
    if (r.status != "VALIDATED") {
        continue;
    }
    count++;
}

console.log(`Total: ${records.length}, Valid: ${count}`);

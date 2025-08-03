#!/usr/bin/env tsx

import { promises as fs } from "fs";
import * as csv from "csv-parse/sync";
import JSZip from "jszip";
import * as datatypes from "./src/datatypes.js";
import { count } from "console";

const rawzip = await fs.readFile("actual_date-swiss-only-service_point-2025-08-02.csv.zip");
const zip = await JSZip.loadAsync(rawzip);
const entries = zip.file(/.*/);
if (entries.length != 1) {
    throw Error(`invalid file count ${entries.length}`);
}
const zipentry = entries[0];
console.log(`Reading ${zipentry.name}`);
const csvdata = await zipentry.async("string");

const records = csv.parse(csvdata, { delimiter: ";", columns: true }) as datatypes.FullServicePoint[];

const servicePoints: datatypes.ServicePoint[] = [];
const countByType = new Map<datatypes.MeansOfTransport, number>();
for (const r of records) {
    if (r.status != "VALIDATED") { continue; }
    if (!r.hasGeolocation) { continue; }

    countByType.set(r.meansOfTransport, (countByType.get(r.meansOfTransport) ?? 0) + 1);

    if (r.meansOfTransport == "UNKNOWN" || r.meansOfTransport == "ELEVATOR" || r.meansOfTransport == "") { continue; }

    // For now, only have train stations to reduce size.
    if (r.meansOfTransport != "TRAIN") { continue; }

    servicePoints.push({
        designationOfficial: r.designationOfficial,
        meansOfTransport: r.meansOfTransport,
        wgs84: [parseFloat(r.wgs84East), parseFloat(r.wgs84North)],
    });
}

for (const mean of ([...countByType.keys()] as any).toSorted()) {
    console.log(`${countByType.get(mean)} ${mean ?? "<empty>"} service points`);
}
console.log(`Total: ${records.length}, Selected: ${servicePoints.length}`);

await fs.writeFile("src/extdata/servicepoints.json", JSON.stringify(servicePoints));

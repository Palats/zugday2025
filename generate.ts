#!/usr/bin/env tsx

import { promises as fs } from "fs";
import * as csv from "csv-parse/sync";
import JSZip from "jszip";
import * as datatypes from "./src/datatypes.js";

import rawconnections from "./src/connections.json";
import rawobjectives from "./src/objectives.json";

export const connections = (rawconnections as datatypes.ConnectionsJSON).connections;
export const objectives = rawobjectives as datatypes.ObjectivesJSON;

// List necessary service points based on hand maintained data
const requiredServicePoints = new Set<String>();
for (const c of connections) {
    requiredServicePoints.add(c.source);
    requiredServicePoints.add(c.target);
}
for (const m of [objectives.final].concat(objectives.extras, objectives.museums)) {
    requiredServicePoints.add(m.stop);
    requiredServicePoints.add(m.trainStop);
}
console.log(`${requiredServicePoints.size} services points listed in manual data`);

// Manage service points
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
const found = new Set<String>();
for (const r of records) {
    // Extract list of means of transports.
    const means = r.meansOfTransport.split("|").map(s => s.trim()).filter(s => s.length > 0) as datatypes.MeansOfTransport[];
    for (const m of means) {
        countByType.set(m, (countByType.get(m) ?? 0) + 1);
    }

    // Remove service points which are not of interest.
    if (r.status != "VALIDATED") { continue; }
    if (!r.hasGeolocation) { continue; }
    if (means.length === 0) { continue; }

    // Filter to things which we actual refer to.
    if (!requiredServicePoints.has(r.designationOfficial)) {
        continue
    }

    if (found.has(r.designationOfficial)) {
        console.error(`Multiple matches found for service point ${r.designationOfficial}`);
    }
    found.add(r.designationOfficial);

    servicePoints.push({
        name: r.designationOfficial,
        transports: means,
        wgs84: [parseFloat(r.wgs84East), parseFloat(r.wgs84North)],
    });
}
await fs.writeFile("src/extdata/servicepoints.json", JSON.stringify(servicePoints));

// Show missing service points
console.log("\n---- Missing ----");
const missing = requiredServicePoints.difference(found);
for (const m of missing) {
    console.error(`Missing: ${m}`);
}

// Show some extra service point data
console.log("\n---- Stats ----");
for (const mean of ([...countByType.keys()] as any).toSorted()) {
    console.log(`${countByType.get(mean)} ${mean ?? "<empty>"} service points`);
}
console.log(`Service points: ${records.length}, Selected: ${servicePoints.length}`);

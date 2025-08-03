#!/usr/bin/env tsx

import { promises as fs } from "fs";
import * as csv from "csv-parse/sync";
import JSZip from "jszip";

// https://opentransportdata.swiss/de/cookbook/masterdata-cookbook/servicepoints/
// 3051;85;ch:1:sloid:3051;8503051;0;2021-04-01;9999-12-31;Zürich Binz;;ZBZ;true;true;true;ORDERLY;false;true;false;true;CH;Zürich;1;ZH;Zürich;112;Zürich;261;Zürich;;;TRAIN;;;true;true;8503051;;ch:1:sboid:100058;78;SZU;SZU;SZU;SZU;Sihltal-Zürich-Uetliberg-Bahn;Sihltal-Zürich-Uetliberg-Bahn;Sihltal-Zürich-Uetliberg-Bahn;Sihltal-Zürich-Uetliberg-Bahn;;2681558.27;1246329.425;8.51829736305;47.36276307407;421.6;2017-11-09 11:53:05;2024-04-08 09:26:06;VALIDATED
type FullServicePoint = {
    designationOfficial: string,
    hasGeolocation: boolean,
    meansOfTransport: "TRAIN" | "BUS" | "TRAM" | "BOAT" | "CABLE_CAR" | "CHAIRLIFT" | "CABLE_RAILWAY" | "RACK_RAILWAY" | "METRO" | "ELEVATOR" | "UNKNOWN",
    wgs84East: string,
    wgs84North: string,
    status: "DRAFT" | "VALIDATED" | "IN_REVIEW" | "WITHDRAWN" | "REVOKED",
};

type ServicePoint = Pick<FullServicePoint, "designationOfficial" | "meansOfTransport"> & {
    wgs84EastNumber: number,
    wgs84NorthNumber: number,
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

const records = csv.parse(csvdata, { delimiter: ";", columns: true }) as FullServicePoint[];

const stations: ServicePoint[] = [];
for (const r of records) {
    if (r.status != "VALIDATED") { continue; }
    if (!r.hasGeolocation) { continue; }
    if (r.meansOfTransport == "UNKNOWN" || r.meansOfTransport == "ELEVATOR") { continue; }

    stations.push({
        designationOfficial: r.designationOfficial,
        meansOfTransport: r.meansOfTransport,
        wgs84EastNumber: parseFloat(r.wgs84East),
        wgs84NorthNumber: parseFloat(r.wgs84North),
    });
}

console.log(`Total: ${records.length}, Selected: ${stations.length}`);

await fs.writeFile("src/servicepoints.json", JSON.stringify(stations));

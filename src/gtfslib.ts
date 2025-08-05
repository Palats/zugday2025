// GTFS manipulation and testing.
// https://gtfs.org/documentation/schedule/reference/
// https://opentransportdata.swiss/de/cookbook/timetable-cookbook/gtfs/
// https://data.opentransportdata.swiss/en/dataset/timetable-2025-gtfs2020

import { promises as fs } from "fs";
import * as csv from "csv-parse/sync";
import * as path from "node:path";

// https://gtfs.org/documentation/schedule/reference/#stopstxt
type GTFSStops = {
    stop_id: string,
    stop_name: string,
    stop_lat: string,
    stop_lon: string,
    location_type: string,
    parent_station: string,
    platform_code: string,
}

export async function run(gtfsDir: string) {
    console.log("GTFS directory:", gtfsDir);

    const rawcsvstops = await fs.readFile(path.join(gtfsDir, "stops.txt"));
    const stops = csv.parse(rawcsvstops, { delimiter: ",", columns: true }) as GTFSStops[];
    for (const s of stops) {
        if (s.stop_name.toLowerCase().includes("wiedikon")) {
            console.log(s);
        }
    }
}
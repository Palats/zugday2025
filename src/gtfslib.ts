// GTFS manipulation and testing.
// https://gtfs.org/documentation/schedule/reference/
// https://opentransportdata.swiss/de/cookbook/timetable-cookbook/gtfs/
// https://data.opentransportdata.swiss/en/dataset/timetable-2025-gtfs2020

import * as gtfs from "gtfs";

export async function run(gtfsDBFilename: string) {
    const db = gtfs.openDb({ sqlitePath: gtfsDBFilename });
    const routes = gtfs.getRoutes(
        {}, // No query filters
        ['route_id', 'route_short_name', 'route_color'], // Only return these fields
        [['route_short_name', 'ASC']], // Sort by this field and direction
        { db: db }, // Options for the query. Can specify which database to use if more than one are open
    );
    gtfs.closeDb(db);

    console.log(routes);
}
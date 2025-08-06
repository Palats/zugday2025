// GTFS manipulation and testing.
// https://gtfs.org/documentation/schedule/reference/
// https://opentransportdata.swiss/de/cookbook/timetable-cookbook/gtfs/
// https://data.opentransportdata.swiss/en/dataset/timetable-2025-gtfs2020

import * as gtfs from "gtfs";

function printAllRoutes(db) {
    // Find all relevant stops.
    const rootStopIDs = new Set([
        "Parent8503011", // 'Zürich Wiedikon'
        "Parent8573710", // 'Zürich Wiedikon, Bahnhof'
    ]);

    const stopIDs = new Set<string>();
    const allStops = gtfs.getStops({}, ["parent_station", "stop_id"], [], { db: db });
    for (const s of allStops) {
        if (rootStopIDs.has(s.parent_station ?? "") || rootStopIDs.has(s.stop_id)) {
            stopIDs.add(s.stop_id);
        }
    }

    const tripIDs = new Set<string>();
    const stoptimes = gtfs.getStoptimes({ "stop_id": Array.from(stopIDs) }, ["trip_id"], [], { db: db });
    for (const st of stoptimes) {
        tripIDs.add(st.trip_id);
    }

    const routeIDs = new Set<string>();
    const trips = gtfs.getTrips({ "trip_id": Array.from(tripIDs) }, ["route_id"], [], { db: db });
    for (const t of trips) {
        routeIDs.add(t.route_id);
    }

    const agencyIDs = new Set<string>();
    const routes = gtfs.getRoutes({ "route_id": Array.from(routeIDs) }, ["agency_id", "route_short_name", "route_desc"], [], { db: db });
    for (const r of routes) {
        if (r.agency_id) {
            agencyIDs.add(r.agency_id);
        }
    }

    const agencyNameByID = new Map<string, string>();
    const agencies = gtfs.getAgencies({ "agency_id": Array.from(agencyIDs) }, [], [], { db: db });
    for (const a of agencies) {
        if (a.agency_id) {
            agencyNameByID.set(a.agency_id, a.agency_name);
        }
    }

    for (const r of routes) {
        console.log(`${agencyNameByID.get(r.agency_id!)} ${r.route_short_name}`);
    }
}

export async function run(gtfsDBFilename: string) {
    const db = gtfs.openDb({ sqlitePath: gtfsDBFilename });

    printAllRoutes(db);

    gtfs.closeDb(db);
}
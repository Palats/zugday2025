// GTFS manipulation and testing.
// https://gtfs.org/documentation/schedule/reference/
// https://opentransportdata.swiss/de/cookbook/timetable-cookbook/gtfs/
// https://data.opentransportdata.swiss/en/dataset/timetable-2025-gtfs2020

import * as gtfs from "gtfs";

function printAllRoutes(db: any, serviceIDs: Set<string>) {
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
    const trips = gtfs.getTrips({ "trip_id": Array.from(tripIDs) }, ["route_id", "service_id"], [], { db: db });
    for (const t of trips) {
        if (serviceIDs.size > 0 && !serviceIDs.has(t.service_id)) { continue; }
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

type DayOfWeek = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday";

function dayOfWeek(d: Date): DayOfWeek {
    switch (d.getUTCDay()) {
        case 0: return "sunday";
        case 1: return "monday";
        case 2: return "tuesday";
        case 3: return "wednesday";
        case 4: return "thursday";
        case 5: return "friday";
        case 6: return "saturday";
    }
    throw new Error(`invalid day of week ${d.getUTCDay()}`);
}

export async function run(gtfsDBFilename: string) {
    const db = gtfs.openDb({ sqlitePath: gtfsDBFilename });

    const targetDay = "2025-08-30";
    const d = new Date(targetDay);
    const gtfsDate = (d.getUTCFullYear() * 100 + d.getUTCMonth()) * 100 + d.getUTCDate();
    const gtfsDayOfWeek = dayOfWeek(d);
    console.log("gtfsDate", gtfsDate, "dayOfWeek", gtfsDayOfWeek);

    // This does not include services which started the day before.

    const relevantServiceIDs = new Set<string>();
    const allCalendars = gtfs.getCalendars({}, [], [], { db: db });
    for (const c of allCalendars) {
        if (c.start_date > gtfsDate || c.end_date < gtfsDate) { continue; }
        const v = c[gtfsDayOfWeek];
        if (v === 0) { continue; }
        relevantServiceIDs.add(c.service_id);
    }

    const calendarDates = gtfs.getCalendarDates({ date: gtfsDayOfWeek }, [], [], { db: db });
    if (calendarDates.length > 0) {
        console.log("found calendar_dates exception, not supported:", calendarDates);
        throw new Error("not supported");
    }

    printAllRoutes(db, relevantServiceIDs);

    gtfs.closeDb(db);
}
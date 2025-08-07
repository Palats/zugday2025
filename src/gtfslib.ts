// GTFS manipulation and testing.
// https://gtfs.org/documentation/schedule/reference/
// https://opentransportdata.swiss/de/cookbook/timetable-cookbook/gtfs/
// https://data.opentransportdata.swiss/en/dataset/timetable-2025-gtfs2020

import * as gtfs from "gtfs";
import * as sqlite from "better-sqlite3";

function sqlNArgs(n: number): string {
    return "(" + Array(n).fill("?").join(",") + ")";
}

function findStopChildrenIDs(db: sqlite.Database, roots: Set<string>): Set<string> {
    /*const stops = db.prepare(`
        SELECT *
        FROM stops
        WHERE
            stop_id IN ${sqlNArgs(roots.size)}
            OR parent_station IN ${sqlNArgs(roots.size)}
    `).all(Array.from(roots).concat(Array.from(roots)));*/


    const stopIDs = new Set<string>();
    const allStops = gtfs.getStops({}, ["parent_station", "stop_id"], [], { db: db });
    for (const s of allStops) {
        if (roots.has(s.parent_station ?? "") || roots.has(s.stop_id)) {
            stopIDs.add(s.stop_id);
        }
    }
    return stopIDs
}

function printAllRoutes(db: sqlite.Database, serviceIDs: Set<string>, minTime?: string, maxTime?: string) {
    const stopIDs = findStopChildrenIDs(db, new Set([
        "Parent8503011", // 'Zürich Wiedikon'
        "Parent8573710", // 'Zürich Wiedikon, Bahnhof'
    ]));

    const tripIDs = new Set<string>();
    const stoptimes = gtfs.getStoptimes({ "stop_id": Array.from(stopIDs) }, ["trip_id", "arrival_time", "departure_time"], [], { db: db });
    for (const st of stoptimes) {
        if (st.departure_time === undefined || st.arrival_time === undefined) { continue; }
        // Terrible way of comparing time
        if (minTime !== undefined && st.departure_time < minTime) { continue; }
        if (maxTime !== undefined && st.arrival_time > maxTime) { continue; }
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

function printLinesAtStop(db: sqlite.Database) {
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

    printAllRoutes(db, relevantServiceIDs, "08:00:00", "20:00:00");
}

export async function run(gtfsDBFilename: string) {
    const db = gtfs.openDb({ sqlitePath: gtfsDBFilename });

    const roots = new Set([
        "Parent8503011", // 'Zürich Wiedikon'
        "Parent8573710", // 'Zürich Wiedikon, Bahnhof'
    ]);

    const stopIDs = findStopChildrenIDs(db, roots);
    console.log(stopIDs);

    const stops = db.prepare(`
        SELECT stop_id
        FROM stops
        WHERE
            stop_id IN ${sqlNArgs(roots.size)}
            OR parent_station IN ${sqlNArgs(roots.size)}
    `).pluck(true).all(Array.from(roots).concat(Array.from(roots)));
    console.log(stops);

    /*const transfers = gtfs.getTransfers({}, [], [], { db: db });
    for (const t of transfers) {
        if (t.transfer_type === 4) { continue; }
        if (t.from_route_id || t.to_route_id || t.from_trip_id || t.to_trip_id) {
            console.log(t);
        }
    }*/

    gtfs.closeDb(db);
}
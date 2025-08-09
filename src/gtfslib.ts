// GTFS manipulation and testing.
// https://gtfs.org/documentation/schedule/reference/
// https://opentransportdata.swiss/de/cookbook/timetable-cookbook/gtfs/
// https://data.opentransportdata.swiss/en/dataset/timetable-2025-gtfs2020

import * as gtfs from "gtfs";
import * as sqlite from "better-sqlite3";

function sqlNArgs(n: number): string {
    return "(" + Array(n).fill("?").join(",") + ")";
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

// Transform a date object into a GTFS date number (e.g., 20250830)
function formatDate(d: Date): number {
    // Javascript is 0 based for the month
    return (d.getUTCFullYear() * 100 + d.getUTCMonth() + 1) * 100 + d.getUTCDate();
}

// Transform a GTFS date number (e.g., 20250830) to a Date object with a random time.
function parseDate(n: number): Date {
    const year = Math.floor(n / 10000);
    n = n - 10000 * year;
    const month = Math.floor(n / 100);
    const day = n - 100 * month;

    const d = new Date(0);
    d.setUTCFullYear(year);
    d.setUTCMonth(month - 1); // Javascript is 0 based for the month
    d.setUTCDate(day);

    return d;
}

function isSameDay(d1: Date, d2: Date): boolean {
    return d1.getUTCFullYear() === d2.getUTCFullYear() &&
        d1.getUTCMonth() === d2.getUTCMonth() &&
        d1.getUTCDate() === d2.getUTCDate();
}

function isNextDay(d1: Date, d2: Date): boolean {
    d1 = new Date(d1);
    d1.setUTCDate(d1.getUTCDate() + 1);
    return isSameDay(d1, d2);
}

// Returns the list of unique stop names for the list of provided stop IDs.
// This helps removing redundant stop names coming from list of platforms and the like.
function listStopNames(db: sqlite.Database, stopIDs: string[]): string[] {
    return db.prepare(`
        SELECT
            stop_name
        FROM
            stops
        WHERE
            stop_id IN ${sqlNArgs(stopIDs.length)}
        GROUP BY stop_name
        ORDER BY stop_name
    `).pluck(true).all(stopIDs) as string[];
}

// Finds all connected stop IDs for the given stop IDs.
// Connected means either child or parent stop or with a transfer.
// This is recursive.
function findConnectedStops(db: sqlite.Database, stopIDs: string[]): string[] {
    let expanded = new Set<string>();
    let toExpand = new Set<string>(stopIDs);
    while (toExpand.size > 0) {
        const found = new Set<string>();

        const ids = Array.from(toExpand);

        // Find children / parent stops connected to the nodes to expand.
        const family = db.prepare(`
            SELECT
                stop_id
            FROM stops
            WHERE
                stop_id IN ${sqlNArgs(ids.length)}
                OR parent_station IN ${sqlNArgs(ids.length)}
        `).pluck(true).all(ids, ids) as string[];
        for (const s of family) {
            found.add(s);
        }

        // Find transfers to/from the nodes to expand. This
        // does not look at the found children/parent - those will be
        // for another round.
        const transfers = db.prepare(`
            SELECT
                from_stop_id,
                to_stop_id
            FROM transfers
            WHERE
                from_stop_id IN ${sqlNArgs(ids.length)}
                OR to_stop_id  IN ${sqlNArgs(ids.length)}
        `).all(ids, ids) as { from_stop_id: string, to_stop_id: string }[];
        for (const t of transfers) {
            found.add(t.from_stop_id);
            found.add(t.to_stop_id);
        }

        // Be sure to update 'expanded' before we check for new ones.
        expanded = expanded.union(toExpand);
        toExpand = found.difference(expanded);
    }
    return Array.from(expanded);
}

// Picks a list of dates (e.g., 20251018) and returns
// a list with date ranges simplified.
function findDateRanges(rawDates: number[]): string[] {
    if (rawDates.length === 0) { return []; }
    // console.log(rawDates.toSorted().map(r => r.toString()).join(", "));
    const dates = rawDates.toSorted().map(parseDate);

    const ranges: string[] = [];
    let rangeStart = dates[0];
    let previous = dates[0];

    const pushRange = () => {
        if (isSameDay(previous, rangeStart)) {
            ranges.push(`${formatDate(previous)}`);
        } else {
            ranges.push(`${formatDate(rangeStart)}..${formatDate(previous)}`);
        }
    }

    for (const d of dates.slice(1)) {
        if (!isNextDay(previous, d)) {
            pushRange();
            rangeStart = d;
        }
        previous = d;
    }
    // "previous" is the last element now.
    pushRange();

    return ranges;
}

function tripInfo(db: sqlite.Database, tripID: string): string {
    const trip = db.prepare(`
        SELECT
            route_id,
            service_id,
            trip_headsign,
            trip_short_name
        FROM trips
        WHERE trip_id = ?
    `).get(tripID) as gtfs.Trip;

    const route = db.prepare(`
        SELECT
            agency_id,
            route_long_name,
            route_short_name
        FROM routes
        WHERE route_id = ?
    `).get(trip.route_id) as gtfs.Route;

    const agency = db.prepare(`
        SELECT
            agency_name
        FROM agency
        WHERE agency_id = ?
    `).get(route.agency_id) as gtfs.Agency;

    const calendar = db.prepare(`
        SELECT
            *
        FROM calendar
        WHERE service_id = ?
    `).get(trip.service_id) as gtfs.Calendar;

    const addedDates = db.prepare(`
        SELECT
            *
        FROM calendar_dates
        WHERE service_id = ? AND exception_type = 1
    `).all(trip.service_id) as gtfs.CalendarDate[];
    const removedDates = db.prepare(`
        SELECT
            *
        FROM calendar_dates
        WHERE service_id = ? AND exception_type = 2
    `).all(trip.service_id) as gtfs.CalendarDate[];

    const stops = db.prepare(`
        SELECT
            arrival_time,
            departure_time,
            stop_id,
            stop_name
        FROM
            stop_times
            JOIN stops USING (stop_id)
        WHERE trip_id=?
        ORDER BY stop_sequence
    `).all(tripID) as any;

    let s = ``;
    s += `trip_id=${tripID}, route_id=${trip.route_id}, service_id=${trip.service_id}, agency_id=${route.agency_id}\n`;
    s += `${route.route_short_name} (${trip.trip_short_name}) direction ${trip.trip_headsign} by ${agency.agency_name}\n`;
    s += `From ${calendar.start_date} to ${calendar.end_date} ; Week: `;
    s += calendar.monday ? "m" : "_";
    s += calendar.tuesday ? "t" : "_";
    s += calendar.wednesday ? "w" : "_";
    s += calendar.thursday ? "t" : "_";
    s += calendar.friday ? "f" : "_";
    s += calendar.saturday ? "s" : "_";
    s += calendar.sunday ? "s" : "_";
    s += "\n";

    if (addedDates.length > 0) {
        s += ".. also: " + findDateRanges(addedDates.map(d => d.date)).join(", ") + "\n";
    }
    if (removedDates.length > 0) {
        s += ".. exceptions: " + findDateRanges(removedDates.map(d => d.date)).join(", ") + "\n";
    }

    s += "Stops:\n"
    for (const st of stops) {
        s += `  + ${st.arrival_time} ${st.departure_time} ${st.stop_name} [${st.stop_id}]\n`;
    }

    return s;
}

function printAllRoutes(db: sqlite.Database, serviceIDs: Set<string>, minTime?: string, maxTime?: string) {
    const stopIDs = findConnectedStops(db, [
        "Parent8503011", // 'Zürich Wiedikon'
        "Parent8573710", // 'Zürich Wiedikon, Bahnhof'
    ]);

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

    // Zug: Parent8502204
    // 'Zürich Wiedikon': "Parent8503011"
    // 'Zürich Wiedikon, Bahnhof': "Parent8573710"

    const startIDs = findConnectedStops(db, ["Parent8503011"]);
    console.log("Starts: ", listStopNames(db, startIDs).join(" | "));
    const endIDs = findConnectedStops(db, ["Parent8502204"]);
    console.log("Ends: ", listStopNames(db, endIDs).join(" | "));


    const d = new Date("2025-08-30");
    const gtfsDate = formatDate(d);
    const gtfsDayOfWeek = dayOfWeek(d);
    const minTime = "08:00:00";
    const maxTime = "20:00:00";

    const results = db.prepare(`
        WITH
            -- Services running that day.
            in_range_services AS (
                SELECT service_id FROM calendar
                WHERE
                    ${gtfsDayOfWeek} <> 0
                    AND start_date <= @date
                    AND end_date >= @date

                UNION -- Add explicit additions to the schedule

                SELECT service_id FROM calendar_dates
                WHERE date = @date AND exception_type = 1
                GROUP BY service_ID

                EXCEPT -- Remove explicit removal from the schedule

                SELECT service_id FROM calendar_dates
                WHERE date = @date AND exception_type = 2
                GROUP BY service_ID
            ),
            -- Select potential departure times for the start station.
            start_times AS (
                SELECT
                    trip_id,
                    stop_id,
                    departure_time,
                    stop_sequence
                FROM stop_times
                WHERE
                    departure_time >= @mintime
                    AND stop_id IN ${sqlNArgs(startIDs.length)}
            ),
            -- Select potential stop times for the end station.
            end_times AS (
                SELECT
                    trip_id,
                    stop_id,
                    arrival_time,
                    stop_sequence
                FROM stop_times
                WHERE
                    arrival_time <= @maxtime
                    AND stop_id IN ${sqlNArgs(endIDs.length)}
            ),
            -- Trips IDs
            matching_trip_ids AS (
                SELECT
                    trip_id,
                    departure_time,
                    arrival_time,
                    start_times.stop_id AS start_id,
                    end_times.stop_id AS end_id
                FROM start_times JOIN end_times USING (trip_id)
                -- Make sure that it stops at the departure before arriving at the end.
                WHERE start_times.stop_sequence < end_times.stop_sequence
            ),
            -- Actual trips
            matching_trips AS (
                SELECT
                    trip_id,
                    trip_short_name,
                    route_id,
                    departure_time,
                    arrival_time,
                    start_id,
                    end_id
                FROM
                    matching_trip_ids
                    JOIN trips USING (trip_id)
                    JOIN in_range_services USING (service_id)

            ),
            -- Enrich with route names
            with_details AS (
                SELECT
                    trip_id,
                    trip_short_name,
                    route_id,
                    departure_time,
                    arrival_time,
                    start_id,
                    end_id,
                    route_short_name,
                    start_stops.stop_name as start_name,
                    end_stops.stop_name as end_name
                FROM
                    matching_trips
                    JOIN routes USING (route_id)
                    JOIN stops AS start_stops ON (start_stops.stop_id = start_id)
                    JOIN stops AS end_stops ON (end_stops.stop_id = end_id)
            )
        SELECT
            *
        FROM
            with_details
        ORDER BY departure_time
        ;
    `).all({
        "date": gtfsDate,
        "mintime": minTime,
        "maxtime": maxTime,
    }, startIDs, endIDs) as {
        trip_id: string,
        route_id: string,
        departure_time: string,
        arrival_time: string,
        start_id: string,
        end_id: string,
        trip_short_name: string,
        route_short_name: string,
        start_name: string,
        end_name: string
    }[];

    for (const r of results) {
        console.log(`${r.departure_time}-${r.arrival_time} ${r.route_short_name} (${r.trip_short_name}) ${r.start_name}->${r.end_name} [trip_id=${r.trip_id}]`);
    }

    gtfs.closeDb(db);
}
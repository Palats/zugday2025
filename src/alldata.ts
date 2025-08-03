import * as datatypes from "./datatypes";
import rawmapdata from "./extdata/swiss-maps.json";
import rawservicepoints from "./extdata/servicepoints.json";

export const mapdata = (rawmapdata as any) as datatypes.SwissMap;  // rawmapdata has number[] instead [number, number].
export const servicePointsByName = new Map<string, datatypes.ServicePoint>();
// All service points listed in connections.
export const relevantServicePoints: datatypes.ServicePoint[] = [];

export const connections: datatypes.Connection[] = [
    { source: "Kreuzlingen", target: "Schaffhausen", time: 60 },
    { source: "Kreuzlingen", target: "Zürich HB", time: 70 },
    { source: "Kreuzlingen", target: "St. Gallen", time: 45 },
    { source: "Gossau SG", target: "St. Gallen", time: 10 },
    { source: "Herisau", target: "St. Gallen", time: 10 },
    { source: "Gossau SG", target: "Herisau", time: 10 },
    { source: "Sargans", target: "St. Gallen", time: 60 },
    { source: "Sargans", target: "Chur", time: 20 },
    { source: "Gossau SG", target: "Zürich HB", time: 50 },
    { source: "Zürich HB", target: "Schaffhausen", time: 35 },
    { source: "Zürich HB", target: "Sargans", time: 55 },
    { source: "Zürich HB", target: "Basel SBB", time: 55 },
    { source: "Zürich HB", target: "Lenzburg", time: 20 },
    { source: "Zürich HB", target: "Olten", time: 30 },
    { source: "Zürich HB", target: "Zug", time: 25 },
    { source: "Zürich HB", target: "Altdorf UR", time: 65 },
    { source: "Olten", target: "Lenzburg", time: 20 },
    { source: "Olten", target: "Solothurn", time: 25 },
    { source: "Olten", target: "Luzern", time: 35 },
    { source: "Luzern", target: "Zug", time: 20 },
    { source: "Luzern", target: "Sarnen", time: 20 },
    { source: "Luzern", target: "Altdorf UR", time: 50 },
    { source: "Zug", target: "Altdorf UR", time: 50 },
    { source: "Andermatt", target: "Altdorf UR", time: 50 },
    { source: "Locarno", target: "Altdorf UR", time: 65 },
    { source: "Bern", target: "Olten", time: 30 },
    { source: "Bern", target: "Solothurn", time: 35 },
    { source: "Bern", target: "Interlaken Ost", time: 50 },
    { source: "Bern", target: "Visp", time: 60 },
    { source: "Bern", target: "Fribourg/Freiburg", time: 25 },
    { source: "Bern", target: "Murten/Morat", time: 40 },
    { source: "Bern", target: "Neuchâtel", time: 35 },
    { source: "Basel SBB", target: "Delémont", time: 60 },
    { source: "Basel SBB", target: "Biel/Bienne", time: 30 },
    { source: "Biel/Bienne", target: "Delémont", time: 30 },
    { source: "Biel/Bienne", target: "Solothurn", time: 15 },
    { source: "Biel/Bienne", target: "Neuchâtel", time: 20 },
    { source: "Andermatt", target: "Brig", time: 120 },
    { source: "Brig", target: "Visp", time: 10 },
    { source: "Martigny", target: "Visp", time: 40 },
    { source: "Martigny", target: "Montreux", time: 35 },
    { source: "Montreux", target: "Chamby", time: 30 },
    { source: "Montreux", target: "Vevey", time: 5 },
    { source: "Neuchâtel", target: "Murten/Morat", time: 25 },
    { source: "Murten/Morat", target: "Fribourg/Freiburg", time: 35 },
    { source: "Lausanne", target: "Fribourg/Freiburg", time: 45 },
    { source: "Lausanne", target: "Vevey", time: 15 },
    { source: "Lausanne", target: "Genève", time: 45 },
    { source: "Lausanne", target: "Vallorbe", time: 45 },
    { source: "Lausanne", target: "Neuchâtel", time: 50 },
]

// Preprocess the raw data. This must be called to have access to content,
// and can be called in main loading scripts.
export function prepareData() {
    const servicePoints = rawservicepoints as datatypes.ServicePoint[];

    // Prepare list of service points by name.
    for (const sp of servicePoints) {
        if (servicePointsByName.has(sp.designationOfficial)) {
            console.log("Duplicate:", sp.designationOfficial, sp.meansOfTransport);
        }
        servicePointsByName.set(sp.designationOfficial, sp);
        // Print list of some service points, useful to check some names.
        if (/Gall.*/.test(sp.designationOfficial) && sp.meansOfTransport == "TRAIN") { console.log(sp.designationOfficial, sp.meansOfTransport); }
    }

    // List service points found in connections.
    const seen = new Set<string>();
    for (const c of connections) {
        if (!servicePointsByName.has(c.source)) { console.error(`Missing connection source ${c.source}`); }
        if (!servicePointsByName.has(c.target)) { console.error(`Missing connection source ${c.target}`); }

        if (!seen.has(c.source)) {
            relevantServicePoints.push(servicePointsByName.get(c.source)!);
            seen.add(c.source);
        }
        if (!seen.has(c.target)) {
            relevantServicePoints.push(servicePointsByName.get(c.target)!);
            seen.add(c.target);
        }
    }
}

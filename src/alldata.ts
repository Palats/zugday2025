import * as datatypes from "./datatypes";
import rawmapdata from "./swiss-maps.json";
import rawservicepoints from "./servicepoints.json";

export const mapdata = (rawmapdata as any) as datatypes.SwissMap;  // rawmapdata has number[] instead [number, number].
export const servicePointsByName = new Map<string, datatypes.ServicePoint>();
// All service points listed in connections.
export const relevantServicePoints: datatypes.ServicePoint[] = [];

export const connections: datatypes.Connection[] = [
    { source: "Bern", target: "Zürich HB" },
    { source: "Bern", target: "Genève" },
    { source: "Zürich HB", target: "Lugano" },
    { source: "Basel SBB", target: "Zürich HB" },
];

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
        if (/Lugano.*/.test(sp.designationOfficial) && sp.meansOfTransport == "TRAIN") { console.log(sp.designationOfficial, sp.meansOfTransport); }
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

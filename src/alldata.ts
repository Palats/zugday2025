import * as datatypes from "./datatypes";
import rawmapdata from "./extdata/swiss-maps.json";
import rawservicepoints from "./extdata/servicepoints.json";
import rawconnections from "./connections.json";
import rawobjectives from "./objectives.json";

export const mapdata = (rawmapdata as any) as datatypes.SwissMap;  // rawmapdata has number[] instead [number, number].
export const servicePointsByName = new Map<string, datatypes.ServicePoint>();
// All service points listed in connections.
export const relevantServicePoints: datatypes.ServicePoint[] = [];

export const connections = (rawconnections as datatypes.ConnectionsJSON).connections;
export const objectives = rawobjectives as datatypes.ObjectivesJSON;

prepareData();

// Preprocess the raw data. This must be called to have access to content,
// and can be called in main loading scripts.
export function prepareData() {
    const servicePoints = rawservicepoints as datatypes.ServicePoint[];

    // Prepare list of service points by name.
    for (const sp of servicePoints) {
        if (servicePointsByName.has(sp.name)) {
            console.log("Duplicate:", sp.name, sp.transports);
        }
        servicePointsByName.set(sp.name, sp);
        // Print list of some service points, useful to check some names.
        if (/Gall.*/.test(sp.name) && sp.transports.includes("TRAIN")) { console.log(sp.name, sp.transports); }
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

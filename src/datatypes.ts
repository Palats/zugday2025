export interface SwissMap extends TopoJSON.Topology {
    objects: {
        cantons: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
        lakes: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
        country: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
    }
}

// https://opentransportdata.swiss/de/cookbook/masterdata-cookbook/servicepoints/
// 3051;85;ch:1:sloid:3051;8503051;0;2021-04-01;9999-12-31;Zürich Binz;;ZBZ;true;true;true;ORDERLY;false;true;false;true;CH;Zürich;1;ZH;Zürich;112;Zürich;261;Zürich;;;TRAIN;;;true;true;8503051;;ch:1:sboid:100058;78;SZU;SZU;SZU;SZU;Sihltal-Zürich-Uetliberg-Bahn;Sihltal-Zürich-Uetliberg-Bahn;Sihltal-Zürich-Uetliberg-Bahn;Sihltal-Zürich-Uetliberg-Bahn;;2681558.27;1246329.425;8.51829736305;47.36276307407;421.6;2017-11-09 11:53:05;2024-04-08 09:26:06;VALIDATED
export type FullServicePoint = {
    designationOfficial: string,
    hasGeolocation: boolean,
    meansOfTransport: "TRAIN" | "BUS" | "TRAM" | "BOAT" | "CABLE_CAR" | "CHAIRLIFT" | "CABLE_RAILWAY" | "RACK_RAILWAY" | "METRO" | "ELEVATOR" | "UNKNOWN" | "",
    wgs84East: string,
    wgs84North: string,
    status: "DRAFT" | "VALIDATED" | "IN_REVIEW" | "WITHDRAWN" | "REVOKED",
};

export type ServicePoint = Pick<FullServicePoint, "designationOfficial" | "meansOfTransport"> & {
    // East, North
    wgs84: [number, number],
};

export type Connection = {
    source: string;
    target: string;
}

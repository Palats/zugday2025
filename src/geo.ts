// Store WGS84 coordinates as array of 2 values.
export type WGS84 = [number, number];

// Equatorial mean radius of Earth.
const earthMeanRadiusMeters = 6378137;

function toRad(x: number) { return x * Math.PI / 180.0 }
function hav(x: number) { return Math.sin(x / 2) ** 2 }

// Distance between 2 wgs84 coordinates, in meters.
// Inspired by https://github.com/dcousens/haversine-distance/blob/919e501c5909bb9e93958b05526c43700927c905/index.js .
// ... relying on haversine distance.
export function haversineDistanceMeters(a: WGS84, b: WGS84): number {
    const aLat = toRad(a[1]);
    const bLat = toRad(b[1]);
    const aLng = toRad(a[0]);
    const bLng = toRad(b[0]);

    const ht = hav(bLat - aLat) + Math.cos(aLat) * Math.cos(bLat) * hav(bLng - aLng);
    return 2 * earthMeanRadiusMeters * Math.atan2(Math.sqrt(ht), Math.sqrt(1 - ht));
}

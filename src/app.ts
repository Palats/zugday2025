import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as datatypes from "./datatypes";

import rawmapdata from "./swiss-maps.json";
const mapdata = (rawmapdata as any) as SwissMap;  // XXX

import rawservicepoints from "./servicepoints.json";
const servicePoints = rawservicepoints as datatypes.ServicePoint[];

const servicePointsByName = new Map<string, datatypes.ServicePoint>();
for (const sp of servicePoints) {
  if (servicePointsByName.has(sp.designationOfficial)) {
    console.log("Duplicate:", sp.designationOfficial, sp.meansOfTransport);
  }
  servicePointsByName.set(sp.designationOfficial, sp);
  if (/Lugano.*/.test(sp.designationOfficial) && sp.meansOfTransport == "TRAIN") { console.log(sp.designationOfficial, sp.meansOfTransport); }
}

// Define a type for our connection data
interface Connection {
  source: string;
  target: string;
}

// --- Data ---
const connections: Connection[] = [
  { source: "Bern", target: "Zürich HB" },
  { source: "Bern", target: "Genève" },
  { source: "Zürich HB", target: "Lugano" },
  { source: "Basel SBB", target: "Zürich HB" },
];

const relevantServicePoints: datatypes.ServicePoint[] = [];

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

interface SwissMap extends TopoJSON.Topology {
  objects: {
    cantons: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
    lakes: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
    country: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
  }
}

/**
 * The main page
 */
@customElement("zg-app")
export class ZGApp extends LitElement {
  render() {
    const width = 800;
    const height = 600;

    // Define a D3 projection for the map
    const projection = d3.geoMercator()
      .scale(8000) // Adjust the scale to fit Switzerland
      .center([8.2275, 46.8182]) // Center on Switzerland's coordinates
      .translate([width / 2, height / 2]);

    // Create a D3 path generator
    const path = d3.geoPath().projection(projection);

    // Create the SVG container.
    const svg = d3.create("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Draw Switzerland
    const cantons = topojson.feature(mapdata, mapdata.objects.cantons);
    const country = topojson.feature(mapdata, mapdata.objects.country);

    svg.append("path")
      .datum(country)
      .attr("class", "country")
      .attr("d", path);

    svg.append("path")
      .datum(cantons)
      .attr("class", "canton")
      .attr("d", path);

    svg.append("path")
      .datum(topojson.feature(mapdata, mapdata.objects.lakes))
      .attr("class", "lake")
      .attr("d", path);

    // Draw connections
    svg.selectAll(".connection-line")
      .data(connections)
      .enter()
      .append("line")
      .attr("class", "connection-line")
      .attr("x1", d => projection(servicePointsByName.get(d.source)!.wgs84)![0])
      .attr("y1", d => projection(servicePointsByName.get(d.source)!.wgs84)![1])
      .attr("x2", d => projection(servicePointsByName.get(d.target)!.wgs84)![0])
      .attr("y2", d => projection(servicePointsByName.get(d.target)!.wgs84)![1]);

    // Draw cities
    const cityGroup = svg.selectAll(".city-group")
      .data(relevantServicePoints)
      .enter()
      .append("g")
      .attr("class", "city-group");

    cityGroup.append("circle")
      .attr("class", "city")
      .attr("cx", sp => projection(sp.wgs84)?.[0] || 0)
      .attr("cy", sp => projection(sp.wgs84)?.[1] || 0)
      .attr("r", 5);

    // City label
    cityGroup.append("text")
      .attr("class", "city-label")
      .attr("x", sp => projection(sp.wgs84)?.[0] || 0)
      .attr("y", sp => (projection(sp.wgs84)?.[1] || 0) - 10)
      .text(sp => sp.designationOfficial);


    return html`${svg.node()}`;
  }

  static styles = css`
    :host {
      width: 100%;
      min-height: 100%;
      display: flex;
      align-items: center;
    }

    svg {
      height: 100%;
      width: 100%;
    }

    .country {
      fill: #f7f7f7;
      stroke: #5e6164;
      stroke-width: 1.5;
    }

    .canton {
      fill: none;
      stroke: #adb5bd;
      stroke-width: 1;
    }

    .lake {
      fill: #cee7ff;
      stroke: none;
    }

    .connection-line {
      fill: none;
      stroke: #e74c3c;
      stroke-width: 2;
      stroke-linecap: round;
    }

    .city {
        fill: #3498db;
        stroke: #2980b9;
        stroke-width: 1;
    }

    .city-label {
        font-size: 10px;
        font-weight: bold;
        fill: #333;
        text-anchor: middle;
        text-shadow: 1px 1px 2px white;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    "zg-app": ZGApp
  }
}

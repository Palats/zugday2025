import { LitElement, css, html } from 'lit'
import { customElement, property } from 'lit/decorators.js'
import * as d3 from 'd3';
import * as topojson from "topojson-client";

interface City {
  name: string;
  coords: [number, number]; // [longitude, latitude]
}

// Define a type for our connection data
interface Connection {
  source: string;
  target: string;
}

// --- Data ---
const cities: City[] = [
  { name: "Bern", coords: [7.4474, 46.9480] },
  { name: "Zurich", coords: [8.5417, 47.3769] },
  { name: "Geneva", coords: [6.1432, 46.2044] },
  { name: "Lugano", coords: [8.9538, 46.0037] },
  { name: "Basel", coords: [7.5886, 47.5596] },
];

const connections: Connection[] = [
  { source: "Bern", target: "Zurich" },
  { source: "Bern", target: "Geneva" },
  { source: "Zurich", target: "Lugano" },
  { source: "Basel", target: "Zurich" },
];

export interface WorldAtlas extends TopoJSON.Topology {
  objects: {
    countries: { type: "GeometryCollection"; geometries: Array<TopoJSON.Polygon | TopoJSON.MultiPolygon> };
    land: TopoJSON.GeometryCollection;
  };
  bbox: [number, number, number, number];
  transform: TopoJSON.Transform;
}

/**
 * The main page
 */
@customElement('zg-app')
export class ZGApp extends LitElement {
  @property({ type: Object })
  switzerland?: GeoJSON.Feature<GeoJSON.Geometry>;

  @property()
  preloadFailed?: string;


  constructor() {
    super();
    this.preload();
  }

  async preload() {
    try {
      // https://github.com/topojson/world-atlas

      // Fetch the TopoJSON data for Switzerland
      const topoData = await d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json") as WorldAtlas;

      if (!topoData || !('objects' in topoData) || !('countries' in topoData.objects)) {
        throw new Error("Invalid TopoJSON data structure.");
      }

      // Extract the Switzerland geometry from the TopoJSON data
      const countries = topojson.feature(topoData, topoData.objects.countries);

      console.log(countries);
      const switzerland = countries.features.find(d => (d as any).properties.name === 'Switzerland'); // XXX

      if (!switzerland) {
        throw new Error("Switzerland not found in TopoJSON data.");
      }

      this.switzerland = switzerland;
    }
    catch (error) {
      console.error(error);
    }
  }

  render() {
    if (this.preloadFailed) {
      return html`preloading failed, see console.`;
    }
    if (!this.switzerland) {
      return html`loading...`;
    }

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
      .attr("preserveAspectRatio", "meet")
      .attr("viewBox", `0 0 ${width} ${height}`);

    // Draw Switzerland
    svg.append("path")
      .datum(this.switzerland)
      .attr("class", "country")
      .attr("d", path);

    const cityCoords = new Map<string, [number, number]>();
    cities.forEach(city => {
      cityCoords.set(city.name, city.coords);
    });

    // Draw connectins
    svg.selectAll(".connection-line")
      .data(connections)
      .enter()
      .append("line")
      .attr("class", "connection-line")
      .attr("x1", d => projection(cityCoords.get(d.source) as [number, number])?.[0] || 0)
      .attr("y1", d => projection(cityCoords.get(d.source) as [number, number])?.[1] || 0)
      .attr("x2", d => projection(cityCoords.get(d.target) as [number, number])?.[0] || 0)
      .attr("y2", d => projection(cityCoords.get(d.target) as [number, number])?.[1] || 0);

    // Draw cities
    const cityGroup = svg.selectAll(".city-group")
      .data(cities)
      .enter()
      .append("g")
      .attr("class", "city-group");

    cityGroup.append("circle")
      .attr("class", "city")
      .attr("cx", d => projection(d.coords)?.[0] || 0)
      .attr("cy", d => projection(d.coords)?.[1] || 0)
      .attr("r", 5);

    // City label
    cityGroup.append("text")
      .attr("class", "city-label")
      .attr("x", d => projection(d.coords)?.[0] || 0)
      .attr("y", d => (projection(d.coords)?.[1] || 0) - 10)
      .text(d => d.name);


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
      fill: #e9ecef;
      stroke: #adb5bd;
      stroke-width: 1.5;
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
    'zg-app': ZGApp
  }
}

import { LitElement, css, html } from "lit"
import { customElement } from "lit/decorators.js"
import * as d3 from "d3";
import * as topojson from "topojson-client";
import * as alldata from "./alldata";

alldata.prepareData();

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

    svg.call(d3.zoom<SVGSVGElement, undefined>().on('zoom', e => {
      svg.attr("transform", e.transform)
    }));

    // Draw Switzerland
    const cantons = topojson.feature(alldata.mapdata, alldata.mapdata.objects.cantons);
    const country = topojson.feature(alldata.mapdata, alldata.mapdata.objects.country);

    svg.append("path")
      .datum(country)
      .attr("class", "country")
      .attr("d", path);

    svg.append("path")
      .datum(cantons)
      .attr("class", "canton")
      .attr("d", path);

    svg.append("path")
      .datum(topojson.feature(alldata.mapdata, alldata.mapdata.objects.lakes))
      .attr("class", "lake")
      .attr("d", path);

    // Draw connections
    const connectionGroup = svg.selectAll(".connection-group")
      .data(alldata.connections)
      .join("g");

    connectionGroup.append("line")
      .attr("class", "connection-line")
      .attr("x1", c => projection(alldata.servicePointsByName.get(c.source)!.wgs84)![0])
      .attr("y1", c => projection(alldata.servicePointsByName.get(c.source)!.wgs84)![1])
      .attr("x2", c => projection(alldata.servicePointsByName.get(c.target)!.wgs84)![0])
      .attr("y2", c => projection(alldata.servicePointsByName.get(c.target)!.wgs84)![1]);

    connectionGroup.each(function (c) {
      // Should probably use getTotalLength / getPointAtLength, but so far, I've failed
      // to make them work.

      // Switch to local coordinate space for calculations of label position.
      const source = projection([
        alldata.servicePointsByName.get(c.source)!.wgs84[0],
        alldata.servicePointsByName.get(c.source)!.wgs84[1],
      ])!;
      const target = projection([
        alldata.servicePointsByName.get(c.target)!.wgs84[0],
        alldata.servicePointsByName.get(c.target)!.wgs84[1],
      ])!;

      const mid = [
        (source[0] + target[0]) / 2,
        (source[1] + target[1]) / 2,
      ];

      // Get a unit vector, so we can move the label orthogonally of the line.
      const len = Math.sqrt(Math.pow(target[0] - source[0], 2) + Math.pow(target[1] - source[1], 2));
      const unit = [
        (target[0] - source[0]) / len,
        (target[1] - source[1]) / len,
      ]
      // Normal is (-y, x) in a 2D space.
      const normal = [-unit[1], unit[0]];
      const dist = 0;
      const position = [
        mid[0] + normal[0] * dist,
        mid[1] + normal[1] * dist,
      ]

      d3.select(this).append("text")
        .attr("class", "city-label")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("x", position[0])
        .attr("y", position[1])
        .text(c.time);
    });

    // Draw cities
    const cityGroup = svg.selectAll(".city-group")
      .data(alldata.relevantServicePoints)
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
        user-select: none;
    }
  `
}

declare global {
  interface HTMLElementTagNameMap {
    "zg-app": ZGApp
  }
}

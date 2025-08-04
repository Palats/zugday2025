import { LitElement, css, html } from "lit"
import { customElement, property } from "lit/decorators.js"
import * as d3 from "d3";
import * as d3zoom from "d3-zoom";
import * as topojson from "topojson-client";
import * as alldata from "./alldata";

alldata.prepareData();

/**
 * Everything.
 */
@customElement("zg-app")
export class ZGApp extends LitElement {
  @property({ type: Number })
  scale = 1;

  @property({ type: Object })
  private svg?: d3.Selection<SVGSVGElement, undefined, null, undefined>;

  @property({ type: Object })
  private mapcontainer?: d3.Selection<SVGGElement, undefined, null, undefined>;

  @property({ type: Object })
  private featurescontainer?: d3.Selection<SVGGElement, undefined, null, undefined>;

  // Basic dimensions of the data in SVG
  private width = 650;
  private height = 450;

  // map projection is always the same - we rely on transform for zoom/panning.
  private mapProjection = d3.geoMercator()
    .scale(8000) // Adjust the scale to fit Switzerland
    .center([8.2275, 46.8182]) // Center on Switzerland's coordinates
    .translate([this.width / 2, this.height / 2]);

  firstUpdated() {
    // Create the SVG container.
    this.svg = d3.create("svg")
      .attr("preserveAspectRatio", "xMidYMid meet")
      .attr("viewBox", `0 0 ${this.width} ${this.height}`);

    this.mapcontainer = this.svg.append("g");
    this.featurescontainer = this.svg.append("g");

    // Map is generated only once - it is just scaled and panned with transform.
    this.buildMap();

    // Set the zoomable property on the full SVG element so empty zones can also
    // be targets for zooming.
    this.svg.call(d3.zoom<SVGSVGElement, undefined>()
      .on('zoom', (e: d3zoom.D3ZoomEvent<SVGSVGElement, undefined>) => this.onZoom(e)));
  }

  onZoom(e: d3zoom.D3ZoomEvent<SVGSVGElement, undefined>) {
    if (!this.svg || !this.mapcontainer || !this.featurescontainer) {
      console.error("not ready for zoom");
      return;
    }

    // Objective is to:
    //  - Avoid redrawing the boundaries. I.e., rely on on transform to pan/zoom.
    //  - Keep features at constant screen size.
    //  - Make sure that features are aligned:
    //     - Need reprojecting when zooming
    //     - Can still use panning through transform

    this.scale = e.transform.k;
    const panning = new d3zoom.ZoomTransform(1, e.transform.x, e.transform.y);
    this.mapcontainer.attr("transform", e.transform.toString());
    this.featurescontainer.attr("transform", panning.toString());
  }

  render() {
    if (!this.svg) {
      return html`preparing`;
    }

    // Features need to be re-rendered when scale is changing, as coordinates are moving around.
    this.buildFeatures();

    return html`${this.svg.node()}`;
  }

  buildMap() {
    if (!this.mapcontainer) { return; }
    this.mapcontainer.selectChildren().remove();

    // Create a D3 path generator
    const path = d3.geoPath().projection(this.mapProjection);

    // Draw Switzerland
    const cantons = topojson.feature(alldata.mapdata, alldata.mapdata.objects.cantons);
    const country = topojson.feature(alldata.mapdata, alldata.mapdata.objects.country);

    this.mapcontainer.append("path")
      .datum(country)
      .attr("class", "country-background")
      .attr("d", path);

    this.mapcontainer.append("path")
      .datum(topojson.feature(alldata.mapdata, alldata.mapdata.objects.lakes))
      .attr("class", "lake")
      .attr("d", path);

    this.mapcontainer.append("path")
      .datum(cantons)
      .attr("class", "canton")
      .attr("d", path);

    this.mapcontainer.append("path")
      .datum(country)
      .attr("class", "country-border")
      .attr("d", path);
  }

  buildFeatures() {
    if (!this.featurescontainer) { return; }
    this.featurescontainer.selectChildren().remove();

    // features projection is scaled manually, while panning relies on transform.
    const featuresProjection = d3.geoMercator()
      .scale(this.scale * this.mapProjection.scale())
      .center([this.mapProjection.center()[0], this.mapProjection.center()[1]])
      .translate([
        this.scale * this.mapProjection.translate()[0],
        this.scale * this.mapProjection.translate()[1],
      ]);


    // Draw connections
    const connectionGroup = this.featurescontainer.selectAll(".connection-group")
      .data(alldata.connections)
      .join("g");

    connectionGroup.append("line")
      .attr("class", "connection-line")
      .attr("x1", c => featuresProjection(alldata.servicePointsByName.get(c.source)!.wgs84)![0])
      .attr("y1", c => featuresProjection(alldata.servicePointsByName.get(c.source)!.wgs84)![1])
      .attr("x2", c => featuresProjection(alldata.servicePointsByName.get(c.target)!.wgs84)![0])
      .attr("y2", c => featuresProjection(alldata.servicePointsByName.get(c.target)!.wgs84)![1])
      .style("stroke-width", c => 1 + 2 * c.timeMinutes / 120);

    connectionGroup.each(function (c) {
      // Should probably use getTotalLength / getPointAtLength, but so far, I've failed
      // to make them work.

      // Switch to local coordinate space for calculations of label position.
      const source = featuresProjection([
        alldata.servicePointsByName.get(c.source)!.wgs84[0],
        alldata.servicePointsByName.get(c.source)!.wgs84[1],
      ])!;
      const target = featuresProjection([
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
        .attr("class", "connection-label")
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("x", position[0])
        .attr("y", position[1])
        .text(c.timeMinutes);
    });

    // Draw cities
    const cityGroup = this.featurescontainer.selectAll(".city-group")
      .data(alldata.relevantServicePoints)
      .enter()
      .append("g")
      .attr("class", "city-group");

    cityGroup.append("circle")
      .attr("class", "city")
      .attr("cx", sp => featuresProjection(sp.wgs84)?.[0] || 0)
      .attr("cy", sp => featuresProjection(sp.wgs84)?.[1] || 0)
      .attr("r", 5);

    // City label
    cityGroup.append("text")
      .attr("class", "city-label")
      .attr("x", sp => featuresProjection(sp.wgs84)?.[0] || 0)
      .attr("y", sp => (featuresProjection(sp.wgs84)?.[1] || 0) - 10)
      .text(sp => sp.name);
  }

  static styles = css`
    :host {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: stretch;
    }

    svg {
      height: 100%;
      width: 100%;
    }

    .country-background {
      fill: #f7f7f7;
    }

    .country-border {
      fill: none;
      stroke: #313131;
      stroke-width: 1.2;
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

    .connection-label {
        font-size: 8px;
        font-weight: bold;
        fill: #666666;
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

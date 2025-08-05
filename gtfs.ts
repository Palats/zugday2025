#!/usr/bin/env tsx

import * as cli from './src/gtfslib.js';

console.assert(process.argv.length == 3, "must provide the path to GTFS data");
const gtfsDir = process.argv[2];

await cli.run(gtfsDir);
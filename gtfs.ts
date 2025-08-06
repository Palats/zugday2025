#!/usr/bin/env tsx

import * as cli from './src/gtfslib.js';

await cli.run("local/gtfs.sqlite.db");
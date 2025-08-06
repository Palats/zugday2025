# Zug Day 2025

Maps for Zugday 2025

"amateurs de trains et d'optimisation sous contrainte"

https://zugday.ch/


## Dev

Setup:
```
npm install
```

Get GTFS (transit) files and generate DB:
```
npm run gtfs-download
```
This is needed once and generate a 5G file.


Regenerate data files:
```
npm run generate
```
This regenerate files which are already checked-in - only needed if the logic or sources have changed.

Dev webserver:
```
npm run dev
```

Build:
```
npm run build
```

## Sources
Source swiss-maps.json:

  - https://swiss-maps.interactivethings.io/
  - WGS 84, Switzerland, Cantons, Lakes, no simplification
  - From https://github.com/interactivethings/swiss-maps

Service points: https://data.opentransportdata.swiss/en/dataset/service-points-actual-date


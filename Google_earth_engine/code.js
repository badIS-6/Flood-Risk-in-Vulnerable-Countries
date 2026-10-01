/***************************************************************
  GLOBAL FLOOD DATASET ENRICHMENT — 2026
  =============================================================

  PURPOSE
  -------
  This script takes YOUR EXISTING FLOOD CSV and adds
  environmental and population indicators to every row.

  NO SHAPEFILES ARE REQUIRED.

  Your CSV already contains:

      country_name
      region_name
      latitude
      longitude
      aggregation
      indicator
      value

  Example:

      Afghanistan,Kabul,34.5665,69.5477,sum,flood,540
      Afghanistan,Kapisa,34.8563,69.6701,sum,flood,73

  GEE will create a point from latitude + longitude for each row.

  It will then add:

      rainfall_2026_mm
      rainfall_anomaly_pct
      temperature_2026_c
      temperature_anomaly_c
      soil_moisture_2026
      ndvi_2026
      elevation_m
      slope_deg
      population_2020

  The original columns are preserved.

  FINAL OUTPUT:
      Flood_Enriched_2026.csv


  =============================================================
  STEP 1 — UPLOAD YOUR FLOOD CSV TO GOOGLE EARTH ENGINE
  =============================================================

  In the GEE Code Editor:

      Assets
        ↓
      NEW
        ↓
      Table upload
        ↓
      Select your flood_dataset.csv

  After the upload finishes, click IMPORT.

  GEE will create something similar to:

      projects/YOUR_PROJECT/assets/flood_dataset

  Replace the asset path below with YOUR actual path.

****************************************************************/


// =============================================================
// 1. LOAD YOUR FLOOD CSV
// =============================================================

var floodTable = ee.FeatureCollection(
  'projects/YOUR_PROJECT/assets/flood_dataset'
);


// =============================================================
// 2. CHECK THE ORIGINAL DATA
// =============================================================

// Print the first 10 rows to the Console.
print('Original flood dataset:', floodTable.limit(10));

print(
  'Number of flood records:',
  floodTable.size()
);


// =============================================================
// 3. CONVERT CSV ROWS TO GEOGRAPHIC POINTS
// =============================================================
//
// Your CSV already has:
//
// latitude
// longitude
//
// Therefore we don't need district polygons.
//
// Each district becomes a point.
//
// Example:
//
// Kabul
// latitude  = 34.5665
// longitude = 69.5477
//
// becomes:
//
// POINT(69.5477 34.5665)
// =============================================================

var points = floodTable.map(function(feature) {

  var latitude = ee.Number(
    feature.get('latitude')
  );

  var longitude = ee.Number(
    feature.get('longitude')
  );

  var point = ee.Geometry.Point([
    longitude,
    latitude
  ]);

  return ee.Feature(
    point,
    feature.toDictionary()
  );
});


print(
  'Converted geographic points:',
  points.limit(10)
);


// =============================================================
// 4. ANALYSIS PERIOD
// =============================================================
//
// CHIRPS currently provides 2026 data through August 31.
//
// Therefore we use:
//
// 2026-01-01 → 2026-09-01
//
// which represents January through August.
//
// This same period is used where possible so that the
// indicators are temporally comparable.
//
// =============================================================

var start2026 = '2026-01-01';
var end2026   = '2026-09-01';


// Historical comparison period.
//
// 2015–2025 is used as the baseline.
//
// The anomaly therefore means:
//
// 2026 value compared with the historical average
// for the same January–August period.
//
// =============================================================

var histStart = '2015-01-01';
var histEnd   = '2026-01-01';


// =============================================================
// 5. RAINFALL — CHIRPS
// =============================================================
//
// Dataset:
// UCSB-CHG/CHIRPS/DAILY
//
// Resolution: approximately 0.05° (~5 km)
//
// Unit:
// millimeters/day for individual images.
//
// We sum the daily values to obtain cumulative rainfall
// for January–August.
//
// Source:
// Google Earth Engine Data Catalog
//
// CHIRPS currently extends into 2026. 
// =============================================================

var chirps2026 = ee.ImageCollection(
  'UCSB-CHG/CHIRPS/DAILY'
)
.filterDate(
  start2026,
  end2026
)
.select('precipitation');


// Total rainfall January–August 2026.

var rainfall2026 = chirps2026
.sum()
.rename('rainfall_2026_mm');


// Historical rainfall.
//
// Calculate the January–August rainfall for each year
// from 2015–2025 and then calculate the mean.
//
// This is preferable to comparing 2026 against the
// average of individual daily observations.

var historicalYears = ee.List.sequence(
  2015,
  2025
);


var historicalRainfall = ee.ImageCollection(
  historicalYears.map(function(year) {

    year = ee.Number(year);

    var start = ee.Date.fromYMD(
      year,
      1,
      1
    );

    var end = ee.Date.fromYMD(
      year,
      9,
      1
    );

    return ee.ImageCollection(
      'UCSB-CHG/CHIRPS/DAILY'
    )
    .filterDate(start, end)
    .select('precipitation')
    .sum()
    .rename('rainfall');

  })
).mean()
.rename('historical_rainfall');


// =============================================================
// 6. RAINFALL ANOMALY
// =============================================================
//
// Formula:
//
// ((2026 rainfall - historical rainfall)
//       / historical rainfall) × 100
//
// Example:
//
// historical = 400 mm
// 2026       = 500 mm
//
// anomaly = +25%
//
// Positive values mean wetter than normal.
//
// Negative values mean drier than normal.
// =============================================================

var rainfallAnomaly = rainfall2026
.subtract(historicalRainfall)
.divide(historicalRainfall)
.multiply(100)
.rename('rainfall_anomaly_pct');


// =============================================================
// 7. TEMPERATURE — ERA5-LAND
// =============================================================
//
// Dataset:
// ECMWF/ERA5_LAND/DAILY_AGGR
//
// Resolution: approximately 11 km.
//
// temperature_2m is provided in Kelvin.
//
// We convert it to Celsius.
//
// =============================================================

var era2026 = ee.ImageCollection(
  'ECMWF/ERA5_LAND/DAILY_AGGR'
)
.filterDate(
  start2026,
  end2026
)
.select('temperature_2m');


// Mean 2 m air temperature.

var temperature2026 = era2026
.mean()
.subtract(273.15)
.rename('temperature_2026_c');


// =============================================================
// 8. HISTORICAL TEMPERATURE
// =============================================================

var historicalTemperature = ee.ImageCollection(
  histStart === null ? [] : [
    ee.ImageCollection(
      'ECMWF/ERA5_LAND/DAILY_AGGR'
    )
    .filterDate(
      histStart,
      histEnd
    )
    .select('temperature_2m')
    .mean()
  ]
);


// Convert historical image collection to image.

var historicalTemperatureImage =
  ee.Image(
    historicalTemperature.first()
  )
  .subtract(273.15)
  .rename('historical_temperature_c');


// =============================================================
// 9. TEMPERATURE ANOMALY
// =============================================================
//
// Difference between 2026 mean temperature and
// historical mean temperature.
//
// Unit: °C
// =============================================================

var temperatureAnomaly =
  temperature2026
  .subtract(historicalTemperatureImage)
  .rename('temperature_anomaly_c');


// =============================================================
// 10. SOIL MOISTURE — SMAP
// =============================================================
//
// Current GEE dataset:
// NASA/SMAP/SPL4SMGP/008
//
// Surface soil moisture:
// 0–5 cm.
//
// Resolution:
// approximately 9 km.
//
// Unit:
// volumetric soil moisture (m³/m³)
//
// High values = wetter soil.
//
// This can be useful for flood analysis because
// saturated soil generally has less capacity to absorb
// additional rainfall.
// =============================================================

var soil2026 = ee.ImageCollection(
  'NASA/SMAP/SPL4SMGP/008'
)
.filterDate(
  start2026,
  end2026
)
.select('sm_surface')
.mean()
.rename('soil_moisture_2026');


// =============================================================
// 11. NDVI — MODIS
// =============================================================
//
// Dataset:
// MODIS/061/MOD13Q1
//
// Resolution:
// 250 m.
//
// NDVI is useful as an environmental/context indicator.
//
// MODIS NDVI is scaled by 10,000.
//
// Therefore:
//
// raw NDVI  = 5000
// real NDVI = 0.50
//
// =============================================================

var ndvi2026 = ee.ImageCollection(
  'MODIS/061/MOD13Q1'
)
.filterDate(
  start2026,
  end2026
)
.select('NDVI')
.mean()
.multiply(0.0001)
.rename('ndvi_2026');


// =============================================================
// 12. ELEVATION — SRTM
// =============================================================
//
// Elevation is useful because topography strongly affects
// flood accumulation and drainage.
//
// Unit:
// metres above sea level.
// =============================================================

var elevation = ee.Image(
  'USGS/SRTMGL1_003'
)
.rename('elevation_m');


// =============================================================
// 13. SLOPE
// =============================================================
//
// Calculated from SRTM elevation.
//
// Unit:
// degrees.
// =============================================================

var slope = ee.Terrain
.slope(elevation)
.rename('slope_deg');


// =============================================================
// 14. POPULATION
// =============================================================
//
// WorldPop provides approximately 100 m population grids.
//
// IMPORTANT:
//
// The GEE WorldPop collection currently available here
// goes through 2021, not 2026.
//
// Therefore we explicitly use 2020 population.
//
// Do NOT label this as "2026 population".
//
// If we later want 2026 population, we should use a
// separate population projection dataset.
//
// =============================================================

var population2020 = ee.ImageCollection(
  'WorldPop/GP/100m/pop'
)
.filter(
  ee.Filter.eq('year', 2020)
)
.mosaic()
.rename('population_2020');


// =============================================================
// 15. COMBINE ALL INDICATORS
// =============================================================
//
// Create one multi-band image.
//
// Each point will sample all of these bands.
//
// =============================================================

var indicators = ee.Image.cat([

  rainfall2026,

  rainfallAnomaly,

  temperature2026,

  temperatureAnomaly,

  soil2026,

  ndvi2026,

  elevation,

  slope,

  population2020

]);


print(
  'Indicator image:',
  indicators
);


// =============================================================
// 16. SAMPLE THE INDICATORS AT EVERY FLOOD POINT
// =============================================================
//
// Each CSV row gets environmental values corresponding
// to its latitude/longitude.
//
// IMPORTANT:
//
// The original attributes are preserved.
//
// Therefore:
//
// country_name
// region_name
// latitude
// longitude
// aggregation
// indicator
// value
//
// remain in the output.
//
// New attributes are added after them.
// =============================================================

var enriched = indicators
.sampleRegions({

  collection: points,

  properties: [
    'country_name',
    'region_name',
    'latitude',
    'longitude',
    'aggregation',
    'indicator',
    'value'
  ],

  scale: 1000,

  geometries: false

});


// =============================================================
// 17. INSPECT RESULT
// =============================================================

print(
  'ENRICHED DATASET:',
  enriched.limit(20)
);


// =============================================================
// 18. EXPORT TO CSV
// =============================================================
//
// Google Drive will receive:
//
// Flood_Enriched_2026.csv
//
// =============================================================

Export.table.toDrive({

  collection: enriched,

  description:
    'Flood_Enriched_2026',

  fileNamePrefix:
    'Flood_Enriched_2026',

  fileFormat:
    'CSV'

});


// =============================================================
// 19. OPTIONAL MAP CHECK
// =============================================================
//
// Display your flood locations.
//
// This is only for checking that the coordinates were
// interpreted correctly.
// =============================================================

Map.addLayer(
  points,
  {
    color: 'red'
  },
  'Flood District Points'
);

Map.centerObject(
  points,
  2
);


/***************************************************************
 EXPECTED OUTPUT
 ***************************************************************

 Your original:

 country_name
 region_name
 latitude
 longitude
 aggregation
 indicator
 value

 becomes:

 country_name
 region_name
 latitude
 longitude
 aggregation
 indicator
 value

 rainfall_2026_mm
 rainfall_anomaly_pct

 temperature_2026_c
 temperature_anomaly_c

 soil_moisture_2026

 ndvi_2026

 elevation_m
 slope_deg

 population_2020


 Example:

 Afghanistan
 Kabul
 34.5665
 69.5477
 sum
 flood
 540
 312.4
 18.7
 14.2
 1.1
 0.18
 0.31
 1795
 6.4
 48231


 ***************************************************************
 IMPORTANT SCIENTIFIC NOTE
 ***************************************************************

 Do NOT combine these variables into a "danger score" yet.

 The existing "value" column is not yet known to represent
 exactly the same thing as a physical flood hazard measurement.

 First create the enriched dataset.

 Then determine:

 1. What exactly does "value" measure?
 2. What population dataset should be used?
 3. Which variables actually improve flood prediction?
 4. How should each variable be normalized?
 5. Which variables represent HAZARD?
 6. Which represent EXPOSURE?
 7. Which represent VULNERABILITY?

 Only after that should we construct the 2026
 Flood Threat / Risk classification.


 SOURCES USED:

 CHIRPS:
 UCSB-CHG/CHIRPS/DAILY

 ERA5-Land:
 ECMWF/ERA5_LAND/DAILY_AGGR

 SMAP:
 NASA/SMAP/SPL4SMGP/008

 MODIS:
 MODIS/061/MOD13Q1

 Population:
 WorldPop/GP/100m/pop

 SRTM:
 USGS/SRTMGL1_003

***************************************************************/

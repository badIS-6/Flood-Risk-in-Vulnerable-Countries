var floodTable = ee.FeatureCollection(
  'users/cereal-ml/flood_dataset'
);

print(
  'Number of records',
  floodTable.size()
);

print(
  'First feature',
  floodTable.first()
);

Map.addLayer(
  floodTable,
  {color:'red'},
  'Flood locations'
);

Map.centerObject(
  floodTable,
  2
);



print(
  'Record count',
  floodTable.size()
);

print(
  'First feature',
  floodTable.first()
);




var start2026 =
  '2026-01-01';

var end2026 =
  '2026-09-01';


var rainfall2026 = ee.ImageCollection(
  'UCSB-CHG/CHIRPS/DAILY'
)
.filterDate(
  start2026,
  end2026
)
.select('precipitation')
.sum()
.rename(
  'rainfall_2026_mm'
);


// ============================================================
// HISTORICAL RAINFALL
// ============================================================

var years = ee.List.sequence(
  2015,
  2025
);

var historicalRainfall =
  ee.ImageCollection.fromImages(

    years.map(function(year){

      year = ee.Number(year);

      var start =
        ee.Date.fromYMD(
          year,
          1,
          1
        );

      var end =
        ee.Date.fromYMD(
          year,
          9,
          1
        );

      return ee.ImageCollection(
        'UCSB-CHG/CHIRPS/DAILY'
      )
      .filterDate(
        start,
        end
      )
      .select('precipitation')
      .sum();

    })

  )
  .mean()
  .rename(
    'historical_rainfall_mm'
  );



var rainfallAnomaly =
  rainfall2026
  .subtract(
    historicalRainfall
  )
  .divide(
    historicalRainfall
  )
  .multiply(100)
  .rename(
    'rainfall_anomaly_pct'
  );




var temperature2026 =
  ee.ImageCollection(
    'ECMWF/ERA5_LAND/DAILY_AGGR'
  )
  .filterDate(
    start2026,
    end2026
  )
  .select(
    'temperature_2m'
  )
  .mean()
  .subtract(273.15)
  .rename(
    'temperature_2026_c'
  );




var historicalTemperature =
  ee.ImageCollection(
    'ECMWF/ERA5_LAND/DAILY_AGGR'
  )
  .filterDate(
    '2015-01-01',
    '2026-01-01'
  )
  .select(
    'temperature_2m'
  )
  .mean()
  .subtract(273.15)
  .rename(
    'historical_temperature_c'
  );




var temperatureAnomaly =
  temperature2026
  .subtract(
    historicalTemperature
  )
  .rename(
    'temperature_anomaly_c'
  );




var ndvi2026 =
  ee.ImageCollection(
    'MODIS/061/MOD13Q1'
  )
  .filterDate(
    start2026,
    end2026
  )
  .select(
    'NDVI'
  )
  .mean()
  .multiply(
    0.0001
  )
  .rename(
    'ndvi_2026'
  );




var elevation =
  ee.Image(
    'USGS/SRTMGL1_003'
  )
  .rename(
    'elevation_m'
  );


var slope =
  ee.Terrain.slope(
    elevation
  )
  .rename(
    'slope_deg'
  );




var indicators = ee.Image.cat([

  rainfall2026,

  rainfallAnomaly,

  temperature2026,

  temperatureAnomaly,

  ndvi2026,

  elevation,

  slope

]);



var enriched = floodTable.map(function(feature){

  var extracted =
    indicators.reduceRegion({

      reducer:
        ee.Reducer.first(),

      geometry:
        feature.geometry(),

      scale:
        1000,

      bestEffort:
        true,

      maxPixels:
        1e8

    });

  return feature.set(
    extracted
  );

});


print(
  'Enriched count',
  enriched.size()
);

print(
  'Example',
  enriched.first()
);


Export.table.toDrive({

  collection:
    enriched,

  description:
    'Flood_Enriched_2026',

  fileFormat:
    'CSV'

});



Map.addLayer(
  floodTable,
  {color:'red'},
  'Flood Points'
);

Map.centerObject(
  floodTable,
  2
);

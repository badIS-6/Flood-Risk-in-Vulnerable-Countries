# Flood Risk Assessment in Vulnerable Countries

## 1. Context

Floods are among the major natural hazards affecting vulnerable and impoverished regions, particularly where intense rainfall, low elevation, topography and previous records increase exposure to flooding.

This project develops a web-based flood risk assessment tool that combines historical flood records with remote sensing and geospatial data. The objective is to provide municipalities, urban planners, civil protection authorities and citizens with a simple interface for exploring flood-related indicators and obtaining a **regional flood risk assessment**.

---

## 2. Scope

The platform covers **vulnerable countries**, mostly ones ravaged by wars, famine and climate change.
- Afghanistan
- Burundi
- Central African Republic
- Chad
- Colombia
- DR Congo
- Ethiopia
- Haiti
- Mali
- Mozambique
- Myanmar
- Niger
- Nigeria
- Somalia
- Sudan
- Syria
- Ukraine
- Venezuela
- Yemen

---

## 3. Workflow

Remote Sensing Data → GIS Analysis → Web Page → User Feedback Form

## 3.1 Remote Sensing Data

The project combines a **historical flood dataset** with several Earth observation and geospatial datasets processed with Google Earth Engine.

#### Flood dataset

A flood occurrence dataset is used to get historical flood data for the selected locations.
Source: https://data.humdata.org/dataset/

#### CHIRPS — Rainfall

Dataset: UCSB-CHG/CHIRPS/DAILY

#### Rainfall anomaly
```text
Rainfall Anomaly (%) = ((2026 Rainfall - Historical Rainfall) / Historical Rainfall) × 100
```

#### ERA5-Land — Temperature

Dataset: ECMWF/ERA5_LAND/DAILY_AGGR


#### MODIS — NDVI

Dataset: MODIS/061/MOD13Q1

MODIS NDVI is used as an indicator of vegetation conditions.

#### SRTM — Elevation

Dataset: USGS/SRTMGL1_003


#### Slope

```text
Slope = Terrain Slope(Elevation)
```


## 3.2 GIS Analysis
### GEE Layer
<img width="1858" height="841" alt="image" src="https://github.com/user-attachments/assets/b1414058-34c3-4b1c-ab9e-b589f195b009" />

Google Earth Engine (https://code.earthengine.google.com/) is used to combine the flood dataset with the remote sensing and terrain indicators:

* Historical flood occurrence
* 2026 rainfall
* Rainfall anomaly
* 2026 temperature
* 2026 NDVI
* Elevation
* Slope

The enriched dataset is then exported from Google Earth Engine as `Flood_Enriched_2026.csv`.

### Flood Risk Assessment Process (in HTML)

First, the variables are normalized to a common scale from 0 to 1: `Normalized Value = (Value - Minimum) / (Maximum - Minimum)`

For elevation, slope and NDVI, the normalized value is inverted: `Inverted Value = 1 - Normalized Value`

The final risk score is calculated:

```text
Risk Score =(Historical Floods × 0.35 + Rainfall × 0.25+ Elevation × 0.15+ Slope × 0.10+ NDVI × 0.10 + Temperature × 0.05) × 100
```

The resulting score is classified into five risk levels:

```text
0–20     → Very Low Risk
21–40    → Low Risk
41–60    → Moderate Risk
61–80    → High Risk
81–100   → Very High Risk
```


### 3.3 Web Page
Link: https://badis-6.github.io/Flood-Risk-in-Vulnerable-Countries/

The GIS results are integrated into `index.html`.
<img width="1841" height="914" alt="image" src="https://github.com/user-attachments/assets/70b5c211-4564-4619-9ee7-547ecf657551" />

The web application uses:

* **Leaflet** for the interactive GIS map
* **OpenStreetMap** as the base map
* **PapaParse** to load the Google Earth Engine CSV dataset
* **HTML, CSS, and JavaScript** for the user interface and risk assessment

The user selects:

1. A country
2. A region


### 3.4 User Form

The web page includes a user interaction form containing:

* Name (optional)
* Email (optional)
* Country
* Region

The user selects a country and then selects a corresponding region.

After selecting the location and clicking **"Assess Flood Risk"**, the application displays the flood risk assessment for that region.

The form provides an interaction layer between the user and the GIS-based assessment system, allowing users to select a geographic location and receive its corresponding flood risk information.

---


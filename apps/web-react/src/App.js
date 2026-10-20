import React, { useState, useEffect, useRef } from "react";
import { MapContainer, TileLayer, GeoJSON, CircleMarker, Popup } from "react-leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";
import "./App.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:8000";
const REFRESH_MS = 5 * 60 * 1000;

const fmt = (value) => Number(value || 0).toFixed(1);

function App() {
  const [maxValue, setMaxValue] = useState(150);
  const [pollutant, setPollutant] = useState("aqi");
  const [searchTerm, setSearchTerm] = useState("");
  const [geoData, setGeoData] = useState({ grids: null, stations: [] });
  const [version, setVersion] = useState(0);
  const [regionData, setRegionData] = useState(null);
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  // Reload when a filter changes (debounced) and every 5 minutes.
  useEffect(() => {
    const load = async () => {
      const id = ++requestId.current;
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_URL}/api/geojson`, {
          params: { max_value: maxValue, pollutant, search_term: searchTerm },
        });
        if (id !== requestId.current) return; // a newer request superseded this one
        setGeoData(response.data);
        setVersion((v) => v + 1); // react-leaflet's GeoJSON ignores data changes without a new key
        setStatus("Map updated.");
      } catch (error) {
        if (id !== requestId.current) return;
        setStatus(`Error fetching map data: ${error.response?.data?.detail || error.message}`);
      } finally {
        if (id === requestId.current) setIsLoading(false);
      }
    };

    const timer = setTimeout(load, 500);
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [maxValue, pollutant, searchTerm]);

  const fetchRegionData = async (gridName) => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/region`, { params: { grid_name: gridName } });
      setRegionData(response.data);
      setStatus(`Region data loaded for ${gridName}.`);
    } catch (error) {
      setStatus(`Error fetching region data: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const reportParams = new URLSearchParams({
    max_value: maxValue,
    pollutant,
    search_term: searchTerm,
  });

  return (
    <div className="app-container">
      <h1>Bengaluru Live Air Quality Map</h1>
      <div className="status">{isLoading ? "Loading..." : status}</div>
      <div className="controls">
        <label htmlFor="max-value">Max value: {maxValue}</label>
        <input
          id="max-value"
          type="range"
          min="0"
          max="200"
          step="10"
          value={maxValue}
          onChange={(e) => setMaxValue(Number(e.target.value))}
        />
        <label htmlFor="pollutant">Pollutant:</label>
        <select id="pollutant" value={pollutant} onChange={(e) => setPollutant(e.target.value)}>
          <option value="aqi">AQI</option>
          <option value="pm25">PM2.5</option>
          <option value="pm10">PM10</option>
          <option value="no2">NO2</option>
          <option value="so2">SO2</option>
          <option value="co">CO</option>
        </select>
        <label htmlFor="search">Station:</label>
        <input
          id="search"
          type="text"
          placeholder="e.g. BTM Layout"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>
      <MapContainer center={[12.9716, 77.5946]} zoom={11} style={{ height: "600px", width: "100%" }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        {geoData.grids && (
          <GeoJSON
            key={version}
            data={geoData.grids}
            style={(feature) => ({
              fillColor: feature.properties.color,
              color: feature.properties.color,
              weight: 1,
              fillOpacity: 0.25,
            })}
            onEachFeature={(feature, layer) => {
              layer.on("click", () => fetchRegionData(feature.properties.grid_name));
            }}
          />
        )}
        {geoData.stations.map((station) => (
          <CircleMarker
            key={station.uid ?? `${station.latitude},${station.longitude}`}
            center={[station.latitude, station.longitude]}
            radius={8}
            color={station.color}
            fillColor={station.color}
            fillOpacity={0.8}
          >
            <Popup>
              <strong>{station.location}</strong>
              <br />
              AQI: {fmt(station.aqi)} ({station.aqi_category})
              <br />
              PM2.5: {fmt(station.pm25)} · PM10: {fmt(station.pm10)}
              <br />
              NO2: {fmt(station.no2)} · SO2: {fmt(station.so2)} · CO: {fmt(station.co)}
              <br />
              <small>Pollutants are WAQI AQI sub-indices.</small>
              <br />
              Health: {station.health_recommendation}
              <br />
              Updated: {new Date(station.last_updated).toLocaleString()}
              {station.forecast?.pm25 && (
                <details>
                  <summary>PM2.5 daily forecast</summary>
                  <ul>
                    {station.forecast.pm25.map((day) => (
                      <li key={day.day}>
                        {day.day}: avg {fmt(day.avg)} (min {fmt(day.min)}, max {fmt(day.max)})
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
      {regionData && (
        <div className="region-info">
          <h2>Region: {regionData.grid_name}</h2>
          <p>PM2.5: {fmt(regionData.pollutants.pm25)}</p>
          <p>PM10: {fmt(regionData.pollutants.pm10)}</p>
          <p>NO2: {fmt(regionData.pollutants.no2)}</p>
          <p>SO2: {fmt(regionData.pollutants.so2)}</p>
          <p>CO: {fmt(regionData.pollutants.co)}</p>
          <p>Health recommendation: {regionData.health_recommendation}</p>
          <p>Stations: {regionData.stations.map((s) => s.location).join(", ")}</p>
        </div>
      )}
      <a
        href={`${API_URL}/api/report?${reportParams}`}
        download="bengaluru_air_quality_report.pdf"
        className="download-link"
      >
        Download PDF Report
      </a>
    </div>
  );
}

export default App;

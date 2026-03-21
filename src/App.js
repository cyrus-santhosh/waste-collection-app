import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [bins, setBins] = useState([]);
  const [nearest, setNearest] = useState(null);
  const [popup, setPopup] = useState("");

  // Mock bin data
  useEffect(() => {
    setBins([
      { id: 1, lat: 12.9716, lon: 77.5946, status: "empty" },
      { id: 2, lat: 12.9725, lon: 77.5955, status: "full" },
      { id: 3, lat: 12.9735, lon: 77.5965, status: "half" }
    ]);
  }, []);

  // Find nearest bin
  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(findNearest);
    } else {
      alert("Geolocation not supported");
    }
  };

  const findNearest = (position) => {
    const userLat = position.coords.latitude;
    const userLon = position.coords.longitude;

    let nearestBin = null;
    let minDist = Infinity;

    bins.forEach(bin => {
      const dist = Math.sqrt(
        Math.pow(userLat - bin.lat, 2) +
        Math.pow(userLon - bin.lon, 2)
      );

      if (dist < minDist) {
        minDist = dist;
        nearestBin = bin;
      }
    });

    setNearest(nearestBin);
  };

  // Report issue
  const reportIssue = (id) => {
    setPopup(`Issue reported for Bin ${id}`);
    setTimeout(() => setPopup(""), 2000);
  };

  return (
    <div className="App">
      <header>Smart Waste Bin Finder</header>

      <div className="container">
        <button onClick={getLocation}>📍 Find Nearest Bin</button>

        {nearest && (
          <h3>
            Nearest Bin: ID {nearest.id} ({nearest.status.toUpperCase()})
          </h3>
        )}

        <h2>Available Bins</h2>

        <ul>
          {bins.map(bin => (
            <li key={bin.id}>
              <strong>Bin {bin.id}</strong><br />
              Status: <span className={bin.status}>{bin.status.toUpperCase()}</span><br />
              <button onClick={() => reportIssue(bin.id)}>Report Issue</button>
            </li>
          ))}
        </ul>
      </div>

      {popup && <div className="popup">{popup}</div>}
    </div>
  );
}

export default App;
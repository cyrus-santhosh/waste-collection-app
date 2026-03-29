import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import { useEffect, useState } from "react";
import L from "leaflet";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

L.Marker.prototype.options.icon = DefaultIcon;

function MapView() {
  const [bins, setBins] = useState([]);

  useEffect(() => {
    if (!window.__db) return;

    const { collection, onSnapshot } = window.__firebase;

    const binsRef = collection(window.__db, "bins");

    const unsub = onSnapshot(binsRef, (snap) => {
      const data = snap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setBins(data);
    });

    return () => unsub();
  }, []);

  return (
    <MapContainer
      key={Math.random()}
      center={[12.9716, 77.5946]} // Bengaluru
      zoom={13}
      style={{ height: "500px", width: "100%" }}
    >
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {bins.map((bin) => (
        <Marker key={bin.id} position={[bin.lat, bin.lng]}>
          <Popup>
            🗑️ <b>{bin.binId}</b> <br />
            Status: {bin.status} <br />
            Capacity: {bin.capacity}%
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

export default MapView;
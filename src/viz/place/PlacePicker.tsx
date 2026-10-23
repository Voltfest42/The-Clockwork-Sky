import { useId, useState } from 'react';
import { PLACES } from '../../data/places';
import { formatLatLon, setCity, setPlace, usePlace } from '../../site/place';
import styles from '../time/controls.module.css';

/**
 * Where you stand: a list of cities in both hemispheres, your own coordinates,
 * or your location from the browser (which asks first, and stays in this
 * browser). The choice is shared by every sky figure and remembered here.
 */
export function PlacePicker({ compact = false }: { compact?: boolean }) {
  const place = usePlace();
  const id = useId();
  const [editing, setEditing] = useState(place.id === 'custom');
  const [lat, setLat] = useState(String(place.latitude));
  const [lon, setLon] = useState(String(place.longitude));
  const [status, setStatus] = useState<string | null>(null);

  const choose = (value: string) => {
    setStatus(null);
    if (value === 'custom') {
      setEditing(true);
      setLat(String(place.latitude));
      setLon(String(place.longitude));
      return;
    }
    if (value === 'here') return locate();
    setEditing(false);
    setCity(value);
  };

  const commit = (latText: string, lonText: string) => {
    const latitude = Number(latText);
    const longitude = Number(lonText);
    if (latText.trim() === '' || lonText.trim() === '' || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    setPlace({ id: 'custom', name: formatLatLon(latitude, longitude), latitude, longitude, timeZone: null });
  };

  const locate = () => {
    if (!('geolocation' in navigator)) {
      setStatus('This browser can’t share its location.');
      return;
    }
    setStatus('Asking your browser…');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = Math.round(position.coords.latitude * 100) / 100;
        const longitude = Math.round(position.coords.longitude * 100) / 100;
        let timeZone: string | null;
        try {
          timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
        } catch {
          timeZone = null;
        }
        setEditing(false);
        setStatus(null);
        setPlace({ id: 'here', name: 'Your location', latitude, longitude, timeZone });
      },
      () => setStatus('Your location wasn’t shared, so the figures stay where they were.'),
      { maximumAge: 600_000, timeout: 15_000 },
    );
  };

  const latInvalid = editing && (lat.trim() === '' || !(Math.abs(Number(lat)) <= 90));
  const lonInvalid = editing && (lon.trim() === '' || !(Math.abs(Number(lon)) <= 180));

  return (
    <div className={styles.place} role="group" aria-label="Where you are">
      <label className={styles.field}>
        <span className={styles.label}>{compact ? 'Place' : 'Where you are'}</span>
        <select value={editing ? 'custom' : place.id} onChange={(e) => choose(e.target.value)}>
          {PLACES.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
          <option value="here">{place.id === 'here' ? 'Your location' : 'Use my location…'}</option>
          <option value="custom">Latitude and longitude…</option>
        </select>
      </label>
      {editing ? (
        <>
          <label className={styles.field}>
            <span className={styles.label} id={`${id}-lat`}>
              Latitude
            </span>
            <input
              className={styles.coordinate}
              type="number"
              step="0.1"
              min={-90}
              max={90}
              value={lat}
              aria-invalid={latInvalid}
              aria-describedby={`${id}-hint`}
              onChange={(e) => {
                setLat(e.target.value);
                commit(e.target.value, lon);
              }}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.label}>Longitude</span>
            <input
              className={styles.coordinate}
              type="number"
              step="0.1"
              min={-180}
              max={180}
              value={lon}
              aria-invalid={lonInvalid}
              aria-describedby={`${id}-hint`}
              onChange={(e) => {
                setLon(e.target.value);
                commit(lat, e.target.value);
              }}
            />
          </label>
          <span id={`${id}-hint`} className={styles.hint}>
            Degrees; south and west are negative.
          </span>
        </>
      ) : (
        <span className={styles.hint}>{formatLatLon(place.latitude, place.longitude)}</span>
      )}
      {status && (
        <span className={styles.hint} role="status">
          {status}
        </span>
      )}
    </div>
  );
}

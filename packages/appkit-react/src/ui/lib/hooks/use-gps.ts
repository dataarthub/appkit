import { useEffect, useState } from 'react';
/** Browser location in decimal degrees, with accuracy in metres. */
export interface GPSCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
}
/**
 * Request one position after mount. Returns undefined before success, on denial,
 * or when geolocation is unavailable. Requires the host's secure context/permission.
 * Never requests during SSR and ignores late callbacks after unmount. Errors are logged.
 */
export function useGPS(): GPSCoordinates | undefined {
  const [location, setLocation] = useState<GPSCoordinates>();
  useEffect(() => {
    let active = true;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          if (active)
            setLocation({
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
            });
        },
        (error) => {
          if (active) console.error('GPS Error:', error);
        },
      );
    }
    return () => {
      active = false;
    };
  }, []);
  return location;
}

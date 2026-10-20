import { useEffect, useState } from 'react';
/**
 * Browser location in decimal degrees, with accuracy in metres.
 * @see useGPS for the canonical usage example.
 */
export interface GPSCoordinates {
  /**
   * Latitude in decimal degrees as supplied by browser geolocation.
   */
  latitude: number;
  /**
   * Longitude in decimal degrees as supplied by browser geolocation.
   */
  longitude: number;
  /**
   * Estimated horizontal accuracy in metres reported by the browser.
   */
  accuracy: number;
}
/**
 * Requests one browser position after mounting.
 *
 * @returns Coordinates after success, otherwise undefined while pending, denied or unavailable.
 *
 * @remarks Requires a secure context and browser location permission. No SSR request is
 * made. Late callbacks are ignored after unmount; underlying geolocation is not cancelled.
 * Errors are logged to console; no providers or styles are required.
 *
 * @example
 * ```tsx
 * import { useGPS } from '@alneas/appkit-react/ui/hooks';
 * export function Location() {
 *   const position = useGPS();
 *   return <output>{position ? `${position.latitude}, ${position.longitude}` : 'Location unavailable'}</output>;
 * }
 * ```
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

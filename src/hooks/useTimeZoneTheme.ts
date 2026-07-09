import { useState, useEffect } from 'react';

// =============================================================================
// HIGH-FIDELITY MAP STYLES FOR DYNAMIC TIME-ZONE LAYERING
// =============================================================================

// Golden-amber morning/dawn style
export const SUNRISE_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1f1d24" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#dfccb7" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1f1d24" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#28232c" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#332a39" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#4a3c4f" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#ffb86c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#161b26" }] }
];

// Clean, bright Swiss-style day map style
export const DAY_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#f2efe9" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#5c626e" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#f2efe9" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#d6d0c5" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#e0dcce" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#e8e4d8" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#6b778c" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "road", "elementType": "geometry.stroke", "stylers": [{ "color": "#e3ded2" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#fada7a" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#e8e5dc" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#a1cbd4" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#517482" }] }
];

// Rich lavender and magic-hour pink dusk style
export const SUNSET_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#1c1424" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#d7b4db" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#1c1424" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#231830" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#2c1d3c" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#3b2354" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#ff79c6" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#10101e" }] }
];

// Classic dark cyberpunk night map style (Ultimate Neon)
export const NIGHT_MAP_STYLE = [
  { "elementType": "geometry", "stylers": [{ "color": "#090d16" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#74889c" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#090d16" }] },
  { "featureType": "administrative", "elementType": "geometry.stroke", "stylers": [{ "color": "#1a2538" }] },
  { "featureType": "landscape.natural", "elementType": "geometry", "stylers": [{ "color": "#0d1421" }] },
  { "featureType": "poi", "elementType": "geometry", "stylers": [{ "color": "#111b2b" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#00ffd5" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#16233b" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#1f3354" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#00ffd5" }, { "weight": 0.5 }] },
  { "featureType": "road.highway", "elementType": "geometry.stroke", "stylers": [{ "color": "#125166" }] },
  { "featureType": "transit", "elementType": "geometry", "stylers": [{ "color": "#13213c" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#050a12" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#1d324f" }] }
];

export interface TimeZoneTheme {
  localHour: number;
  localTimeStr: string;
  phase: 'sunrise' | 'day' | 'sunset' | 'night';
  isDaytime: boolean;
  mapStyles: any[];
  glowingColor: string;
}

/**
 * Calculates local solar time using the coordinate's longitude,
 * and yields the corresponding Day vs. Night themed map styling arrays.
 * 
 * @param lat Latitude of the target coordinate
 * @param lng Longitude of the target coordinate
 */
export function useTimeZoneTheme(lat: number, lng: number): TimeZoneTheme {
  const [theme, setTheme] = useState<TimeZoneTheme>({
    localHour: 12,
    localTimeStr: '12:00 PM',
    phase: 'day',
    isDaytime: true,
    mapStyles: DAY_MAP_STYLE,
    glowingColor: 'from-amber-400 to-yellow-500'
  });

  useEffect(() => {
    // 15 degrees longitude represents approximately 1 hour of time shift in GMT
    const offsetHours = lng / 15.0;
    
    // Get current system UTC time in milliseconds
    const now = new Date();
    const utcMillis = now.getTime() + (now.getTimezoneOffset() * 60000);
    
    // Extrapolate local date based on UTC and calculated longitude offset
    const localDate = new Date(utcMillis + (offsetHours * 3600000));
    
    const rawHour = localDate.getHours();
    const rawMinute = localDate.getMinutes();
    const hourFloat = rawHour + rawMinute / 60.0;

    let phase: 'sunrise' | 'day' | 'sunset' | 'night' = 'day';
    let isDaytime = true;
    let mapStyles: any[] = DAY_MAP_STYLE;
    let glowingColor = 'from-yellow-400 to-amber-500';

    if (hourFloat >= 5.5 && hourFloat < 7.0) {
      phase = 'sunrise';
      isDaytime = true;
      mapStyles = SUNRISE_MAP_STYLE;
      glowingColor = 'from-amber-500 to-rose-400';
    } else if (hourFloat >= 7.0 && hourFloat < 17.5) {
      phase = 'day';
      isDaytime = true;
      mapStyles = DAY_MAP_STYLE;
      glowingColor = 'from-cyan-400 to-amber-400';
    } else if (hourFloat >= 17.5 && hourFloat < 19.5) {
      phase = 'sunset';
      isDaytime = false;
      mapStyles = SUNSET_MAP_STYLE;
      glowingColor = 'from-rose-500 to-purple-600';
    } else {
      phase = 'night';
      isDaytime = false;
      mapStyles = NIGHT_MAP_STYLE;
      glowingColor = 'from-cyan-500 to-blue-600';
    }

    // Determine target IANA-compatible timezone standard dynamically based on coordinate longitude
    let timeZone = 'UTC';
    try {
      const offset = Math.round(lng / 15);
      if (offset !== 0) {
        // Etc/GMT signs are mathematically reversed in IANA specification (e.g. Etc/GMT-5 is UTC+5)
        const sign = offset > 0 ? '-' : '+';
        timeZone = `Etc/GMT${sign}${Math.abs(offset)}`;
      }
    } catch (tzErr) {
      timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    }

    let localTimeStr = '';
    try {
      localTimeStr = new Intl.DateTimeFormat('en-US', {
        timeZone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      }).format(now);
    } catch (fmtErr) {
      // Safe fallback if target Etc/GMT zone isn't supported in browser environment
      localTimeStr = localDate.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    }

    setTheme({
      localHour: hourFloat,
      localTimeStr,
      phase,
      isDaytime,
      mapStyles,
      glowingColor
    });
  }, [lat, lng]);

  return theme;
}

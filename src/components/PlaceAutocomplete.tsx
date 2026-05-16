import { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
  className?: string;
  placeholder?: string;
}

export default function PlaceAutocomplete({ onPlaceSelect, className, placeholder }: PlaceAutocompleteProps) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (!places || !inputRef.current) return;

    const options = {
      fields: ['geometry', 'name', 'formatted_address', 'address_components']
    };

    const autocomplete = new places.Autocomplete(inputRef.current, options);
    setPlaceAutocomplete(autocomplete);

    return () => {
      // Cleanup listener if needed, though getPlace is usually enough
      if (google.maps.event) {
        google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [places]);

  useEffect(() => {
    if (!placeAutocomplete) return;

    placeAutocomplete.addListener('place_changed', () => {
      onPlaceSelect(placeAutocomplete.getPlace());
    });
  }, [onPlaceSelect, placeAutocomplete]);

  return (
    <div className="relative w-full">
      <input 
        ref={inputRef} 
        placeholder={placeholder || "Search for a place..."}
        className={className}
      />
    </div>
  );
}

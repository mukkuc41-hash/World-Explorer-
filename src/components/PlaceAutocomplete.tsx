import { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

interface PlaceAutocompleteProps {
  onPlaceSelect: (place: google.maps.places.PlaceResult | null) => void;
  className?: string;
  placeholder?: string;
  onTextChange?: (text: string) => void;
  status?: 'neutral' | 'valid' | 'invalid';
  value?: string;
}

export default function PlaceAutocomplete({ 
  onPlaceSelect, 
  className, 
  placeholder, 
  onTextChange, 
  status = 'neutral',
  value
}: PlaceAutocompleteProps) {
  const [placeAutocomplete, setPlaceAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const places = useMapsLibrary('places');

  useEffect(() => {
    if (inputRef.current && value !== undefined) {
      inputRef.current.value = value;
    }
  }, [value]);

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
      const place = placeAutocomplete.getPlace();
      onPlaceSelect(place);
      if (place && place.formatted_address && onTextChange) {
        onTextChange(place.formatted_address);
      } else if (inputRef.current && onTextChange) {
        onTextChange(inputRef.current.value);
      }
    });
  }, [onPlaceSelect, placeAutocomplete, onTextChange]);

  const handleInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = (e.target as HTMLInputElement).value;
    onTextChange?.(value);
  };

  // Determine correct border class names
  let borderClasses = "border border-transparent focus:ring-2 focus:ring-[#5A5A40]";
  if (status === 'valid') {
    borderClasses = "border border-emerald-500 ring-2 ring-emerald-500/25";
  } else if (status === 'invalid') {
    borderClasses = "border border-rose-500 ring-2 ring-rose-500/25";
  }

  // Filter existing border modifiers from class name to let custom validated border take over
  let baseClass = className || "";
  if (status !== 'neutral') {
    baseClass = baseClass
      .replace(/border-none/g, '')
      .replace(/focus:ring-[#5A5A40]/g, '')
      .replace(/focus:ring-2/g, '');
  }

  const finalClass = `${baseClass} ${borderClasses} transition-all duration-350`;

  return (
    <div className="relative w-full">
      <input 
        ref={inputRef} 
        placeholder={placeholder || "Search for a place..."}
        className={finalClass}
        onInput={handleInput}
      />
    </div>
  );
}

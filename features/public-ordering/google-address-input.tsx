"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";

type AddressValue = {
  address: string;
  lat: number | null;
  lng: number | null;
};

type GooglePrediction = {
  formatted_address?: string;
  geometry?: {
    location?: {
      lat: () => number;
      lng: () => number;
    };
  };
};

type AutocompleteConstructor = new (
  input: HTMLInputElement,
  options: { fields: string[]; types: string[] },
) => {
  addListener: (eventName: "place_changed", callback: () => void) => void;
  getPlace: () => GooglePrediction;
};

type GoogleWindow = Window &
  typeof globalThis & {
    google?: {
      maps?: {
        places?: {
          Autocomplete: AutocompleteConstructor;
        };
      };
    };
  };

let placesScriptPromise: Promise<void> | null = null;

function loadPlacesScript() {
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.resolve();
  const win = window as GoogleWindow;
  if (win.google?.maps?.places?.Autocomplete) return Promise.resolve();
  if (placesScriptPromise) return placesScriptPromise;

  placesScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("No pudimos cargar Google Places."));
    document.head.appendChild(script);
  });

  return placesScriptPromise;
}

export function GoogleAddressInput({
  value,
  onChange,
  required,
}: {
  value: AddressValue;
  onChange: (value: AddressValue) => void;
  required?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [placesReady, setPlacesReady] = useState(false);

  useEffect(() => {
    let active = true;

    void loadPlacesScript()
      .then(() => {
        if (!active) return;
        const win = window as GoogleWindow;
        const input = inputRef.current;
        const Autocomplete = win.google?.maps?.places?.Autocomplete;
        if (!input || !Autocomplete) return;
        setPlacesReady(true);
        const autocomplete = new Autocomplete(input, {
          fields: ["formatted_address", "geometry"],
          types: ["address"],
        });
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const address = place.formatted_address ?? input.value;
          const lat = place.geometry?.location?.lat() ?? null;
          const lng = place.geometry?.location?.lng() ?? null;
          onChange({ address, lat, lng });
        });
      })
      .catch(() => setPlacesReady(false));

    return () => {
      active = false;
    };
  }, [onChange]);

  return (
    <div className="relative">
      <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value.address}
        onChange={(event) => onChange({ address: event.target.value, lat: null, lng: null })}
        required={required}
        placeholder={placesReady ? "Busca tu dirección" : "Dirección de entrega"}
        className="h-11 pl-9"
      />
    </div>
  );
}

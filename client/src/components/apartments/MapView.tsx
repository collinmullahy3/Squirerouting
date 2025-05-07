import React, { useState, useCallback, useRef, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from "@react-google-maps/api";
import { Apartment } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { useLocation } from "wouter";

const containerStyle = {
  width: '100%',
  height: '600px'
};

// Default center on US if no apartments are available
const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795
};

// Since we don't want to expose the API key in the client code,
// we'll use a more secure approach to get the key
const getGoogleMapsApiKey = () => {
  // In a real app, this would be fetched from an environment variable
  // that's injected at build time or retrieved securely from the server
  return ""; // Empty key for now, we'll implement proper handling
};

interface MapViewProps {
  apartments: Apartment[];
}

export default function MapView({ apartments }: MapViewProps) {
  const [, setLocation] = useLocation();
  const [selectedApartment, setSelectedApartment] = useState<Apartment | null>(null);
  const [center, setCenter] = useState(defaultCenter);
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: getGoogleMapsApiKey()
  });

  // Format price with dollar sign and comma separators
  const formatPrice = (price: string | number) => {
    const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
    
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(numericPrice);
  };

  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Calculate the center and bounds based on available apartments
  useEffect(() => {
    if (apartments.length > 0 && mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      
      apartments.forEach(apartment => {
        // We'd normally get coordinates from geocoding the address
        // For this example, we'll use hardcoded values based on the city
        
        // This is a simplified approach - in a real app, you would:
        // 1. Store lat/lng in your apartment records
        // 2. Or use a geocoding service to convert addresses to coordinates
        
        let lat = 0;
        let lng = 0;

        // Simple mapping for our demo cities
        switch(apartment.city) {
          case 'New York':
            lat = 40.7128;
            lng = -74.0060;
            break;
          case 'Boston':
            lat = 42.3601;
            lng = -71.0589;
            break;
          case 'Chicago':
            lat = 41.8781;
            lng = -87.6298;
            break;
          case 'San Francisco':
            lat = 37.7749;
            lng = -122.4194;
            break;
          case 'Miami':
            lat = 25.7617;
            lng = -80.1918;
            break;
          default:
            // Default to a US location if city isn't recognized
            lat = 39.8283;
            lng = -98.5795;
        }
        
        if (lat !== 0 && lng !== 0) {
          bounds.extend(new google.maps.LatLng(lat, lng));
        }
      });
      
      mapRef.current.fitBounds(bounds);
      
      // Set the center to the first apartment for initial view
      if (apartments[0]) {
        const firstApt = apartments[0];
        let initialLat = 39.8283;
        let initialLng = -98.5795;
        
        switch(firstApt.city) {
          case 'New York':
            initialLat = 40.7128;
            initialLng = -74.0060;
            break;
          case 'Boston':
            initialLat = 42.3601;
            initialLng = -71.0589;
            break;
          case 'Chicago':
            initialLat = 41.8781;
            initialLng = -87.6298;
            break;
          case 'San Francisco':
            initialLat = 37.7749;
            initialLng = -122.4194;
            break;
          case 'Miami':
            initialLat = 25.7617;
            initialLng = -80.1918;
            break;
        }
        
        setCenter({ lat: initialLat, lng: initialLng });
      }
    }
  }, [apartments, isLoaded]);

  if (loadError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500 mb-4">Error loading maps</p>
        <p>Google Maps failed to load. Please try again later.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="h-[600px] w-full relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={10}
        onLoad={onLoad}
        onUnmount={onUnmount}
      >
        {apartments.map((apartment) => {
          // Get coordinates based on city (simplified approach)
          let lat = 0;
          let lng = 0;

          switch(apartment.city) {
            case 'New York':
              lat = 40.7128;
              lng = -74.0060;
              break;
            case 'Boston':
              lat = 42.3601;
              lng = -71.0589;
              break;
            case 'Chicago':
              lat = 41.8781;
              lng = -87.6298;
              break;
            case 'San Francisco':
              lat = 37.7749;
              lng = -122.4194;
              break;
            case 'Miami':
              lat = 25.7617;
              lng = -80.1918;
              break;
            default:
              return null; // Skip if we don't have coordinates
          }

          return (
            <Marker
              key={apartment.id}
              position={{ lat, lng }}
              onClick={() => setSelectedApartment(apartment)}
            />
          );
        })}

        {selectedApartment && (
          <InfoWindow
            position={{
              lat: (() => {
                switch(selectedApartment.city) {
                  case 'New York': return 40.7128;
                  case 'Boston': return 42.3601;
                  case 'Chicago': return 41.8781;
                  case 'San Francisco': return 37.7749;
                  case 'Miami': return 25.7617;
                  default: return 39.8283;
                }
              })(),
              lng: (() => {
                switch(selectedApartment.city) {
                  case 'New York': return -74.0060;
                  case 'Boston': return -71.0589;
                  case 'Chicago': return -87.6298;
                  case 'San Francisco': return -122.4194;
                  case 'Miami': return -80.1918;
                  default: return -98.5795;
                }
              })()
            }}
            onCloseClick={() => setSelectedApartment(null)}
          >
            <Card className="min-w-[250px]">
              <CardContent className="p-4">
                <h3 className="font-bold text-lg mb-1">{selectedApartment.title}</h3>
                <p className="text-lg text-primary font-semibold mb-2">
                  {formatPrice(selectedApartment.price)}/mo
                </p>
                <p className="text-sm mb-1">
                  {selectedApartment.address}, {selectedApartment.city}, {selectedApartment.state}
                </p>
                <p className="text-sm">
                  {selectedApartment.bedrooms} {selectedApartment.bedrooms === 1 ? 'Bed' : 'Beds'} · {selectedApartment.bathrooms} {Number(selectedApartment.bathrooms) === 1 ? 'Bath' : 'Baths'}
                </p>
              </CardContent>
              <CardFooter className="p-3 pt-0">
                <Button 
                  size="sm" 
                  className="w-full"
                  onClick={() => setLocation(`/apartments/${selectedApartment.id}`)}
                >
                  View Details
                </Button>
              </CardFooter>
            </Card>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}

'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import type { Filters, RecommendedZonesState, DisplayZone, MapPopupData, BengaluruArea, MapNavigationTarget, Coordinates } from '@/lib/types';
import { Home, Building, Factory, Info, Loader2, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { searchAndFetchRecommendations } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { GoogleMap, useJsApiLoader, MarkerF } from '@react-google-maps/api';
import { renderToStaticMarkup } from 'react-dom/server';

interface MapViewProps {
  filters: Filters;
  recommendations: RecommendedZonesState | null;
  searchTerm: string;
  isPageLoading: boolean;
  navigateTo: MapNavigationTarget | null;
  clearNavigateTo: () => void;
}

const MAP_CENTER_BENGALURU = { lat: 12.9716, lng: 77.5946 }; // Bengaluru Center
const MAP_ZOOM_DEFAULT = 11;
const MAP_ZOOM_NAVIGATED = 14;
const CLICK_DISTANCE_THRESHOLD_KM = 7; // Max distance to consider a click "near" a known area

const BENGALURU_AREA_DATA: Record<string, BengaluruArea> = {
  "KORAMANGALA": { key: "KORAMANGALA", name: "Koramangala", lat: 12.9352, lng: 77.6245 },
  "INDIRANAGAR": { key: "INDIRANAGAR", name: "Indiranagar", lat: 12.9719, lng: 77.6412 },
  "MG ROAD": { key: "MG ROAD", name: "MG Road", lat: 12.9750, lng: 77.6060 },
  "JAYANAGAR": { key: "JAYANAGAR", name: "Jayanagar", lat: 12.9309, lng: 77.5838 },
  "WHITEFIELD": { key: "WHITEFIELD", name: "Whitefield", lat: 12.9698, lng: 77.7499 },
  "ELECTRONIC CITY": { key: "ELECTRONIC CITY", name: "Electronic City", lat: 12.8452, lng: 77.6602 },
  "PEENYA": { key: "PEENYA", name: "Peenya", lat: 13.0329, lng: 77.5259 }, // Also known as Peenya Industrial Area
  "PEENYA INDUSTRIAL AREA": { key: "PEENYA INDUSTRIAL AREA", name: "Peenya Industrial Area", lat: 13.0329, lng: 77.5259 },
  "YELAHANKA": { key: "YELAHANKA", name: "Yelahanka", lat: 13.1000, lng: 77.5963 },
  "MARATHAHALLI": { key: "MARATHAHALLI", name: "Marathahalli", lat: 12.9569, lng: 77.7011 },
  "HSR LAYOUT": { key: "HSR LAYOUT", name: "HSR Layout", lat: 12.9121, lng: 77.6446 },
  "BANNERGHATTA ROAD": { key: "BANNERGHATTA ROAD", name: "Bannerghatta Road", lat: 12.8742, lng: 77.5970 },
  "MYSORE ROAD": { key: "MYSORE ROAD", name: "Mysore Road", lat: 12.9456, lng: 77.5198 },
  "HEBBAL": { key: "HEBBAL", name: "Hebbal", lat: 13.0359, lng: 77.5970 },
  "MALLESWARAM": { key: "MALLESWARAM", name: "Malleswaram", lat: 13.0014, lng: 77.5704 },
  "RAJAJINAGAR": { key: "RAJAJINAGAR", name: "Rajajinagar", lat: 12.9912, lng: 77.5512 },
  "VIJAYANAGAR": { key: "VIJAYANAGAR", name: "Vijayanagar", lat: 12.9716, lng: 77.5330 },
  "JP NAGAR": { key: "JP NAGAR", name: "JP Nagar", lat: 12.9079, lng: 77.5773 },
  "SARJAPUR ROAD": { key: "SARJAPUR ROAD", name: "Sarjapur Road", lat: 12.9100, lng: 77.6968 },
  "BELLANDUR": { key: "BELLANDUR", name: "Bellandur", lat: 12.9300, lng: 77.6785 },
  "BTM LAYOUT": { key: "BTM LAYOUT", name: "BTM Layout", lat: 12.9140, lng: 77.6090 },
  "MANYATA TECH PARK": { key: "MANYATA TECH PARK", name: "Manyata Tech Park", lat: 13.0476, lng: 77.6200 },
};


// Helper for Haversine distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

const createSvgIcon = (iconElement: React.ReactElement, color: string = 'currentColor', size: number = 24) => {
  const SvgWrapper = ({ children }: { children: React.ReactNode }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
  const staticMarkup = renderToStaticMarkup(<SvgWrapper>{iconElement.props.children}</SvgWrapper>);
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(staticMarkup)}`;
};


const ZoneIcon = ({ type, size = 16, color = 'currentColor' }: { type: DisplayZone['type'], size?: number, color?: string }) => {
  const iconProps = { className: `h-${Math.floor(size/4)} w-${Math.floor(size/4)}`, color }; // Adjusted for Tailwind JIT
  switch (type) {
    case 'residential': return <Home style={{height: `${size}px`, width: `${size}px`, color}}/>;
    case 'commercial': return <Building style={{height: `${size}px`, width: `${size}px`, color}}/>;
    case 'industrial': return <Factory style={{height: `${size}px`, width: `${size}px`, color}}/>;
    case 'known_area': return <MapPin style={{height: `${size}px`, width: `${size}px`, color}}/>;
    default: return <Info style={{height: `${size}px`, width: `${size}px`, color}}/>;
  }
};

const getMarkerIconUrl = (type: DisplayZone['type']) => {
  let iconElement: React.ReactElement;
  let color: string;

  switch (type) {
    case 'residential':
      iconElement = <Home />;
      color = 'hsl(var(--primary))'; // Sky Blue (Theme color)
      break;
    case 'commercial':
      iconElement = <Building />;
      color = 'hsl(var(--accent))'; // Pale Green (Theme color)
      break;
    case 'industrial':
      iconElement = <Factory />;
      color = '#f97316'; // orange-500 - keeping a distinct color for industrial
      break;
    case 'known_area':
    default:
      iconElement = <MapPin />;
      color = 'hsl(var(--muted-foreground))'; // Muted gray (Theme color)
      break;
  }
  return createSvgIcon(iconElement, color, 32); // Larger for map markers
};


const defaultAreaMarkers: DisplayZone[] = Object.values(BENGALURU_AREA_DATA).map(area => ({
  name: area.name,
  type: 'known_area' as const,
  lat: area.lat,
  lng: area.lng,
}));

export function MapView({ filters, recommendations, isPageLoading, navigateTo, clearNavigateTo }: MapViewProps) {
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "",
    libraries: ['marker'], // Ensure marker library is loaded if needed for advanced markers, though MarkerF is usually fine.
  });

  const [recommendedDisplayZones, setRecommendedDisplayZones] = useState<DisplayZone[]>([]);
  const [unmappedZones, setUnmappedZones] = useState<Record<string, string[]>>({ residential: [], commercial: [], industrial: [] });
  
  const [popupData, setPopupData] = useState<MapPopupData | null>(null);
  const [isPopupLoading, setIsPopupLoading] = useState(false);
  const { toast } = useToast();
  const mapRef = useRef<google.maps.Map | null>(null);

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  const onMapUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  useEffect(() => {
    if (navigateTo && mapRef.current) {
      let targetCoords: Coordinates | undefined;
      if ('lat' in navigateTo && 'lng' in navigateTo) {
        targetCoords = { lat: navigateTo.lat, lng: navigateTo.lng };
      } else if ('name' in navigateTo && (navigateTo as any).name) {
         const areaData = BENGALURU_AREA_DATA[(navigateTo as any).name.toUpperCase()] || Object.values(BENGALURU_AREA_DATA).find(a => a.name.toUpperCase() === (navigateTo as any).name.toUpperCase());
         if (areaData) {
            targetCoords = { lat: areaData.lat, lng: areaData.lng };
         }
      }

      if (targetCoords) {
        mapRef.current.panTo(targetCoords);
        mapRef.current.setZoom(navigateTo.zoom || MAP_ZOOM_NAVIGATED);
        // Optionally trigger data fetch for this navigated location
        const areaName = (navigateTo as any).name || Object.values(BENGALURU_AREA_DATA).find(a => a.lat === targetCoords?.lat && a.lng === targetCoords?.lng)?.name;
        if (areaName) {
            fetchAndShowPopupData(areaName);
        }
      }
      clearNavigateTo(); // Reset the navigation trigger
    }
  }, [navigateTo, clearNavigateTo]);


  useEffect(() => {
    if (!recommendations) {
      setRecommendedDisplayZones([]);
      setUnmappedZones({ residential: [], commercial: [], industrial: [] });
      return;
    }

    const newDisplayableZones: DisplayZone[] = [];
    const newUnmapped: Record<string, string[]> = { residential: [], commercial: [], industrial: [] };

    const processZoneType = (zones: string[] | undefined, type: Extract<DisplayZone['type'], 'residential' | 'commercial' | 'industrial'>) => {
      (zones || []).forEach(zoneName => {
        const upperZoneName = zoneName.toUpperCase();
        const areaData = BENGALURU_AREA_DATA[upperZoneName] || Object.values(BENGALURU_AREA_DATA).find(a => a.name.toUpperCase() === upperZoneName);
        
        if (areaData) {
          newDisplayableZones.push({
            name: areaData.name,
            type,
            lat: areaData.lat,
            lng: areaData.lng,
          });
        } else {
          newUnmapped[type].push(zoneName);
        }
      });
    };
    
    processZoneType(recommendations.residentialZones, 'residential');
    processZoneType(recommendations.commercialZones, 'commercial');
    processZoneType(recommendations.industrialZones, 'industrial');
    
    setRecommendedDisplayZones(newDisplayableZones);
    setUnmappedZones(newUnmapped);

  }, [recommendations]);

  const fetchAndShowPopupData = useCallback(async (locationName: string) => {
    setIsPopupLoading(true);
    setPopupData(null); // Clear previous popup data
    try {
      const result = await searchAndFetchRecommendations(locationName);
      if ('error' in result) {
        toast({ variant: "destructive", title: `Data Error: ${locationName}`, description: result.error, duration: 7000 });
        setPopupData({ searchedLocationName: locationName, message: result.error, residentialZones:[], commercialZones:[], industrialZones:[] });
      } else {
        setPopupData(result);
        if(result.message && (!result.residentialZones?.length && !result.commercialZones?.length && !result.industrialZones?.length)){
          // Only toast if it's an informational message without recommendations (e.g. "data not found")
          if (!result.message.toLowerCase().includes("provided by")) { // Avoid toasting simple attribution messages
             toast({ title: `Info: ${result.searchedLocationName}`, description: result.message, duration: 7000 });
          }
        }
      }
    } catch (e) {
      console.error("Error fetching popup data: ", e);
      toast({ variant: "destructive", title: "Map Click Error", description: "Failed to fetch data for the selected area.", duration: 7000 });
      setPopupData({ searchedLocationName: locationName, message: "Failed to fetch data for this area.", residentialZones:[], commercialZones:[], industrialZones:[] });
    } finally {
      setIsPopupLoading(false);
    }
  }, [toast]);

  const handleMapClick = useCallback((event: google.maps.MapMouseEvent) => {
    if (isPopupLoading || !event.latLng || !mapRef.current) return;

    const clickLat = event.latLng.lat();
    const clickLng = event.latLng.lng();
    
    let nearestAreaName: string | null = null;
    let minDistance = Infinity;

    for (const areaKey in BENGALURU_AREA_DATA) {
      const area = BENGALURU_AREA_DATA[areaKey];
      const distance = getDistanceFromLatLonInKm(clickLat, clickLng, area.lat, area.lng);
      if (distance < minDistance) {
        minDistance = distance;
        nearestAreaName = area.name;
      }
    }

    if (nearestAreaName && minDistance <= CLICK_DISTANCE_THRESHOLD_KM) {
      fetchAndShowPopupData(nearestAreaName);
    } else {
      toast({ title: "Map Area", description: "No known area close to your click. Try clicking nearer to a marked zone or search directly.", variant: "default" });
    }
  }, [isPopupLoading, fetchAndShowPopupData, toast]);


  const filteredRecommendedDisplayZones = recommendedDisplayZones.filter(zone => {
    if (zone.type === 'residential' && filters.residential) return true;
    if (zone.type === 'commercial' && filters.commercial) return true;
    if (zone.type === 'industrial' && filters.industrial) return true;
    return false;
  });

  const hasPrimaryRecommendations = recommendations && (recommendations.residentialZones?.length > 0 || recommendations.commercialZones?.length > 0 || recommendations.industrialZones?.length > 0);
  const hasUnmapped = unmappedZones.residential.length > 0 || unmappedZones.commercial.length > 0 || unmappedZones.industrial.length > 0;
  
  const isManualInputWithMessageOnly = recommendations && recommendations.message && !hasPrimaryRecommendations && !('sourceAirQualityData' in recommendations && recommendations.sourceAirQualityData);
  // Show AI message overlay if map isn't loaded and it's a manual input result with only a message (no data/zones)
  const showAiMessageOverlay = !isPageLoading && isManualInputWithMessageOnly && !isLoaded; 

  const mapContainerStyle = {
    height: '100%',
    width: '100%',
    borderRadius: '0.5rem', // Match card rounding
  };

  if (loadError) {
    return (
        <div className="h-full flex items-center justify-center bg-destructive/10 text-destructive p-4 rounded-lg">
            Error loading maps: {loadError.message}. Please check your API key and internet connection.
        </div>
    );
  }


  const renderMapMarkers = () => {
    let markersToRender: DisplayZone[] = [];

    if (hasPrimaryRecommendations) {
      markersToRender = filteredRecommendedDisplayZones;
    } else if (!isPageLoading && !showAiMessageOverlay && !popupData) {
      markersToRender = defaultAreaMarkers;
    }
    
    return markersToRender.map((zone) => (
      <MarkerF
        key={`${zone.name}-${zone.type}-${zone.lat}-${zone.lng}`} // More unique key
        position={{ lat: zone.lat, lng: zone.lng }}
        title={`${zone.name}${zone.type !== 'known_area' ? ` (${zone.type})` : ''}`}
        onClick={() => fetchAndShowPopupData(zone.name)}
        icon={{
          url: getMarkerIconUrl(zone.type),
          scaledSize: new google.maps.Size(36, 36), 
        }}
      />
    ));
  };


  return (
    <div className="h-full flex flex-col space-y-4">
      <Card className="flex-grow relative shadow-lg overflow-hidden rounded-lg border-border">
        {!isLoaded && !isPageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-20 rounded-lg">
                <Loader2 className="h-12 w-12 text-primary animate-spin mr-2" /> Loading Map...
            </div>
        )}
        {isLoaded && (
          <GoogleMap
            mapContainerStyle={mapContainerStyle}
            center={MAP_CENTER_BENGALURU}
            zoom={MAP_ZOOM_DEFAULT}
            onClick={handleMapClick}
            onLoad={onMapLoad}
            onUnmount={onMapUnmount}
            options={{ 
              streetViewControl: false, 
              mapTypeControl: false,
              fullscreenControl: false,
              zoomControlOptions: { position: google.maps.ControlPosition.RIGHT_TOP },
              styles: [ // Subtle map styling to match theme
                { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] }, // Light gray for land
                { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
                { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] }, // Dark gray for labels
                { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] }, // Light stroke for labels
                { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
                { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{color: "hsl(var(--primary))"}]}, // Primary color for city names
                { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
                { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] }, // Lighter green for parks
                { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
                { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] }, // White roads
                { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
                { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] }, // Light gray for highways
                { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
                { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
                { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
                { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
                { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] }, // Muted blue for water
                { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] }
              ]
            }}
          >
            {renderMapMarkers()}
          </GoogleMap>
        )}

        {isPageLoading && ( 
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10 rounded-lg">
                <div className="text-center p-8 bg-card rounded-lg shadow-xl">
                    <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
                    <h3 className="text-xl font-semibold mb-2 text-primary">Analyzing Data...</h3>
                    <p className="text-muted-foreground">The AI is processing your request.</p>
                </div>
            </div>
        )}
        
        {showAiMessageOverlay && !popupData && ( 
            <div className="absolute inset-0 flex items-center justify-center bg-background/70 z-10 rounded-lg">
                <div className="text-center p-8 bg-card rounded-lg shadow-xl max-w-md">
                    <Info className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Information</h3>
                    <p className="text-muted-foreground">
                        {recommendations?.message}
                    </p>
                </div>
            </div>
        )}

        <AlertDialog open={!!popupData || isPopupLoading} onOpenChange={(isOpen) => { if(!isOpen && !isPopupLoading) setPopupData(null); }}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center">
                {isPopupLoading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <MapPin className="h-5 w-5 mr-2 text-primary" /> }
                {isPopupLoading ? 'Fetching Data...' : `Details for ${popupData?.searchedLocationName || 'Selected Area'}`}
              </AlertDialogTitle>
              {!isPopupLoading && popupData && (
                 <AlertDialogDescription asChild>
                  <div className="text-left max-h-[60vh] overflow-y-auto pr-2 space-y-3 pt-2">
                    {popupData.message && (popupData.message.toLowerCase().includes("error") || popupData.message.toLowerCase().includes("not found") || popupData.message.toLowerCase().includes("unavailable")) && (
                      <div className="mb-2 p-3 bg-destructive/10 border-l-4 border-destructive text-destructive rounded-md text-sm">{popupData.message}</div>
                    )}
                    {popupData.sourceAirQualityData && (
                      <div className="space-y-1">
                        <h4 className="font-semibold text-foreground">Air Quality Data:</h4>
                        <p className="text-sm text-muted-foreground bg-secondary p-2 rounded-md break-words">{popupData.sourceAirQualityData}</p>
                      </div>
                    )}
                    
                    {(popupData.residentialZones?.length > 0 || popupData.commercialZones?.length > 0 || popupData.industrialZones?.length > 0) ? (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-foreground pt-1">AI Recommended Zones:</h4>
                        {popupData.residentialZones?.length > 0 && (
                          <div>
                            <h5 className="font-medium text-primary flex items-center"><ZoneIcon type="residential" size={16} color="hsl(var(--primary))"/>Residential:</h5>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {popupData.residentialZones.map(z => <Badge key={`popup-res-${z}`} variant="outline" className="border-primary text-primary bg-primary/10">{z}</Badge>)}
                            </div>
                          </div>
                        )}
                        {popupData.commercialZones?.length > 0 && (
                          <div>
                            <h5 className="font-medium text-accent flex items-center"><ZoneIcon type="commercial" size={16} color="hsl(var(--accent))"/>Commercial:</h5>
                             <div className="flex flex-wrap gap-1.5 mt-1">
                              {popupData.commercialZones.map(z => <Badge key={`popup-com-${z}`} variant="outline" className="border-accent text-accent bg-accent/10">{z}</Badge>)}
                            </div>
                          </div>
                        )}
                        {popupData.industrialZones?.length > 0 && (
                          <div>
                            <h5 className="font-medium text-orange-600 flex items-center"><ZoneIcon type="industrial" size={16} color="#f97316"/>Industrial:</h5>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {popupData.industrialZones.map(z => <Badge key={`popup-ind-${z}`} variant="outline" className="border-orange-500 text-orange-700 bg-orange-50">{z}</Badge>)}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                       !popupData.message?.toLowerCase().includes("error") && 
                       !popupData.message?.toLowerCase().includes("not found") &&
                       !popupData.message?.toLowerCase().includes("unavailable") &&
                       popupData.sourceAirQualityData &&
                       <p className="text-sm text-muted-foreground pt-2">No specific zone types recommended by the AI for this area based on the current data.</p>
                    )}
                    {popupData.message && !popupData.message.toLowerCase().includes("error") && !popupData.message.toLowerCase().includes("not found") && !popupData.message.toLowerCase().includes("unavailable") && !popupData.sourceAirQualityData && (
                         <p className="text-sm text-muted-foreground pt-2">{popupData.message}</p>
                    )}
                     {popupData.message && !popupData.message.toLowerCase().includes("error") &&
                        !popupData.message.toLowerCase().includes("not found") &&
                        !popupData.message.toLowerCase().includes("unavailable") &&
                        popupData.message.toLowerCase().includes("provided by") && (
                        <p className="text-xs text-muted-foreground pt-3 italic">{popupData.message}</p>
                    )}
                  </div>
                </AlertDialogDescription>
              )}
               {isPopupLoading && (
                <div className="flex justify-center items-center py-10">
                  <Loader2 className="h-10 w-10 text-primary animate-spin" />
                </div>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4">
              <AlertDialogAction onClick={() => setPopupData(null)} disabled={isPopupLoading}>OK</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </Card>

      {hasPrimaryRecommendations && hasUnmapped && !popupData && ( 
        <Card className="shrink-0 max-h-48 overflow-y-auto border-border rounded-lg">
          <CardHeader className="py-3 px-4 sticky top-0 bg-card/95 backdrop-blur-sm z-10">
            <CardTitle className="text-md flex items-center">
              <Info className="h-4 w-4 mr-2 text-amber-600" />
              Unmapped AI Zones (Main Search)
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3 text-sm space-y-1.5">
            { (unmappedZones.residential.length > 0 && filters.residential) && (
              <div><strong className="text-primary">Residential:</strong> {unmappedZones.residential.map(z => <Badge key={`unmapped-res-${z}`} variant="outline" className="mr-1 mb-1 border-primary text-primary bg-primary/10">{z}</Badge>)}</div>
            )}
            { (unmappedZones.commercial.length > 0 && filters.commercial) && (
              <div><strong className="text-accent">Commercial:</strong> {unmappedZones.commercial.map(z => <Badge key={`unmapped-com-${z}`} variant="outline" className="mr-1 mb-1 border-accent text-accent bg-accent/10">{z}</Badge>)}</div>
            )}
            { (unmappedZones.industrial.length > 0 && filters.industrial) && (
              <div><strong className="text-orange-600">Industrial:</strong> {unmappedZones.industrial.map(z => <Badge key={`unmapped-ind-${z}`} variant="outline" className="mr-1 mb-1 border-orange-500 text-orange-700 bg-orange-50">{z}</Badge>)}</div>
            )}
             <p className="text-xs text-muted-foreground pt-1">These zones were recommended by the AI based on your main search/input but are not currently mapped to known visual areas.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

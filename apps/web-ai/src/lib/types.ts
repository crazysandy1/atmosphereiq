
export interface Filters {
  residential: boolean;
  commercial: boolean;
  industrial: boolean;
}

// Output from the AI flow `recommendZone` (manual input)
export type RecommendZoneOutput = {
  residentialZones: string[];
  commercialZones: string[];
  industrialZones: string[];
  message?: string; // Optional message from AI
};

// Output from the server action `searchAndFetchRecommendations`
// This is the primary type for displaying search-based results.
export type SearchLocationRecommendOutput = {
  residentialZones: string[];
  commercialZones: string[];
  industrialZones: string[];
  message?: string; // Can be from AI or from server action (e.g., "data not found", attribution)
  sourceAirQualityData?: string; // The raw or formatted air quality data string
  searchedLocationName?: string; // The location name that was originally searched by the user
};


export type RecommendedZonesState = SearchLocationRecommendOutput | RecommendZoneOutput | null;

// Coordinates for map display
export interface Coordinates {
  lat: number;
  lng: number;
}

// Represents a known Bengaluru area with its coordinates and display name
export interface BengaluruArea extends Coordinates {
  name: string;
  key: string; // A unique key, typically uppercase version of name
}


// Simplified for map markers, coordinates will come from BENGALURU_AREA_DATA
export interface DisplayZone {
  name: string; // Name of the area
  type: 'residential' | 'commercial' | 'industrial' | 'known_area';
  lat: number;
  lng: number;
}

// Type for the popup data on map click, aligns with SearchLocationRecommendOutput
export interface MapPopupData extends SearchLocationRecommendOutput {
  // No additional fields currently needed beyond SearchLocationRecommendOutput for the popup
}

// ---- Personalized Recommendation Feature Types ----
export interface PersonalizedRecInput {
  purpose: 'residential' | 'commercial' | 'industrial';
  lengthOfStay: string; // e.g., "<1 Year", "1-3 Years", "5+ Years"
  healthConcerns: string[]; // e.g., ["Respiratory Issues", "Allergies"] or ["None"]
}

export interface PersonalizedAreaRec {
  name: string;
  reasoning: string;
}

export interface PersonalizedRecOutput {
  prioritizedAreas: PersonalizedAreaRec[];
  additionalAdvice?: string;
  error?: string; // To handle cases where AI cannot provide advice
}

export type PersonalizedRecState = PersonalizedRecOutput | null;

export interface MapNavigationTarget extends Coordinates {
  zoom?: number; // Optional desired zoom level
}


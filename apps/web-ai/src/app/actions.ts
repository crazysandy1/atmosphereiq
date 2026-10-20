
// src/app/actions.ts
"use server";

import { recommendZone, RecommendZoneInput, RecommendZoneOutput } from '@/ai/flows/recommend-zone';
import { analyzeLocationDataAndRecommend, AnalyzeLocationDataInput, SearchLocationRecommendOutput as AiSearchOutput } from '@/ai/flows/search-location-recommend-flow';
import { getPersonalizedRecommendations as getPersonalizedRecommendationsFlow, PersonalizedRecInput, PersonalizedRecOutput as AIPersonalizedRecOutput } from '@/ai/flows/personalized-recommendation-flow';
import type { SearchLocationRecommendOutput, PersonalizedRecOutput } from '@/lib/types';

const WAQI_API_KEY = process.env.WAQI_API_KEY;

// Helper function to fetch and process WAQI feed data
async function fetchAndProcessWaqiFeed(
  feedUrl: string,
  stationDisplayName: string, // Name to use for this station in messages/AI
  originalSearchLocation: string // The user's original search term
): Promise<SearchLocationRecommendOutput | { error: string } | null> { // null means data not found, proceed to next step
  let feedResponse;
  try {
    feedResponse = await fetch(feedUrl, { next: { revalidate: 600 } }); // Cache for 10 minutes
  } catch (networkError) {
    console.error(`Network error during WAQI feed fetch for '${stationDisplayName}':`, networkError);
    return { error: `Network error while trying to fetch data for '${stationDisplayName}'. Please check your connection.` };
  }

  if (!feedResponse.ok) {
    console.error(`WAQI feed API error for '${stationDisplayName}': ${feedResponse.status} ${feedResponse.statusText}`);
    // If a specific station feed fails, it might be a reason to return null and try city-level fallback
    return null; 
  }

  const feedData = await feedResponse.json();

  if (feedData.status !== "ok" || !feedData.data || typeof feedData.data.aqi === 'undefined' || feedData.data.aqi === null || feedData.data.aqi === "-") {
    // If data is explicitly unavailable for this station/city, return null to allow fallback or final message
    return null;
  }

  // Format the air quality data into a string for the AI
  let airQualityString = `AQI: ${feedData.data.aqi}`;
  if (feedData.data.iaqi) {
    const pollutantsToShow = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co'];
    for (const pollutant of pollutantsToShow) {
      if (feedData.data.iaqi[pollutant] && typeof feedData.data.iaqi[pollutant].v !== 'undefined') {
        airQualityString += `, ${pollutant.toUpperCase()}: ${feedData.data.iaqi[pollutant].v}`;
      }
    }
  }
  
  const primaryDataSourceInfo = feedData.data.city?.name ? feedData.data.city.name : stationDisplayName;
  airQualityString += `. Station: ${primaryDataSourceInfo}`;

  const aiInput: AnalyzeLocationDataInput = { locationName: stationDisplayName, airQualityData: airQualityString };
  const aiResult: AiSearchOutput = await analyzeLocationDataAndRecommend(aiInput);

  let finalMessage = aiResult.message;
  const attributions = feedData.data.attributions;
  let attributionText = "";
  if (attributions && attributions.length > 0) {
      attributionText = `Data provided by: ${attributions.map((attr: { name: string }) => attr.name.replace('http://', '').replace('https://', '')).join(', ')}.`;
  }

  if (!finalMessage) {
    // If AI provides no message, construct one based on data source
    if (stationDisplayName.toLowerCase().includes(originalSearchLocation.toLowerCase()) || originalSearchLocation.toLowerCase().includes(stationDisplayName.toLowerCase())) {
      finalMessage = `Air quality data for ${stationDisplayName}. ${attributionText}`;
    } else {
      // This case handles when city-level data is used as fallback
      finalMessage = `No specific station found for '${originalSearchLocation}'. Displaying general data for ${stationDisplayName}. ${attributionText}`;
    }
  } else {
     // Append attribution if AI provided a message
    finalMessage = `${finalMessage} ${attributionText}`;
  }
  
  return {
    ...aiResult,
    sourceAirQualityData: airQualityString,
    searchedLocationName: originalSearchLocation,
    message: finalMessage.trim(),
  };
}


export async function getZoneRecommendations(
  airQualityData: string
): Promise<RecommendZoneOutput | { error: string }> {
  try {
    if (!airQualityData || airQualityData.trim() === "") {
      return { error: "Air quality data cannot be empty." };
    }

    const input: RecommendZoneInput = { airQualityData };
    const result = await recommendZone(input);
    return result;
  } catch (error) {
    console.error("Error getting zone recommendations from manual input:", error);
    return { error: "Failed to get recommendations from AI via manual input. Please try again." };
  }
}

export async function searchAndFetchRecommendations(
  locationName: string
): Promise<SearchLocationRecommendOutput | { error: string }> {
  if (!WAQI_API_KEY) {
    console.error("WAQI_API_KEY is not defined in .env file.");
    return { error: "Air quality API service is not configured. Please contact the administrator." };
  }

  if (!locationName || locationName.trim() === "") {
    return { error: "Location name cannot be empty." };
  }

  try {
    // Step 1: Search for the station UID using the locationName
    const searchUrl = `https://api.waqi.info/search/?token=${WAQI_API_KEY}&keyword=${encodeURIComponent(locationName)}`;
    let searchResponse;
    try {
      searchResponse = await fetch(searchUrl, { next: { revalidate: 3600 } }); // Cache for 1 hour
    } catch (networkError) {
      console.error("Network error during WAQI search:", networkError);
      return { error: `Network error while trying to search for location '${locationName}'. Please check your connection.` };
    }
    
    let stationUid: string | null = null;
    let stationNameFromSearch: string | null = null;

    if (searchResponse.ok) {
      const searchData = await searchResponse.json();
      if (searchData.status === "ok" && searchData.data && searchData.data.length > 0) {
        const station = searchData.data[0]; // Pick the first station
        stationUid = station.uid.toString(); // Ensure UID is string for URL
        stationNameFromSearch = station.station.name;
      }
    } else {
      console.error(`WAQI search API error for '${locationName}': ${searchResponse.status} ${searchResponse.statusText}`);
      // Don't return error yet, try fallback
    }

    let result: SearchLocationRecommendOutput | { error: string } | null = null;

    // Step 2: Fetch air quality data for the specific station, if found
    if (stationUid && stationNameFromSearch) {
      const feedUrl = `https://api.waqi.info/feed/@${stationUid}/?token=${WAQI_API_KEY}`;
      result = await fetchAndProcessWaqiFeed(feedUrl, stationNameFromSearch, locationName);
      if (result && !('error' in result)) return result; // Success with specific station
      // If error or null (data not found), proceed to fallback
    }

    // Step 3: Fallback to Bengaluru city-level data if specific station search failed or yielded no data
    // 'result' here would be null if specific station data wasn't usable, or an error object if network failed on specific feed
    if (result === null || (result && 'error' in result && !stationUid) ) { // Only fallback if specific search failed or no station was found from search
      console.log(`Specific station data not found or failed for '${locationName}'. Attempting fallback to Bengaluru city data.`);
      const cityFeedUrl = `https://api.waqi.info/feed/bengaluru/?token=${WAQI_API_KEY}`;
      // For city fallback, stationDisplayName is "Bengaluru" or the city name from API, originalSearchLocation is user's input
      const cityResult = await fetchAndProcessWaqiFeed(cityFeedUrl, "Bengaluru", locationName); 
      if (cityResult && !('error' in cityResult)) {
        // Ensure the message clearly indicates fallback
        let message = cityResult.message || "";
        if (!message.toLowerCase().includes(`displaying general data for`)) {
            message = `No specific station found for '${locationName}'. Displaying general data for Bengaluru. ${message}`;
        }
        return { ...cityResult, message: message.trim(), searchedLocationName: locationName };
      }
      if (cityResult && 'error' in cityResult) return cityResult; // Return error from city fetch
    } else if (result && 'error' in result) {
        return result; // Return error from specific station feed if it occurred after a station was found
    }


    // Step 4: If all attempts fail, return a generic "not found" message
    return {
      residentialZones: [],
      commercialZones: [],
      industrialZones: [],
      message: `Air quality data could not be found for '${locationName}' or for Bengaluru city in general at this time. Please try a different location or check back later.`,
      sourceAirQualityData: undefined,
      searchedLocationName: locationName,
    };

  } catch (error) {
    console.error("Error in searchAndFetchRecommendations with WAQI:", error);
    let errorMessage = "An unexpected error occurred while fetching and analyzing air quality data. Please try again.";
    return { error: errorMessage };
  }
}


export async function getPersonalizedRecommendations(
  input: PersonalizedRecInput
): Promise<PersonalizedRecOutput> {
  try {
    if (!input.purpose || !input.lengthOfStay || !input.healthConcerns) {
        return { error: "All personalized recommendation inputs are required.", prioritizedAreas: [] };
    }
    const result = await getPersonalizedRecommendationsFlow(input);
    return result;
  } catch (error) {
    console.error("Error getting personalized recommendations from AI:", error);
    return { 
        error: "Failed to get personalized recommendations from AI. Please try again.",
        prioritizedAreas: [] 
    };
  }
}


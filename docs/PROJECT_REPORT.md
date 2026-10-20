# **AtmosphereIQ: Bengaluru Breathe Easy**
## AI-Powered Air Quality Zone Recommendation

**Prepared by:** AI App Prototyper (Firebase Studio)
**Date:** October 26, 2023

---

## **Table of Contents**

1.  Introduction
2.  Project Objectives
3.  Core Features
    *   3.1. Real-time Air Quality Data Acquisition (WAQI API)
    *   3.2. AI-Driven Zone Recommendation
    *   3.3. Interactive Map Display (Google Maps API)
    *   3.4. Location Search & Click-to-Analyze
    *   3.5. Zone Filtering
    *   3.6. Personalized Recommendations
4.  Technical Architecture
5.  Technology Stack
6.  AI Integration Details (Genkit Flows)
    *   6.1. `analyzeLocationDataAndRecommend` Flow
    *   6.2. `recommendZone` Flow
    *   6.3. `getPersonalizedRecommendations` Flow
7.  Key Application Components & File Structure
    *   7.1. Frontend Components
    *   7.2. Server-Side Logic
8.  Setup & Running the Application
    *   8.1. Prerequisites
    *   8.2. Installation
    *   8.3. Configuration
    *   8.4. Running the Application
9.  API Key Considerations & Usage Limits
10. Conclusion
11. Future Enhancements

---

## 1. Introduction

Bengaluru, a rapidly growing metropolis, faces significant challenges with air quality, impacting the health and well-being of its residents and the operational considerations for businesses. Identifying areas with favorable air quality for specific purposes—be it residential living, commercial operations, or industrial activities—can be a complex task.

**AtmosphereIQ** is a web application designed to address this challenge. It leverages real-time air quality data and generative AI to provide users with actionable insights and recommendations for suitable zones within Bengaluru. The application aims to simplify the decision-making process by presenting complex data in an accessible and interactive format.

## 2. Project Objectives

*   **Empower Users:** Provide individuals and businesses with data-driven recommendations for locations in Bengaluru based on air quality.
*   **Leverage Real-time Data:** Integrate with external APIs (WAQI) to fetch live air quality metrics.
*   **Utilize AI for Analysis:** Employ generative AI (via Genkit and Google's Gemini models) to analyze air quality data and user preferences, offering nuanced recommendations.
*   **Interactive Visualization:** Present information on an interactive map (Google Maps) for easy understanding and exploration.
*   **Personalized Guidance:** Offer tailored advice based on user-specific needs, such as purpose of stay, duration, and health concerns.
*   **User-Friendly Interface:** Develop an intuitive and responsive UI using modern web technologies.

**Target Audience:**
*   Individuals seeking residential areas with better air quality.
*   Businesses looking for optimal commercial or industrial zones considering environmental factors.
*   Urban planners and researchers interested in air quality patterns.

---

## 3. Core Features

### 3.1. Real-time Air Quality Data Acquisition (WAQI API)
AtmosphereIQ integrates with the World Air Quality Index (WAQI) API to fetch up-to-date air quality data. When a user searches for a location or clicks on the map, the application queries the WAQI API.
*   It first attempts to find a specific monitoring station near the requested location.
*   If a local station isn't found or lacks data, it falls back to fetching general air quality data for Bengaluru city.
*   Key parameters like AQI (Air Quality Index), PM2.5, PM10, O3, NO2, SO2, and CO are retrieved.

### 3.2. AI-Driven Zone Recommendation
The application uses Genkit, powered by Google's Gemini models, to analyze air quality data and provide zone recommendations.

*   **Location-Based Analysis:** After fetching data from WAQI for a searched or clicked location, the AI analyzes this data to suggest if the area is generally suitable for residential, commercial, or industrial purposes based on its air quality profile.
*   **Manual Data Analysis:** Users can directly input a block of air quality data (e.g., text, CSV snippet). The AI then processes this custom input to recommend zones.
*   **Personalized Recommendations:** A dedicated feature allows users to input their specific requirements (purpose of looking for an area, duration of stay, health concerns). The AI processes these preferences to suggest 2-3 suitable areas with justifications.

### 3.3. Interactive Map Display (Google Maps API)
A central feature of AtmosphereIQ is its interactive map, implemented using the Google Maps JavaScript API.
*   **Default View:** On load, the map displays markers for several known areas within Bengaluru, providing immediate geographical context.
*   **Recommendation Markers:** When AI recommendations are generated (either from search, manual input, or personalized advice), distinct, color-coded markers (e.g., blue for residential, green for commercial, orange for industrial) are placed on the map for recognizable locations.
*   **Click-to-Analyze:** Users can click directly on the map. The application identifies the nearest known area to the click, fetches its current air quality via WAQI, and displays the data and AI analysis in a popup.
*   **Navigation:** When a user selects a location from personalized advice, the map automatically navigates (pans and zooms) to that area.

### 3.4. Location Search
Users can type a location name into a search bar. This triggers a lookup via the WAQI API, followed by AI analysis of the retrieved data, with results (data and recommended zones) displayed in a map popup and markers placed if applicable.

### 3.5. Zone Filtering
Users can toggle filters (Residential, Commercial, Industrial) in the sidebar to control which types of AI-recommended zones are visible as markers on the map.

### 3.6. Personalized Recommendations
A guided form prompts users for their specific needs (purpose, stay duration, health concerns). The AI then generates tailored advice, including suggested areas and general considerations, displayed in a dialog.

---

## 4. Technical Architecture

AtmosphereIQ is a full-stack web application built using Next.js, employing its App Router for server components and server actions.

**(Conceptual Diagram)**

\`\`\`
+-----------------+     +----------------------+     +---------------------+     +-----------------+
|   User Browser  | --> | Next.js Frontend/UI  | --> | Next.js Backend     | --> | Genkit AI Flows |
| (React, Maps)   |     | (ShadCN, Tailwind)   |     | (Server Actions)    |     | (Gemini Model)  |
+-----------------+     +----------------------+     +----------+----------+     +--------+--------+
                                                                 |                     ^
                                                                 |                     |
                                                                 v                     |
                                                         +-------+--------+   +--------+--------+
                                                         | WAQI API       |   | Google Maps API |
                                                         | (Air Quality)  |   | (Mapping)       |
                                                         +----------------+   +-----------------+
\`\`\`

*   **Client-Side (Browser):**
    *   Renders the user interface built with React and ShadCN UI components.
    *   Handles user interactions (form submissions, map clicks).
    *   Displays the Google Map and its markers.
*   **Server-Side (Next.js):**
    *   **Server Actions (`src/app/actions.ts`):** Intermediate layer that handles client requests. It fetches data from external APIs (WAQI) and then invokes Genkit AI flows for analysis. This keeps API keys and complex logic off the client.
    *   **Genkit Flows (`src/ai/flows/*.ts`):** Encapsulate the logic for interacting with the AI model (Gemini). They define prompts, input/output schemas (using Zod), and process the AI's responses.

## 5. Technology Stack

*   **Framework:** Next.js 15+ (App Router)
*   **Language:** TypeScript
*   **Frontend Library:** React 18+
*   **UI Components:** ShadCN UI
*   **Styling:** Tailwind CSS, CSS Variables (via `globals.css` for theming)
*   **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`, `useRef`)
*   **Forms:** React Hook Form with Zod for validation (`@hookform/resolvers`)
*   **AI Integration:** Genkit, utilizing Google's Gemini family of models (e.g., `gemini-2.0-flash`)
*   **Mapping Service:** Google Maps JavaScript API (via `@react-google-maps/api`)
*   **Air Quality Data API:** WAQI API
*   **Runtime Environment:** Node.js
*   **Package Manager:** npm

---

## 6. AI Integration Details (Genkit Flows)

Genkit is used to structure and manage interactions with the AI model. Each core AI functionality is encapsulated in a "flow."

### 6.1. `analyzeLocationDataAndRecommend` Flow
*   **File:** `src/ai/flows/search-location-recommend-flow.ts`
*   **Purpose:** To analyze provided air quality data for a specific named location and recommend its suitability for different zone types.
*   **Input (`AnalyzeLocationDataInput`):**
    *   `locationName`: `string` (Name of the location, e.g., a WAQI station name)
    *   `airQualityData`: `string` (Formatted string containing AQI, PM2.5, PM10, etc.)
*   **Output (`SearchLocationRecommendOutput` - AI part):**
    *   `residentialZones`: `string[]`
    *   `commercialZones`: `string[]`
    *   `industrialZones`: `string[]`
    *   `message`: `string` (Optional AI commentary on the analysis)
*   **Process:** The flow takes the pre-fetched air quality data and prompts the AI to categorize the location based on this data. The server action calling this flow is responsible for fetching the data initially and combining the AI's output with source data details.

### 6.2. `recommendZone` Flow
*   **File:** `src/ai/flows/recommend-zone.ts`
*   **Purpose:** To analyze a block of manually inputted air quality data and recommend zones.
*   **Input (`RecommendZoneInput`):**
    *   `airQualityData`: `string` (User-provided text describing air quality)
*   **Output (`RecommendZoneOutput`):**
    *   `residentialZones`: `string[]`
    *   `commercialZones`: `string[]`
    *   `industrialZones`: `string[]`
    *   `message`: `string` (Optional AI commentary)
*   **Process:** Similar to the above, but designed for less structured, user-provided data.

### 6.3. `getPersonalizedRecommendations` Flow
*   **File:** `src/ai/flows/personalized-recommendation-flow.ts`
*   **Purpose:** To provide tailored area recommendations and advice based on user's specific preferences.
*   **Input (`PersonalizedRecInput`):**
    *   `purpose`: `'residential' | 'commercial' | 'industrial'`
    *   `lengthOfStay`: `string` (e.g., "<1 Year", "5+ Years")
    *   `healthConcerns`: `string[]` (e.g., ["Respiratory Issues", "None"])
*   **Output (`PersonalizedRecOutput`):**
    *   `prioritizedAreas`: `Array<{ name: string; reasoning: string; }>` (List of 2-3 areas with justification)
    *   `additionalAdvice`: `string` (General advice based on inputs)
*   **Process:** The AI acts as an advisor, using general knowledge of Bengaluru's zones and typical environmental factors, combined with the user's profile, to suggest suitable areas. It's prompted to encourage users to verify live AQI using the app's search feature.

### 6.4. Prompt Engineering
All Genkit flows utilize carefully crafted prompts. These prompts instruct the AI on its role, the context of the task, the desired output format (enforced by Zod schemas), and how to handle various scenarios (e.g., insufficient data). Zod schemas for output ensure the AI returns data in a structured JSON format.

---

## 7. Key Application Components & File Structure

### 7.1. Frontend Components (`src/components/app/`)
*   **`HomePage` (`src/app/page.tsx`):** The main entry point for the application. Manages overall layout, core state (search term, filters, recommendations, personalized advice, loading states), and orchestrates interactions between child components. Hosts the dialogs for personalized recommendations.
*   **`MapView` (`src/components/app/map-view.tsx`):** Responsible for rendering the Google Map, displaying default area markers, AI-recommended zone markers, and handling map click interactions to show data popups. Manages map navigation.
*   **`LocationSearch` (`src/components/app/location-search.tsx`):** Provides the input field and button for users to search for specific locations. Triggers the WAQI data fetch and AI analysis process.
*   **`ZoneFilters` (`src/components/app/zone-filters.tsx`):** Contains checkboxes to filter the types of recommended zones displayed on the map.
*   **`ZoneRecommendationForm` (`src/components/app/zone-recommendation-form.tsx`):** Allows users to manually input air quality data for AI analysis.
*   **`PersonalizedRecommendationForm` (`src/components/app/personalized-recommendation-form.tsx`):** The form for users to input their preferences for tailored advice. Displayed in an initial popup dialog.
*   **`AppHeader` (`src/components/app/app-header.tsx`):** Displays the application title ("AtmosphereIQ") and tagline.
*   **UI Primitives (`src/components/ui/`):** Collection of reusable ShadCN UI components (Button, Card, Dialog, Input, etc.).

### 7.2. Server-Side Logic
*   **Server Actions (`src/app/actions.ts`):**
    *   `searchAndFetchRecommendations`: Handles location searches, calls WAQI API (with city fallback), formats data, and invokes the `analyzeLocationDataAndRecommend` AI flow.
    *   `getZoneRecommendations`: Processes manually submitted air quality data by calling the `recommendZone` AI flow.
    *   `getPersonalizedRecommendations`: Takes user preferences and calls the `getPersonalizedRecommendations` AI flow.
*   **Genkit Flows (`src/ai/flows/*.ts`):** As detailed in Section 6.
*   **Genkit Configuration (`src/ai/genkit.ts`):** Initializes Genkit with the Google AI plugin and specifies the default model.
*   **Environment Variables (`.env`):** Stores API keys for WAQI and Google Maps.

---

## 8. Setup & Running the Application

### 8.1. Prerequisites
*   Node.js (v18 or later recommended)
*   npm (comes with Node.js) or Yarn

### 8.2. Installation
1.  Obtain the project source code (e.g., clone from a Git repository or download a ZIP).
2.  Open a terminal or command prompt.
3.  Navigate to the root directory of the project (the folder containing `package.json`).
4.  Install dependencies:
    \`\`\`bash
    npm install
    \`\`\`
    (or `yarn install` if using Yarn)

### 8.3. Configuration
1.  Create a file named `.env` in the root of the project.
2.  Add the following API keys to the `.env` file, replacing the placeholder values with your actual keys:
    \`\`\`env
    WAQI_API_KEY=YOUR_WAQI_API_KEY
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=YOUR_GOOGLE_MAPS_API_KEY
    # Potentially GOOGLE_API_KEY for Genkit/Gemini if different from a default service account
    \`\`\`
    *   The `WAQI_API_KEY` is used for fetching air quality data.
    *   The `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is used by the client-side Google Maps JavaScript API.

### 8.4. Running the Application
1.  From the project's root directory in your terminal, run the development server:
    \`\`\`bash
    npm run dev
    \`\`\`
2.  The application will typically start on `http://localhost:9002` (as configured in `package.json`).
3.  Open this URL in your web browser to use AtmosphereIQ.
    *An active internet connection is required for API-dependent features (WAQI, Google Maps, AI analysis).*

---

## 9. API Key Considerations & Usage Limits

AtmosphereIQ relies on third-party APIs, each with its own usage policies and potential costs:

*   **WAQI API:** Generally offers a free tier suitable for development and moderate usage. High traffic might exceed these limits. Refer to WAQI API documentation for specifics.
*   **Google Maps JavaScript API:** Operates on a pay-as-you-go model but provides a significant recurring free monthly credit (e.g., $200). This credit often covers usage for many applications. It's crucial to:
    *   Have billing enabled on the associated Google Cloud Project.
    *   Monitor usage in the Google Cloud Console.
    *   Set up billing alerts to prevent unexpected charges.
*   **Google AI (Gemini via Genkit):** Gemini models typically have free usage tiers. Exceeding these quotas for very high request volumes could lead to costs. Check Google AI pricing.

**Disclaimer:** Users are responsible for managing their API keys, understanding the terms of service, and monitoring usage to stay within desired cost limits.

---

## 10. Conclusion

AtmosphereIQ successfully demonstrates the integration of real-time data, AI-driven analysis, and interactive mapping to address the challenge of finding suitable locations in Bengaluru based on air quality. By offering multiple ways to get recommendations—direct search, manual data input, and personalized preference-based advice—the application caters to a diverse set of user needs. The use of Next.js, Genkit, and ShadCN UI results in a modern, responsive, and feature-rich application. It serves as a valuable tool for individuals and businesses prioritizing air quality in their location decisions.

---

## 11. Future Enhancements

*   **User Accounts:** Allow users to create accounts to save personalized preferences, favorite locations, and search history.
*   **Historical Data & Trends:** Integrate historical air quality data to show trends over time for specific areas.
*   **Advanced Map Overlays:** Implement heatmaps for air quality or display actual administrative zone boundaries on the map.
*   **Notifications:** Allow users to subscribe to air quality alerts for specific areas of interest.
*   **Expanded AI Capabilities:**
    *   AI-driven prediction of AQI for areas without direct sensors based on proximity and other factors.
    *   More granular advice, factoring in specific pollutants for health concerns.
*   **PWA Features:** Enhance offline capabilities by caching static assets and basic UI elements for limited access without an internet connection.
*   **Multi-language Support:** Localize the application for a broader audience.
*   **Detailed Data Sources:** Provide more detailed information about the specific WAQI monitoring stations used for data.

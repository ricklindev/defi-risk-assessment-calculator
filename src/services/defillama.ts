// TODO: Implement functions to fetch data from DefiLlama API

export {}; // Placeholder to make it a module

const DEFILLAMA_API_BASE = "https://api.llama.fi";
const DEFILLAMA_SEARCH_API = "https://search.defillama.com/multi-search";

// Read token from environment variable (Vite specific)
const SEARCH_BEARER_TOKEN = import.meta.env.VITE_DEFILLAMA_SEARCH_TOKEN;

if (!SEARCH_BEARER_TOKEN) {
  console.warn(
    "DefiLlama search token (VITE_DEFILLAMA_SEARCH_TOKEN) is not defined in .env file."
  );
  // Optionally, throw an error or provide a default behavior
}

// --- Type Definitions ---

/**
 * Represents a single protocol from the search API response.
 * Maps search result fields to our internal representation.
 */
export interface ProtocolListItem {
  name: string;
  slug: string; // Extracted from hit.id (e.g., "protocol_aave-v3" -> "aave-v3")
  tvl: number;
  logo?: string;
}

// Type for individual hits in the search response
interface SearchHit {
  id: string; // e.g., "protocol_aave-v3" or "parent_aave"
  name: string;
  tvl: number;
  logo?: string;
  // ... other fields from API if needed
}

// Type for the search API response structure
interface SearchApiResponse {
  results: {
    indexUid: string;
    hits: SearchHit[];
    // ... other result fields
  }[];
}

/**
 * Represents a single data point from the /protocol/{slug} endpoint TVL array.
 */
export interface HistoricalTvlPoint {
  date: string; // Unix timestamp string
  totalLiquidityUSD: number;
}

// Define the structure for the /protocol/{slug} API response
interface ProtocolApiResponse {
  tvl?: HistoricalTvlPoint[];
  // Add other properties from the response if needed
}

// --- API Fetching Functions ---

/**
 * Searches for protocols using the DefiLlama multi-search API.
 * @param query The search string.
 */
export async function searchProtocols(
  query: string
): Promise<ProtocolListItem[]> {
  // Ensure the token is available before making the request
  if (!SEARCH_BEARER_TOKEN) {
    console.error("Search API token is missing. Cannot perform search.");
    return []; // Return empty array or throw error
  }

  if (!query) {
    return []; // Return empty if query is empty
  }

  const payload = {
    queries: [
      {
        indexUid: "protocols",
        q: query,
        limit: 20, // Limit the number of results
      },
    ],
  };

  try {
    const response = await fetch(DEFILLAMA_SEARCH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${SEARCH_BEARER_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(
        `Search API Error: ${response.status} ${response.statusText}`
      );
    }

    const data: SearchApiResponse = await response.json();
    console.log("Search API response:", data); // Log for debugging

    const protocolResults = data.results.find(
      (r) => r.indexUid === "protocols"
    );

    if (!protocolResults || !protocolResults.hits) {
      console.warn("No protocol hits found in search response");
      return [];
    }

    // Map hits to ProtocolListItem, extracting slug from id
    return protocolResults.hits
      .map((hit) => ({
        name: hit.name,
        // Extract slug: remove "protocol_" or "parent_" prefix
        slug: hit.id.startsWith("protocol_")
          ? hit.id.substring(9)
          : hit.id.startsWith("parent_")
          ? hit.id.substring(7)
          : hit.id, // Fallback if unexpected format
        tvl: hit.tvl ?? 0, // Handle null TVL
        logo: hit.logo,
      }))
      .filter((p) => p.slug); // Ensure we have a slug
  } catch (error) {
    console.error("Failed to search protocols:", error);
    throw error; // Re-throw to be handled by the caller
  }
}

/**
 * Fetches the historical TVL data for a specific protocol using the /protocol endpoint.
 * @param protocolSlug The slug of the protocol (e.g., "aave-v3")
 */
export async function fetchProtocolChart(
  protocolSlug: string
): Promise<HistoricalTvlPoint[]> {
  try {
    const response = await fetch(
      `${DEFILLAMA_API_BASE}/protocol/${protocolSlug}`
    );
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Protocol data not found for slug: ${protocolSlug}`);
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    const data: ProtocolApiResponse = await response.json();
    console.log(`Raw data from /protocol/${protocolSlug} endpoint:`, data);
    const historicalTvl = data.tvl;
    if (!Array.isArray(historicalTvl)) {
      console.error(
        `Could not find 'tvl' array in response from /protocol/${protocolSlug}:`,
        data
      );
      throw new Error(
        `Unexpected data structure from /protocol/${protocolSlug}. Expected a 'tvl' array.`
      );
    }
    if (historicalTvl.length > 0) {
      const firstPoint = historicalTvl[0];
      if (
        typeof firstPoint.date === "undefined" ||
        typeof firstPoint.totalLiquidityUSD === "undefined"
      ) {
        console.error("Invalid structure inside tvl array:", firstPoint);
        throw new Error(
          `Unexpected item structure in 'tvl' array from /protocol/${protocolSlug}.`
        );
      }
    }
    return historicalTvl as HistoricalTvlPoint[];
  } catch (error) {
    console.error(`Failed to fetch protocol data for ${protocolSlug}:`, error);
    throw error;
  }
}

// --- Calculation Helper ---

interface TvlCalculationResult {
  averageTvl: number;
  isStable: boolean;
}

/**
 * Calculates the average TVL and stability over the last 6 months.
 * @param chartData Array of historical TVL data points.
 */
export function calculateTvlMetrics(
  chartData: HistoricalTvlPoint[]
): TvlCalculationResult {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  const sixMonthsAgoTimestamp = Math.floor(sixMonthsAgo.getTime() / 1000);
  const relevantData = chartData
    .filter((point) => parseInt(point.date, 10) >= sixMonthsAgoTimestamp)
    .map((point) => point.totalLiquidityUSD)
    .filter((tvl) => tvl > 0);
  if (relevantData.length === 0) {
    return { averageTvl: 0, isStable: false };
  }
  const sumTvl = relevantData.reduce((sum, tvl) => sum + tvl, 0);
  const averageTvl = sumTvl / relevantData.length;
  const maxTvl = Math.max(...relevantData);
  const minTvl = Math.min(...relevantData);
  const volatilityRatio = averageTvl > 0 ? (maxTvl - minTvl) / averageTvl : 0;
  const isStable = volatilityRatio < 0.6;
  return { averageTvl, isStable };
}

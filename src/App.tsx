import React, { useState, useCallback, useEffect } from "react";
import RiskCalculatorForm from "./components/RiskCalculatorForm";
import ResultsDisplay from "./components/ResultsDisplay";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"; // Assuming shadcn setup
import { Toaster as SonnerToaster, toast as sonnerToast } from "sonner"; // Import Sonner
import { calculateTotalScore, getRiskLevel, RiskLevel } from "./lib/scoring";
// Import DefiLlama services and types
import {
  searchProtocols,
  fetchProtocolChart,
  calculateTvlMetrics,
  ProtocolListItem,
} from "./services/defillama";

// Define types for form inputs and results
interface FormInputs {
  runtimeYears: number;
  runtimeMonths: number;
  survivedCycle: boolean;
  auditCount: string; // Value from radio
  auditMonthsAgo: string; // Value from select
  hasIncident: boolean;
  lossAmount: number;
  lossAmountUnit: string;
  tvlBeforeIncident: number;
  tvlBeforeIncidentUnit: string;
  incidentMonthsAgo: string; // Value from select
  bountyTier: string; // Value from radio
  bountyMonthsAgo: string; // Value from select
}

interface ScoreResults {
  runtimeScore: number;
  tvlScore: number;
  auditScore: number;
  incidentScore: number;
  bountyScore: number;
  totalScore: number;
  riskLevel: RiskLevel | null;
}

// Define type for TVL data (simplified for now)
interface TvlInfo {
  averageTvl: number | null;
  isStable: boolean | null;
}

function App() {
  const [searchResults, setSearchResults] = useState<ProtocolListItem[]>([]); // State for search results
  const [searchQuery, setSearchQuery] = useState(""); // State for the raw search input
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(""); // State for the debounced query

  const [selectedProtocol, setSelectedProtocol] = useState<string | null>(null);
  const [formInputs, setFormInputs] = useState<FormInputs>({
    runtimeYears: 0,
    runtimeMonths: 0,
    survivedCycle: false,
    auditCount: "0",
    auditMonthsAgo: "0",
    hasIncident: false,
    lossAmount: 0,
    lossAmountUnit: "raw",
    tvlBeforeIncident: 0,
    tvlBeforeIncidentUnit: "raw",
    incidentMonthsAgo: "0",
    bountyTier: "0",
    bountyMonthsAgo: "0",
  });

  const [tvlInfo, setTvlInfo] = useState<TvlInfo>({
    averageTvl: null,
    isStable: null,
  });
  const [results, setResults] = useState<ScoreResults | null>(null);
  const [isLoading, setIsLoading] = useState({ search: false, tvl: false });
  const [error, setError] = useState<string | null>(null);

  // --- Debounce search input ---
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300); // Debounce time: 300ms

    // Cleanup function to clear the timeout if query changes before delay
    return () => {
      clearTimeout(handler);
    };
  }, [searchQuery]);

  // --- Effect to fetch search results when debounced query changes ---
  useEffect(() => {
    // Only search if debounced query is not empty
    if (debouncedSearchQuery) {
      const performSearch = async () => {
        setIsLoading((prev) => ({ ...prev, search: true }));
        setError(null);
        try {
          console.log(`Searching for: "${debouncedSearchQuery}"`);
          const results = await searchProtocols(debouncedSearchQuery);
          setSearchResults(results);
        } catch (err: unknown) {
          console.error("Error searching protocols:", err);
          const message = err instanceof Error ? err.message : "未知的錯誤";
          // Optionally show a toast, but maybe not on every search error
          // sonnerToast.error("協議搜尋失敗", { description: message });
          setError(`協議搜尋失敗: ${message}`);
          setSearchResults([]); // Clear results on error
        } finally {
          setIsLoading((prev) => ({ ...prev, search: false }));
        }
      };
      performSearch();
    } else {
      // Clear results if search query is empty
      setSearchResults([]);
    }
  }, [debouncedSearchQuery]); // Trigger search when debounced query changes

  // --- Handlers ---

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    // Don't clear results immediately, wait for search effect
  };

  const handleFormChange = useCallback(
    (field: keyof FormInputs, value: string | number | boolean) => {
      setFormInputs((prev) => ({
        ...prev,
        [field]: value,
      }));
      setResults(null); // Reset results when inputs change
    },
    []
  );

  const handleProtocolSelect = useCallback(
    async (protocolSlug: string | null) => {
      setSelectedProtocol(protocolSlug);
      setTvlInfo({ averageTvl: null, isStable: null });
      setResults(null);
      setError(null);
      setSearchQuery(""); // Clear search query on select
      setSearchResults([]); // Clear search results on select

      if (!protocolSlug) return;

      setIsLoading((prev) => ({ ...prev, tvl: true }));
      try {
        // Fetch real chart data
        const chartData = await fetchProtocolChart(protocolSlug);
        // Calculate metrics
        const { averageTvl, isStable } = calculateTvlMetrics(chartData);

        setTvlInfo({ averageTvl, isStable });
        sonnerToast.success("TVL 資料已載入", {
          description: `平均 TVL: ${(averageTvl / 1_000_000).toFixed(
            0
          )}M, 穩定: ${isStable ? "是" : "否"}`,
        });
      } catch (err: unknown) {
        console.error("Error fetching TVL data:", err);
        const message = err instanceof Error ? err.message : "未知的錯誤";
        setError(`無法獲取 ${protocolSlug} 的 TVL 資料：${message}`);
        sonnerToast.error(`無法獲取 ${protocolSlug} 的 TVL 資料`, {
          description: message,
        });
        setTvlInfo({ averageTvl: 0, isStable: false });
      } finally {
        setIsLoading((prev) => ({ ...prev, tvl: false }));
      }
    },
    []
  );

  const handleCalculateScores = useCallback(async () => {
    setError(null);
    // TODO: Add validation if needed

    if (tvlInfo.averageTvl === null || tvlInfo.isStable === null) {
      setError("請先選擇一個協議以載入 TVL 資料。");
      sonnerToast.error("缺少資料", { description: "請先選擇協議載入 TVL。" });
      return;
    }

    try {
      // Call scoring functions (Import them)
      const {
        calculateRuntimeScore,
        calculateTvlScore,
        calculateAuditScore,
        calculateIncidentScore,
        calculateBugBountyScore,
      } = await import("./lib/scoring");

      const runtimeScore = calculateRuntimeScore(
        formInputs.runtimeYears,
        formInputs.runtimeMonths,
        formInputs.survivedCycle
      );
      const tvlScore = calculateTvlScore(tvlInfo.averageTvl, tvlInfo.isStable);
      const auditScore = calculateAuditScore(
        formInputs.auditCount,
        formInputs.auditMonthsAgo
      );
      const incidentScore = calculateIncidentScore(
        formInputs.hasIncident,
        formInputs.lossAmount,
        formInputs.lossAmountUnit,
        formInputs.tvlBeforeIncident,
        formInputs.tvlBeforeIncidentUnit,
        formInputs.incidentMonthsAgo
      );
      const bountyScore = calculateBugBountyScore(
        formInputs.bountyTier,
        formInputs.bountyMonthsAgo
      );

      const calculatedScores = {
        runtimeScore,
        tvlScore,
        auditScore,
        incidentScore,
        bountyScore,
      };
      const totalScore = calculateTotalScore(calculatedScores);
      const riskLevel = getRiskLevel(totalScore);

      setResults({ ...calculatedScores, totalScore, riskLevel });
    } catch (err: unknown) {
      console.error("Error calculating scores:", err);
      const message = err instanceof Error ? err.message : "未知的錯誤";
      setError(`計算分數時發生錯誤：${message}`);
      sonnerToast.error("計算錯誤", { description: message });
      setResults(null);
    }
  }, [formInputs, tvlInfo]);

  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>DeFi 協議風險評分計算器 (React + shadcn/ui)</CardTitle>
        </CardHeader>
      </Card>

      <RiskCalculatorForm
        searchQuery={searchQuery}
        searchResults={searchResults}
        isLoadingSearch={isLoading.search}
        onSearchChange={handleSearchChange}
        inputs={formInputs}
        tvlInfo={tvlInfo}
        selectedProtocol={selectedProtocol}
        onInputChange={handleFormChange}
        onProtocolSelect={handleProtocolSelect}
        onSubmit={handleCalculateScores}
        isLoadingTvl={isLoading.tvl}
      />

      {error && (
        <Card className="mt-4 border-destructive bg-destructive/10">
          <CardContent className="p-4 text-destructive">
            <p className="font-semibold">錯誤:</p>
            <p>{error}</p>
          </CardContent>
        </Card>
      )}

      {results && !error && <ResultsDisplay results={results} />}

      <SonnerToaster richColors />
    </div>
  );
}

export default App;

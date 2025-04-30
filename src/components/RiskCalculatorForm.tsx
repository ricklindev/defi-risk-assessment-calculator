import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Check, ChevronsUpDown, Loader2 as SearchLoader } from "lucide-react";
import { ProtocolListItem } from "../services/defillama"; // Import the type
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils"; // Import cn utility

// Match the props passed from App.tsx
interface FormInputs {
  runtimeDuration: string;
  auditCount: string;
  auditMonthsAgo: string;
  bountyTier: string;
  bountyMonthsAgo: string;
}

interface TvlInfo {
  averageTvl: number | null;
  isStable: boolean | null;
}

interface RiskCalculatorFormProps {
  // Added search props
  searchQuery: string;
  searchResults: ProtocolListItem[];
  isLoadingSearch: boolean;
  onSearchChange: (query: string) => void;

  // Existing props
  inputs: FormInputs;
  tvlInfo: TvlInfo;
  selectedProtocol: string | null;
  isLoadingTvl: boolean;
  onInputChange: (
    field: keyof FormInputs,
    value: string | number | boolean
  ) => void;
  onProtocolSelect: (protocolSlug: string | null) => void;
  onSubmit: () => void;
}

// Helper to format large numbers
const formatTvl = (tvl: number | null): string => {
  if (tvl === null) return "--";
  if (tvl >= 1_000_000_000) return `${(tvl / 1_000_000_000).toFixed(2)}B`;
  if (tvl >= 1_000_000) return `${(tvl / 1_000_000).toFixed(2)}M`;
  if (tvl >= 1_000) return `${(tvl / 1_000).toFixed(2)}K`;
  return tvl.toFixed(0);
};

function RiskCalculatorForm({
  // Destructure new props
  searchQuery,
  searchResults,
  isLoadingSearch,
  onSearchChange,
  inputs,
  tvlInfo,
  selectedProtocol,
  isLoadingTvl,
  onInputChange,
  onProtocolSelect,
  onSubmit,
}: RiskCalculatorFormProps) {
  // State for Combobox
  const [comboboxOpen, setComboboxOpen] = useState(false);

  // Handle opening the combobox and trigger loading if needed
  const handleComboboxOpenChange = (open: boolean) => {
    setComboboxOpen(open);
    // Remove protocol loading logic
    // Clear search query when closing
    if (!open) {
      onSearchChange(""); // Clear search query via prop callback
    }
  };

  // Find the name of the selected protocol from searchResults or fallback
  const selectedProtocolName = selectedProtocol
    ? searchResults.find((p) => p.slug === selectedProtocol)?.name ||
      selectedProtocol // Fallback to slug if not in current results
    : "選擇一個協議...";

  return (
    <Card>
      <CardHeader>
        <CardTitle>輸入指標</CardTitle>
        <CardDescription>請輸入或選擇以下指標以計算風險評分。</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          <div className="space-y-6">
            {/* Protocol Combobox */}
            <div className="space-y-2">
              <Label>選擇協議 (以載入 TVL)</Label>
              <Popover
                open={comboboxOpen}
                onOpenChange={handleComboboxOpenChange}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={comboboxOpen}
                    className="w-full justify-between"
                    disabled={isLoadingTvl} // Only disable if TVL is loading
                  >
                    {/* Display selected protocol name or placeholder */}
                    {selectedProtocol
                      ? selectedProtocolName
                      : "選擇一個協議..."}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder="搜尋協議..."
                      value={searchQuery} // Use searchQuery prop
                      onValueChange={onSearchChange} // Use onSearchChange prop
                    />
                    <CommandList>
                      {/* Show loader inside list when searching */}
                      {isLoadingSearch && (
                        <div className="p-2 flex justify-center items-center">
                          <SearchLoader className="h-4 w-4 animate-spin" />
                        </div>
                      )}
                      {/* Show empty only when not loading and no results */}
                      {!isLoadingSearch &&
                        searchResults.length === 0 &&
                        searchQuery && (
                          <CommandEmpty>找不到協議。</CommandEmpty>
                        )}
                      {/* Show results only when not loading */}
                      {!isLoadingSearch && (
                        <CommandGroup>
                          {/* Clear selection item */}
                          <CommandItem
                            key="clear-selection"
                            value="__clear__"
                            onSelect={() => {
                              onProtocolSelect(null);
                              handleComboboxOpenChange(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                !selectedProtocol ? "opacity-100" : "opacity-0"
                              )}
                            />
                            -- 清除選擇 --
                          </CommandItem>
                          {/* Render search results */}
                          {searchResults.map((proto) => (
                            <CommandItem
                              key={proto.slug}
                              value={proto.name}
                              onSelect={() => {
                                onProtocolSelect(proto.slug);
                                handleComboboxOpenChange(false);
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedProtocol === proto.slug
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              {proto.name}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {/* Updated helper text */}
              <p className="text-sm text-muted-foreground">
                {isLoadingTvl ? (
                  <span className="flex items-center">
                    <SearchLoader className="mr-1 h-3 w-3 animate-spin" />{" "}
                    正在載入 TVL...
                  </span>
                ) : (
                  "輸入以搜尋協議，選擇後將載入 TVL 數據。"
                )}
              </p>
            </div>

            <Separator />

            {/* --- Runtime (Weight: 25%) --- */}
            <div className="space-y-3">
              <h3 className="font-semibold">1. 運行時間 (權重: 30%)</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>運行時長</Label>
                  <Select
                    value={inputs.runtimeDuration}
                    onValueChange={(value) =>
                      onInputChange("runtimeDuration", value)
                    }
                  >
                    <SelectTrigger id="runtime-duration">
                      <SelectValue placeholder="選擇運行時長..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">&lt; 1 年</SelectItem>
                      <SelectItem value="12">&gt; 1 年</SelectItem>
                      <SelectItem value="24">&gt; 2 年</SelectItem>
                      <SelectItem value="36">&gt; 3 年</SelectItem>
                      <SelectItem value="48">&gt; 4 年</SelectItem>
                      <SelectItem value="60">&gt; 5 年</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* --- TVL (Weight: 25%) --- */}
            <div className="space-y-3">
              <h3 className="font-semibold">2. TVL 評分 (權重: 30%)</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>平均 TVL (近 6 個月)</Label>
                  <Input
                    value={formatTvl(tvlInfo.averageTvl)}
                    readOnly
                    disabled
                    className="font-mono"
                  />
                  {!selectedProtocol && !isLoadingTvl && (
                    <p className="text-xs text-muted-foreground">
                      選擇協議後自動載入
                    </p>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>穩定性 (波動 &lt; 30%)</Label>
                  <Input
                    value={
                      tvlInfo.isStable === null
                        ? "--"
                        : tvlInfo.isStable
                        ? "是"
                        : "否"
                    }
                    readOnly
                    disabled
                  />
                  {!selectedProtocol && !isLoadingTvl && (
                    <p className="text-xs text-muted-foreground">
                      選擇協議後自動計算
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Audit (Weight: 20%) --- */}
            <div className="space-y-3">
              <h3 className="font-semibold">3. 安全審計 (權重: 25%)</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>審計次數</Label>
                  <RadioGroup
                    value={inputs.auditCount}
                    onValueChange={(value) =>
                      onInputChange("auditCount", value)
                    }
                    className="space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="0" id="audit-0" />
                      <Label htmlFor="audit-0" className="font-normal">
                        無審計
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="audit-1" />
                      <Label htmlFor="audit-1" className="font-normal">
                        1 次
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2" id="audit-2" />
                      <Label htmlFor="audit-2" className="font-normal">
                        2 次
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3" id="audit-3" />
                      <Label htmlFor="audit-3" className="font-normal">
                        3 次
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="4" id="audit-4" />
                      <Label htmlFor="audit-4" className="font-normal">
                        4 次
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="5" id="audit-5" />
                      <Label htmlFor="audit-5" className="font-normal">
                        5 次及以上
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="audit-months-ago">最近一次審計時間</Label>
                  <Select
                    value={inputs.auditMonthsAgo}
                    onValueChange={(value) =>
                      onInputChange("auditMonthsAgo", value)
                    }
                  >
                    <SelectTrigger id="audit-months-ago">
                      <SelectValue placeholder="選擇時間..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">過去 12 個月內</SelectItem>
                      <SelectItem value="12">過去 12-24 個月</SelectItem>
                      <SelectItem value="24">過去 24-36 個月</SelectItem>
                      <SelectItem value="36">36 個月以上或未知</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Bug Bounty (Weight: 10%) --- */}
            <div className="space-y-3">
              <h3 className="font-semibold">4. 漏洞賞金計畫 (權重: 15%)</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>最高賞金金額</Label>
                  <RadioGroup
                    value={inputs.bountyTier}
                    onValueChange={(value) =>
                      onInputChange("bountyTier", value)
                    }
                    className="space-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="0" id="bounty-0" />
                      <Label htmlFor="bounty-0" className="font-normal">
                        無 / &lt; $25 K
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="1" id="bounty-1" />
                      <Label htmlFor="bounty-1" className="font-normal">
                        $25 K – $100 K
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="2" id="bounty-2" />
                      <Label htmlFor="bounty-2" className="font-normal">
                        $100 K – $250 K
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="3" id="bounty-3" />
                      <Label htmlFor="bounty-3" className="font-normal">
                        $250 K – $500 K
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="4" id="bounty-4" />
                      <Label htmlFor="bounty-4" className="font-normal">
                        $500 K – $1 M
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="5" id="bounty-5" />
                      <Label htmlFor="bounty-5" className="font-normal">
                        &gt; $1 M
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bounty-months-ago">最近一次更新時間</Label>
                  <Select
                    value={inputs.bountyMonthsAgo}
                    onValueChange={(value) =>
                      onInputChange("bountyMonthsAgo", value)
                    }
                  >
                    <SelectTrigger id="bounty-months-ago">
                      <SelectValue placeholder="選擇時間..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">過去 12 個月內</SelectItem>
                      <SelectItem value="12">過去 12-24 個月</SelectItem>
                      <SelectItem value="24">過去 24-36 個月</SelectItem>
                      <SelectItem value="36">36 個月以上或未知</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Separator />

            {/* --- Submit Button --- */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoadingSearch || isLoadingTvl || !selectedProtocol}
            >
              {/* Use isLoadingSearch for button text */}
              {isLoadingSearch ? (
                <SearchLoader className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {isLoadingSearch
                ? "正在搜尋..."
                : isLoadingTvl
                ? "正在載入 TVL..."
                : selectedProtocol
                ? "計算評分"
                : "請先選擇協議"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default RiskCalculatorForm;

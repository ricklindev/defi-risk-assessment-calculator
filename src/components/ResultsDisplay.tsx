import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import type { RiskLevel } from "../lib/scoring"; // Import RiskLevel type

// Define the structure of the results object passed as props
interface ScoreResults {
  runtimeScore: number;
  tvlScore: number;
  auditScore: number;
  incidentScore: number;
  bountyScore: number;
  totalScore: number;
  riskLevel: RiskLevel | null; // Use the imported type
}

interface ResultsDisplayProps {
  results: ScoreResults;
}

// Helper to get badge variant based on risk level
const getBadgeVariant = (
  riskLevel: RiskLevel | null
): "default" | "destructive" | "secondary" | "outline" => {
  switch (riskLevel) {
    case "穩健":
    case "低風險":
      return "default"; // Greenish (default)
    case "中等風險":
      return "secondary"; // Yellowish (secondary)
    case "較高風險":
    case "高風險":
    case "極高風險":
      return "destructive"; // Red (destructive)
    default:
      return "outline";
  }
};

function ResultsDisplay({ results }: ResultsDisplayProps) {
  const scoreItems = [
    { name: "運行時間", score: results.runtimeScore, weight: "25%" },
    { name: "TVL", score: results.tvlScore, weight: "25%" },
    { name: "安全審計", score: results.auditScore, weight: "20%" },
    { name: "安全事件", score: results.incidentScore, weight: "20%" },
    { name: "漏洞賞金", score: results.bountyScore, weight: "10%" },
  ];

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>評分結果</CardTitle>
        <CardDescription>
          以下是根據您輸入的指標計算出的風險評分。
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px]">評分項目</TableHead>
              <TableHead className="w-[60px]">權重</TableHead>
              <TableHead className="w-[60px]">得分</TableHead>
              <TableHead>分數條</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scoreItems.map((item) => (
              <TableRow key={item.name}>
                <TableCell className="font-medium">{item.name}</TableCell>
                <TableCell>{item.weight}</TableCell>
                <TableCell>{item.score}</TableCell>
                <TableCell>
                  <Progress value={item.score} className="h-2" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-between items-center pt-4 border-t">
          <span className="text-lg font-semibold">總風險評分:</span>
          <span className="text-2xl font-bold">{results.totalScore}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold">風險等級:</span>
          {results.riskLevel && (
            <Badge
              variant={getBadgeVariant(results.riskLevel)}
              className="text-lg px-3 py-1"
            >
              {results.riskLevel}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default ResultsDisplay;

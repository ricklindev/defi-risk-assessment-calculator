export {}; // Placeholder to make it a module

// Helper function to apply units (M, B)
// Note: This might be better placed elsewhere if used outside scoring, but keep here for now.
// function applyUnit(value: number, unit: string): number {
//   if (isNaN(value)) return 0; // Return 0 instead of NaN for easier handling
//   switch (unit) {
//     case "M":
//       return value * 1_000_000;
//     case "B":
//       return value * 1_000_000_000;
//     case "raw": // Assuming raw means no unit conversion
//     default:
//       return value;
//   }
// }

export function calculateRuntimeScore(
  runtimeDuration: string // New parameter: "12", "24", "36", "48", "60", or other for < 12
): number {
  let score = 0;
  const duration = parseInt(runtimeDuration, 10);

  // Calculate score based on duration selection
  if (duration >= 60) score = 100;
  else if (duration >= 48) score = 80;
  else if (duration >= 36) score = 60;
  else if (duration >= 24) score = 40;
  else if (duration >= 12) score = 20;
  // else score remains 0 for < 12 months

  return score; // Return score directly, no extra Math.min needed if bonus caps
}

// Note: This function will be updated later to accept calculated average TVL and stability
// Keeping the old structure for now to match the migration step.
export function calculateTvlScore(
  averageTvl: number, // Placeholder for future use
  isStable: boolean
): number {
  const tvlAbsolute = averageTvl; // Use calculated average TVL directly
  let score = 0;

  if (tvlAbsolute >= 1_000_000_000) score = 100; // TVL > 1B
  else if (tvlAbsolute >= 500_000_000) score = 50; // TVL > 500M
  else if (tvlAbsolute >= 100_000_000) score = 20; // TVL > 100M

  if (isStable) score += 20;

  return Math.min(score, 100); // Cap at 100
}

export function calculateAuditScore(
  auditCountValue: string, // Assuming value from radio button (string)
  monthsAgoSelection: string // Assuming value from select (string)
): number {
  const auditCount = parseInt(auditCountValue, 10);
  let countScore = 0;
  if (auditCount >= 5) countScore = 100;
  else if (auditCount === 4) countScore = 80;
  else if (auditCount === 3) countScore = 60;
  else if (auditCount === 2) countScore = 40;
  else if (auditCount === 1) countScore = 20;
  // else countScore = 0; // Default is 0

  const monthsAgo = parseInt(monthsAgoSelection, 10); // 0, 12, 24, 36
  let factor = 1.0;
  if (monthsAgo >= 36) factor = 0.5;
  else if (monthsAgo >= 24) factor = 0.7;
  else if (monthsAgo >= 12) factor = 0.85;

  return Math.round(countScore * factor);
}

export function calculateBugBountyScore(
  bountyTierValue: string, // Assuming value from radio button (string)
  monthsAgoSelection: string // Assuming value from select (string)
): number {
  const bountyTier = parseInt(bountyTierValue, 10); // 0-5
  let tierScore = 0;
  switch (bountyTier) {
    case 5:
      tierScore = 100;
      break; // > $1M
    case 4:
      tierScore = 90;
      break; // $500K - $1M
    case 3:
      tierScore = 70;
      break; // $250K - $500K
    case 2:
      tierScore = 50;
      break; // $100K - $250K
    case 1:
      tierScore = 20;
      break; // $25K - $100K
    // case 0: // Fallthrough handled by default
    default:
      tierScore = 0; // No bounty or < $25K
      break;
  }

  const monthsAgo = parseInt(monthsAgoSelection, 10); // 0, 12, 24, 36
  let factor = 1.0;
  if (monthsAgo >= 36) factor = 0.5;
  else if (monthsAgo >= 24) factor = 0.7;
  else if (monthsAgo >= 12) factor = 0.85;

  return Math.round(tierScore * factor);
}

export type RiskLevel = "穩健" | "低風險" | "中等風險" | "較高風險" | "高風險";

export function getRiskLevel(totalScore: number): RiskLevel {
  if (totalScore >= 90) return "穩健";
  if (totalScore >= 80) return "低風險";
  if (totalScore >= 70) return "中等風險";
  if (totalScore >= 60) return "較高風險";
  return "高風險"; // Scores below 60 (originally >= 50 was 高風險, < 50 was 極高風險)
}

// Function to calculate the final weighted score
interface Scores {
  runtimeScore: number;
  tvlScore: number;
  auditScore: number;
  bountyScore: number;
}

export function calculateTotalScore(scores: Scores): number {
  const totalScore =
    scores.runtimeScore * 0.3 + // 30%
    scores.tvlScore * 0.3 + // 30%
    scores.auditScore * 0.25 + // 25%
    scores.bountyScore * 0.15; // 15%
  return Math.round(totalScore);
}

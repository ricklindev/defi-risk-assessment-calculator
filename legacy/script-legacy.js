document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("risk-form");
  const resultsDiv = document.getElementById("results");
  const incidentDetailsDiv = document.getElementById("incident-details");
  const hasIncidentCheckbox = document.getElementById("has-incident");
  const lossAmountInput = document.getElementById("loss-amount");
  const tvlBeforeInput = document.getElementById("tvl-before-incident");
  const lossPercentageSpan = document.getElementById("loss-percentage");
  // Add selectors for new unit dropdowns
  const lossAmountUnitSelect = document.getElementById("loss-amount-unit");
  const tvlBeforeUnitSelect = document.getElementById(
    "tvl-before-incident-unit"
  );
  const resetButton = document.getElementById("reset-button");

  // --- Event Listeners ---

  // Toggle incident details visibility
  hasIncidentCheckbox.addEventListener("change", () => {
    incidentDetailsDiv.classList.toggle("hidden", !hasIncidentCheckbox.checked);
    // Clear incident fields if unchecked
    if (!hasIncidentCheckbox.checked) {
      document.getElementById("loss-amount").value = "";
      document.getElementById("tvl-before-incident").value = "";
      document.getElementById("months-ago").value = "0"; // Reset to default
      // Reset units as well
      lossAmountUnitSelect.value = "raw";
      tvlBeforeUnitSelect.value = "raw";
      lossPercentageSpan.textContent = "--%";
    }
    // Make incident fields required if checked
    const requiredFields = ["loss-amount", "tvl-before-incident", "months-ago"];
    requiredFields.forEach((id) => {
      document.getElementById(id).required = hasIncidentCheckbox.checked;
    });
  });

  // Calculate loss percentage dynamically
  function calculateAndDisplayLossPercentage() {
    const lossAmountRaw = parseFloat(lossAmountInput.value);
    const tvlBeforeRaw = parseFloat(tvlBeforeInput.value);
    const lossUnit = lossAmountUnitSelect.value;
    const tvlUnit = tvlBeforeUnitSelect.value;

    const lossAmount = applyUnit(lossAmountRaw, lossUnit);
    const tvlBefore = applyUnit(tvlBeforeRaw, tvlUnit);

    if (!isNaN(lossAmount) && !isNaN(tvlBefore) && tvlBefore > 0) {
      const percentage = (lossAmount / tvlBefore) * 100;
      lossPercentageSpan.textContent = `${percentage.toFixed(2)}%`;
    } else {
      lossPercentageSpan.textContent = "--%";
    }
  }
  lossAmountInput.addEventListener("input", calculateAndDisplayLossPercentage);
  tvlBeforeInput.addEventListener("input", calculateAndDisplayLossPercentage);
  // Also recalculate when units change
  lossAmountUnitSelect.addEventListener(
    "change",
    calculateAndDisplayLossPercentage
  );
  tvlBeforeUnitSelect.addEventListener(
    "change",
    calculateAndDisplayLossPercentage
  );

  // Handle form reset
  form.addEventListener("reset", () => {
    // Hide results and incident details section
    resultsDiv.classList.add("hidden");
    incidentDetailsDiv.classList.add("hidden");
    hasIncidentCheckbox.checked = false; // Uncheck incident checkbox

    // Reset all result spans
    document.getElementById("runtime-score-result").textContent = "--";
    document.getElementById("tvl-score-result").textContent = "--";
    document.getElementById("audit-score-result").textContent = "--";
    document.getElementById("incident-score-result").textContent = "--";
    document.getElementById("total-score-result").textContent = "--";
    document.getElementById("risk-level-result").textContent = "--";

    // Reset loss percentage
    lossPercentageSpan.textContent = "--%";

    // Make incident fields not required after reset
    const requiredFields = ["loss-amount", "tvl-before-incident", "months-ago"];
    requiredFields.forEach((id) => {
      document.getElementById(id).required = false;
    });
  });

  // Form submission handler
  form.addEventListener("submit", (event) => {
    event.preventDefault(); // Prevent actual form submission
    calculateScores();
    resultsDiv.classList.remove("hidden"); // Show results
  });

  // --- Calculation Functions ---

  function getInputValue(id, type = "number") {
    const element = document.getElementById(id);
    if (!element) {
      console.error(`Element with ID ${id} not found.`);
      if (type === "radio") {
        // Handle radio buttons differently since they're a group
        const radioGroup = document.querySelectorAll(`input[name="${id}"]`);
        if (!radioGroup || radioGroup.length === 0) {
          console.error(`Radio group with name ${id} not found.`);
          return null;
        }
        for (const radio of radioGroup) {
          if (radio.checked) {
            return radio.value;
          }
        }
        return null; // No radio selected
      }
      return type === "checkbox" ? false : type === "select" ? null : 0;
    }

    if (type === "checkbox") {
      return element.checked;
    }

    if (type === "select") {
      return element.value;
    }

    if (type === "radio") {
      // Find the checked radio button within the group name
      const radioGroup = document.querySelectorAll(
        `input[name="${element.name}"]`
      );
      for (const radio of radioGroup) {
        if (radio.checked) {
          return radio.value;
        }
      }
      return null; // Should not happen if required/default checked
    }

    // Default to number type
    const value = parseFloat(element.value);
    return isNaN(value) ? 0 : value; // Return 0 if input is not a valid number or empty
  }

  // Helper function to apply units (M, B)
  function applyUnit(value, unit) {
    if (isNaN(value)) return NaN;
    switch (unit) {
      case "M":
        return value * 1_000_000;
      case "B":
        return value * 1_000_000_000;
      case "raw":
      default:
        return value;
    }
  }

  function calculateRuntimeScore(years, months, survivedCycle) {
    const totalMonths = years * 12 + months;
    let score = 0;

    if (totalMonths > 36) score = 45;
    else if (totalMonths > 24) score = 30;
    else if (totalMonths > 12) score = 15;

    if (survivedCycle) score += 40;

    return Math.min(score, 100); // Max score is 100 according to description, although structure implies 85 max.
    // Keeping 100 as per description.
  }

  function calculateTvlScore(value, unit, isStable) {
    const tvlAbsolute = applyUnit(value, unit);
    let score = 0;

    if (tvlAbsolute >= 1_000_000_000) score = 100; // TVL > 1B
    else if (tvlAbsolute >= 500_000_000) score = 50; // TVL > 500M
    else if (tvlAbsolute >= 100_000_000) score = 20; // TVL > 100M

    if (isStable) score += 20;

    return Math.min(score, 100); // Cap at 100
  }

  function calculateAuditScore(auditCountValue, monthsAgoSelection) {
    const auditCount = parseInt(auditCountValue);
    let countScore = 0;
    if (auditCount >= 5) countScore = 100;
    else if (auditCount === 4) countScore = 80;
    else if (auditCount === 3) countScore = 60;
    else if (auditCount === 2) countScore = 40;
    else if (auditCount === 1) countScore = 20;
    else countScore = 0;

    const monthsAgo = parseInt(monthsAgoSelection); // 0, 12, 24, 36
    let factor = 1.0;
    if (monthsAgo >= 36) factor = 0.5;
    else if (monthsAgo >= 24) factor = 0.7;
    else if (monthsAgo >= 12) factor = 0.85;

    return Math.round(countScore * factor);
  }

  function calculateIncidentScore(
    hasIncident,
    lossAmountRaw,
    lossAmountUnit,
    tvlBeforeRaw,
    tvlBeforeUnit,
    monthsAgoSelection
  ) {
    if (!hasIncident) return 100;

    const lossAmount = applyUnit(lossAmountRaw, lossAmountUnit);
    const tvlBefore = applyUnit(tvlBeforeRaw, tvlBeforeUnit);
    const monthsAgo = parseInt(monthsAgoSelection); // 0, 12, 24, 36

    if (
      isNaN(lossAmount) ||
      isNaN(tvlBefore) ||
      tvlBefore <= 0 ||
      lossAmount < 0
    ) {
      alert("請輸入有效的安全事件數值 (損失金額、事發前 TVL 需 > 0)");
      return 0; // Invalid input for incident
    }

    const lossPercentage =
      lossAmount === 0 ? 0 : (lossAmount / tvlBefore) * 100;
    let baseScore;

    if (lossPercentage === 0) baseScore = 100; // No loss
    else if (lossPercentage < 10) baseScore = 80; // 輕微
    else if (lossPercentage <= 30) baseScore = 50; // 中度
    else if (lossPercentage <= 50) baseScore = 20; // 嚴重
    else baseScore = 0; // 災難性 (> 50%)

    let timeFactorPercent = 0;
    if (monthsAgo >= 36) timeFactorPercent = 0.9; // 36+ months
    else if (monthsAgo >= 24) timeFactorPercent = 0.75; // 24-36 months
    else if (monthsAgo >= 12) timeFactorPercent = 0.5; // 12-24 months
    // else timeFactorPercent = 0; // Within 12 months

    const adjustedScore = baseScore + (100 - baseScore) * timeFactorPercent;
    return Math.round(adjustedScore);
  }

  function calculateBugBountyScore(bountyTierValue, monthsAgoSelection) {
    const bountyTier = parseInt(bountyTierValue); // 0-5
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
      case 0: // Fallthrough: No bounty or < $25K
      default:
        tierScore = 0;
        break;
    }

    const monthsAgo = parseInt(monthsAgoSelection); // 0, 12, 24, 36
    let factor = 1.0;
    if (monthsAgo >= 36) factor = 0.5;
    else if (monthsAgo >= 24) factor = 0.7;
    else if (monthsAgo >= 12) factor = 0.85;

    return Math.round(tierScore * factor);
  }

  function getRiskLevel(totalScore) {
    if (totalScore >= 90) return "穩健";
    if (totalScore >= 80) return "低風險";
    if (totalScore >= 70) return "中等風險";
    if (totalScore >= 60) return "較高風險";
    if (totalScore >= 50) return "高風險";
    return "極高風險"; // Scores below 50
  }

  function calculateScores() {
    // Get all input values using the helper function
    const runtimeYears = getInputValue("runtime-years");
    const runtimeMonths = getInputValue("runtime-months");
    const survivedCycle = getInputValue("survived-cycle", "checkbox");

    const tvlValue = getInputValue("tvl-value");
    const tvlUnit = getInputValue("tvl-unit", "select");
    const tvlStable = getInputValue("tvl-stable", "checkbox");

    const auditCount = getInputValue("audit-count", "radio");
    const auditMonthsAgo = getInputValue("audit-months-ago", "select");

    const hasIncident = getInputValue("has-incident", "checkbox");
    let lossAmountRaw = 0,
      lossAmountUnit = "raw",
      tvlBeforeIncidentRaw = 0,
      tvlBeforeIncidentUnit = "raw",
      monthsAgo = "0";
    if (hasIncident) {
      lossAmountRaw = getInputValue("loss-amount");
      lossAmountUnit = getInputValue("loss-amount-unit", "select");
      tvlBeforeIncidentRaw = getInputValue("tvl-before-incident");
      tvlBeforeIncidentUnit = getInputValue(
        "tvl-before-incident-unit",
        "select"
      );
      monthsAgo = getInputValue("months-ago", "select");
    }

    const bountyTier = getInputValue("bounty-tier", "radio");
    const bountyMonthsAgo = getInputValue("bounty-months-ago", "select");

    // Calculate individual scores based on the new framework
    const runtimeScore = calculateRuntimeScore(
      runtimeYears,
      runtimeMonths,
      survivedCycle
    );
    const tvlScore = calculateTvlScore(tvlValue, tvlUnit, tvlStable);
    const auditScore = calculateAuditScore(auditCount, auditMonthsAgo);
    const incidentScore = calculateIncidentScore(
      hasIncident,
      lossAmountRaw,
      lossAmountUnit,
      tvlBeforeIncidentRaw,
      tvlBeforeIncidentUnit,
      monthsAgo
    );
    const bountyScore = calculateBugBountyScore(bountyTier, bountyMonthsAgo);

    // Calculate total score using new weights from v2.3
    const totalScore =
      runtimeScore * 0.25 + // 25%
      tvlScore * 0.25 + // 25%
      auditScore * 0.2 + // 20%
      incidentScore * 0.2 + // 20%
      bountyScore * 0.1; // 10%

    const finalTotalScore = Math.round(totalScore); // Round to nearest integer
    const riskLevel = getRiskLevel(finalTotalScore);

    // Display results
    document.getElementById("runtime-score-result").textContent = runtimeScore;
    document.getElementById("tvl-score-result").textContent = tvlScore;
    document.getElementById("audit-score-result").textContent = auditScore;
    document.getElementById("incident-score-result").textContent =
      incidentScore;
    document.getElementById("bounty-score-result").textContent = bountyScore;
    document.getElementById("total-score-result").textContent = finalTotalScore;
    document.getElementById("risk-level-result").textContent = riskLevel;
  }
});

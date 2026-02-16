export interface CalcCommissionTier {
  id: string;
  min_amount: number;
  max_amount: number | null;
  commission_percent: number;
  sort_order: number | null;
}

export interface CalcCommissionTemplate {
  id: string;
  name: string;
  calculation_type: string; // 'graduated' | 'flat_rate'
  markup_commissionable_percent: number | null;
}

export interface AgentSettings {
  custom_commission_percent: number | null;
  custom_markup_percent: number | null;
  use_custom_override: boolean | null;
}

export interface TierBreakdownEntry {
  tier: string;
  amount: number;
  percent: number;
  commission: number;
}

export interface CommissionResult {
  baseCommissionAmount: number;
  markupCommissionAmount: number;
  companyMarkupAmount: number;
  totalCommissionAmount: number;
  calculationType: string;
  tierBreakdown: TierBreakdownEntry[];
  markupCommissionablePercent: number;
}

export interface CommissionCalculationInput {
  dealValue: number;
  markupAmount: number;
  template: CalcCommissionTemplate;
  tiers: CalcCommissionTier[];
  agentSettings: AgentSettings | null;
}

export function calculateCommission(input: CommissionCalculationInput): CommissionResult {
  const { dealValue, markupAmount, template, tiers, agentSettings } = input;

  // Step 1: Determine markup split
  const markupCommissionablePercent = agentSettings?.custom_markup_percent
    ?? template.markup_commissionable_percent
    ?? 50;

  const agentMarkupPortion = markupAmount * (markupCommissionablePercent / 100);
  const companyMarkupPortion = markupAmount - agentMarkupPortion;

  // Step 2: Calculate commissionable base
  const commissionableBase = dealValue + agentMarkupPortion;

  // Step 3: Check for custom override
  if (agentSettings?.use_custom_override && agentSettings.custom_commission_percent) {
    const totalCommission = commissionableBase * (agentSettings.custom_commission_percent / 100);
    return {
      baseCommissionAmount: totalCommission,
      markupCommissionAmount: 0,
      companyMarkupAmount: companyMarkupPortion,
      totalCommissionAmount: totalCommission,
      calculationType: 'custom_override',
      tierBreakdown: [{
        tier: 'Custom Override',
        amount: commissionableBase,
        percent: agentSettings.custom_commission_percent,
        commission: totalCommission,
      }],
      markupCommissionablePercent,
    };
  }

  // Step 4: Apply tiered calculation
  if (template.calculation_type === 'graduated') {
    return calculateGraduated(commissionableBase, tiers, companyMarkupPortion, markupCommissionablePercent);
  } else {
    return calculateFlatRate(commissionableBase, tiers, companyMarkupPortion, markupCommissionablePercent);
  }
}

function calculateGraduated(
  amount: number,
  tiers: CalcCommissionTier[],
  companyMarkup: number,
  markupCommissionablePercent: number,
): CommissionResult {
  let totalCommission = 0;
  let remaining = amount;
  const breakdown: TierBreakdownEntry[] = [];

  const sortedTiers = [...tiers].sort((a, b) => a.min_amount - b.min_amount);

  for (const tier of sortedTiers) {
    if (remaining <= 0) break;

    const tierMax = tier.max_amount ?? Infinity;
    const tierRange = tierMax - tier.min_amount;
    const amountInTier = Math.min(remaining, tierRange);
    const tierCommission = amountInTier * (tier.commission_percent / 100);

    breakdown.push({
      tier: `$${tier.min_amount.toLocaleString()}-${tier.max_amount ? '$' + tier.max_amount.toLocaleString() : '∞'}`,
      amount: amountInTier,
      percent: tier.commission_percent,
      commission: tierCommission,
    });

    totalCommission += tierCommission;
    remaining -= amountInTier;
  }

  return {
    baseCommissionAmount: totalCommission,
    markupCommissionAmount: 0,
    companyMarkupAmount: companyMarkup,
    totalCommissionAmount: totalCommission,
    calculationType: 'graduated',
    tierBreakdown: breakdown,
    markupCommissionablePercent,
  };
}

function calculateFlatRate(
  amount: number,
  tiers: CalcCommissionTier[],
  companyMarkup: number,
  markupCommissionablePercent: number,
): CommissionResult {
  const applicableTier = [...tiers]
    .filter(t => amount >= t.min_amount)
    .sort((a, b) => b.min_amount - a.min_amount)[0];

  if (!applicableTier) {
    return {
      baseCommissionAmount: 0,
      markupCommissionAmount: 0,
      companyMarkupAmount: companyMarkup,
      totalCommissionAmount: 0,
      calculationType: 'flat_rate',
      tierBreakdown: [],
      markupCommissionablePercent,
    };
  }

  const commission = amount * (applicableTier.commission_percent / 100);

  return {
    baseCommissionAmount: commission,
    markupCommissionAmount: 0,
    companyMarkupAmount: companyMarkup,
    totalCommissionAmount: commission,
    calculationType: 'flat_rate',
    tierBreakdown: [{
      tier: `$${applicableTier.min_amount.toLocaleString()}-${applicableTier.max_amount ? '$' + applicableTier.max_amount.toLocaleString() : '∞'}`,
      amount,
      percent: applicableTier.commission_percent,
      commission,
    }],
    markupCommissionablePercent,
  };
}

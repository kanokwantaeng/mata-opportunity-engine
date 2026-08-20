export const SCORING_VERSION = '1.0';

const clamp = (n, min, max) => Math.min(max, Math.max(min, Number(n) || 0));
const round1 = n => Math.round(n * 10) / 10;

export function normalizeEconomics(rawScore, acquisitionKnown = false) {
  const availableMax = acquisitionKnown ? 15 : 14;
  return round1((clamp(rawScore, 0, availableMax) / availableMax) * 15);
}

export function calculateConfidence({ evidence = [], assumptions = [] }) {
  const meaningful = evidence.filter(e => ['MEDIUM','STRONG','VERY_STRONG'].includes(e.strength));
  const sourceFamilies = new Set(meaningful.map(e => e.source_type));
  const strongBuying = evidence.some(e =>
    ['STRONG','VERY_STRONG'].includes(e.strength) &&
    ['OWN_SALES','PREORDER','EXPERIMENT_RESULT','MARKETPLACE','OWN_CUSTOMER_DATA'].includes(e.source_type)
  );
  const paidValidation = evidence.some(e =>
    ['VERY_STRONG'].includes(e.strength) && ['OWN_SALES','PREORDER','EXPERIMENT_RESULT'].includes(e.source_type)
  );
  const criticalUnknown = assumptions.some(a => ['HIGH','CRITICAL'].includes(a.impact) && a.status === 'UNKNOWN');

  if (paidValidation && !criticalUnknown) return 'HIGH';
  if (sourceFamilies.size >= 2 && strongBuying && !assumptions.some(a => a.impact === 'CRITICAL' && a.status === 'UNKNOWN')) return 'MEDIUM';
  return 'LOW';
}

export function calculateScore(input) {
  const s = input.scores || {};
  let demand = clamp(s.demand, 0, 20);
  const evidence = input.evidence || [];
  const hasMedium = evidence.some(e => ['MEDIUM','STRONG','VERY_STRONG'].includes(e.strength));
  const hasBuying = evidence.some(e =>
    ['MARKETPLACE','OWN_SALES','PREORDER','EXPERIMENT_RESULT','OWN_CUSTOMER_DATA'].includes(e.source_type) &&
    ['MEDIUM','STRONG','VERY_STRONG'].includes(e.strength)
  );
  if (!hasMedium) demand = Math.min(demand, 8);
  if (!hasBuying) demand = Math.min(demand, 14);

  const motivation = clamp(s.motivation, 0, 15);
  const buyer = clamp(s.buyer, 0, 15);
  const competition = clamp(s.competition, 0, 10);
  const differentiation = clamp(s.differentiation, 0, 10);
  const buildability = clamp(s.buildability, 0, 10);
  const economics = clamp(s.economics, 0, 15);
  const scale = clamp(s.scale, 0, 5);
  const overall = round1(demand + motivation + buyer + competition + differentiation + buildability + economics + scale);
  const confidence = calculateConfidence(input);

  const gates = {
    buyerClarityPassed: Number(input.buyerClarity ?? 0) > 1,
    marginViable: input.marginViable !== false,
    hasBuyingSignal: hasBuying,
    demandPassed: demand >= 14,
    buyerPassed: buyer >= 10,
    economicsPassed: economics >= 10,
    confidencePassed: ['MEDIUM','HIGH'].includes(confidence),
    noCriticalRedFlag: !(input.redFlags || []).some(r => r.severity === 'CRITICAL')
  };

  let decision = 'TEST';
  let reason = 'ยังมีสมมติฐานสำคัญที่ควรทดสอบก่อนสร้างเต็ม';
  const parkBlocker = overall < 55 || !gates.buyerClarityPassed || !gates.marginViable || !gates.noCriticalRedFlag;
  if (parkBlocker) {
    decision = 'PARK';
    reason = 'มีข้อจำกัดสำคัญที่ควรแก้ก่อนลงทุนสร้างสินค้า';
  } else if (
    overall >= 75 && gates.confidencePassed && gates.demandPassed && gates.buyerPassed &&
    gates.economicsPassed && gates.hasBuyingSignal && gates.noCriticalRedFlag
  ) {
    decision = 'BUILD';
    reason = 'คะแนน หลักฐาน และเงื่อนไขสำคัญผ่านเกณฑ์ BUILD';
  }

  return {
    scoring_version: SCORING_VERSION,
    dimensions: { demand, motivation, buyer, competition, differentiation, buildability, economics, scale },
    overall_score: overall,
    confidence,
    decision,
    decision_reason: reason,
    gates
  };
}

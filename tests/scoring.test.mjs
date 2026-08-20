import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateScore, normalizeEconomics } from '../public/shared/scoring.js';

const baseScores = { demand:18, motivation:12, buyer:12, competition:8, differentiation:8, buildability:9, economics:12, scale:4 };

test('ads unknown does not penalize normalized economics', () => {
  assert.equal(normalizeEconomics(11, false), 11.8);
});

test('low evidence caps demand and prevents BUILD', () => {
  const r = calculateScore({ scores: baseScores, evidence: [], assumptions:[{impact:'HIGH',status:'UNKNOWN'}], buyerClarity:3, marginViable:true, redFlags:[] });
  assert.equal(r.dimensions.demand, 8);
  assert.notEqual(r.decision, 'BUILD');
  assert.equal(r.confidence, 'LOW');
});

test('strong preorder validation can permit BUILD', () => {
  const evidence = [
    { source_type:'MARKETPLACE', strength:'MEDIUM' },
    { source_type:'PREORDER', strength:'VERY_STRONG' }
  ];
  const r = calculateScore({ scores: baseScores, evidence, assumptions:[{impact:'HIGH',status:'VALIDATED'}], buyerClarity:3, marginViable:true, redFlags:[] });
  assert.equal(r.confidence, 'HIGH');
  assert.equal(r.decision, 'BUILD');
});

test('critical red flag blocks BUILD', () => {
  const evidence = [{ source_type:'PREORDER', strength:'VERY_STRONG' },{source_type:'MARKETPLACE',strength:'MEDIUM'}];
  const r = calculateScore({ scores: baseScores, evidence, assumptions:[], buyerClarity:3, marginViable:true, redFlags:[{severity:'CRITICAL'}] });
  assert.equal(r.decision, 'PARK');
});

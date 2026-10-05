const commService = require('./src/services/commission.service');
const assert = require('assert');

console.log('Testing Commission Service...');

// Test 1: Percentage calculation
const c1 = commService.calculateCommissionAmount(10000, 'percentage', 15);
assert.strictEqual(c1, 1500, `Expected 1500, got ${c1}`);

// Test 2: Percentage with 2 decimal places
const c2 = commService.calculateCommissionAmount(12345.67, 'percentage', 18.5);
assert.strictEqual(c2, 2283.95, `Expected 2283.95, got ${c2}`);

// Test 3: Flat calculation
const c3 = commService.calculateCommissionAmount(0, 'flat', 0, 2500);
assert.strictEqual(c3, 2500, `Expected 2500, got ${c3}`);

// Test 4: Premium basis resolution
const mockPolicy = {
  finalPremium: 15000,
  netPremium: 12000,
  basicPremium: 10000,
  vehicleDetails: { ownDamagePremium: 8000 }
};
assert.strictEqual(commService.getPolicyPremiumBasisAmount(mockPolicy, 'net_premium'), 12000);
assert.strictEqual(commService.getPolicyPremiumBasisAmount(mockPolicy, 'final_premium'), 15000);
assert.strictEqual(commService.getPolicyPremiumBasisAmount(mockPolicy, 'basic_premium'), 10000);
assert.strictEqual(commService.getPolicyPremiumBasisAmount(mockPolicy, 'od_premium'), 8000);

console.log('All commission service unit assertions PASSED successfully!');

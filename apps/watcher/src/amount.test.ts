import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formatUnits } from './amount.js';

test('formats USDC raw amounts with 6 decimals', () => {
  assert.equal(formatUnits(1500170000n, 6), '1500.170000');
  assert.equal(formatUnits(1n, 6), '0.000001');
  assert.equal(formatUnits(0n, 6), '0.000000');
  assert.equal(formatUnits(-57300000n, 6), '-57.300000');
});

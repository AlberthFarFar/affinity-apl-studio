import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProjectData } from '../types.ts';
import { createLatestRequestGuard, mergeEmptyProjectFields } from './projectAutofill.ts';

const project: ProjectData = { name: 'Edit Manual', type: '', price: 'Rp 900 Juta', location: '', features: '', style: '', developer: '', contactPhone: '', website: '' };

test('field manual tidak ditimpa dan hanya field kosong yang diisi', () => {
  const merged = mergeEmptyProjectFields(project, { name: 'Hasil Link', type: 'Tipe 45', price: 'Rp 850 Juta', location: 'Bandung' });
  assert.equal(merged.name, 'Edit Manual');
  assert.equal(merged.price, 'Rp 900 Juta');
  assert.equal(merged.type, 'Tipe 45');
  assert.equal(merged.location, 'Bandung');
});

test('hasil request lama tidak dapat diterapkan setelah request baru dimulai', () => {
  const guard = createLatestRequestGuard();
  const oldRequest = guard.begin();
  const newRequest = guard.begin();
  assert.equal(guard.isLatest(oldRequest), false);
  assert.equal(guard.isLatest(newRequest), true);
});

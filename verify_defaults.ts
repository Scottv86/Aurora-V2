import { calculateDefaultValue } from './src/services/fieldService.ts';
import { ModuleField } from './src/types/platform.ts';

const testField: any = {
  id: 'target',
  type: 'date',
  defaultType: 'field_copy',
  defaultSourceFieldId: 'source',
  defaultOffset: 7,
  defaultOffsetUnit: 'days'
};

const currentData = {
  source: '2026-01-01'
};

const result = calculateDefaultValue(testField, currentData);
console.log('Test 1 (Field Copy + Offset):', result);
if (result === '2026-01-08') console.log('✅ PASSED');
else console.log('❌ FAILED');

const testField2: any = {
  id: 'target2',
  type: 'date',
  defaultType: 'today',
  defaultOffset: -1,
  defaultOffsetUnit: 'days'
};

const result2 = calculateDefaultValue(testField2, {});
console.log('Test 2 (Today - 1 day):', result2);
// Today is 2026-05-11 (based on system time in prompt)
// So result should be 2026-05-10
if (result2 === '2026-05-10') console.log('✅ PASSED');
else console.log('❌ FAILED');

const testField3: any = {
  id: 'target3',
  type: 'date',
  defaultType: 'start_of_month',
  defaultOffset: 5,
  defaultOffsetUnit: 'days'
};

const result3 = calculateDefaultValue(testField3, {});
console.log('Test 3 (Start of Month + 5 days):', result3);
// Start of May 2026 is 2026-05-01. + 5 days = 2026-05-06
if (result3 === '2026-05-06') console.log('✅ PASSED');
else console.log('❌ FAILED');

import { isFieldVisible } from './src/lib/utils';
const rule = { type: 'group', logicalOperator: 'AND', rules: [{ type: 'rule', fieldId: 'status', operator: 'equals', value: 'Active' }] };
console.log('Empty data:', isFieldVisible({ visibilityRule: rule }, {}));
console.log('Matching data:', isFieldVisible({ visibilityRule: rule }, { status: 'Active' }));
console.log('Non-matching data:', isFieldVisible({ visibilityRule: rule }, { status: 'Inactive' }));

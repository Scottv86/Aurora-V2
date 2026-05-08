import { evaluateCalculations } from '../src/services/aiService';

const fields: any[] = [
  { id: 'f1', label: 'Premises Name', type: 'text' },
  { id: 'f2', label: 'Premises Type', type: 'text' },
  { id: 'calc1', label: 'Title Calculation', type: 'calculation', calculationLogic: "{Premises Name} + ' - ' + {Premises Type}" },
  { id: 'calc2', label: 'Upper Case Title', type: 'calculation', calculationLogic: "{Title Calculation}.toUpperCase()" }
];

const data = {
  f1: 'My Premises',
  f2: 'Office'
};

const result = evaluateCalculations(data, fields);
console.log('Result:', result);

if (result.calc1 === 'My Premises - Office' && result.calc2 === 'MY PREMISES - OFFICE') {
  console.log('SUCCESS: Calculation logic is working correctly with labels and multiple passes.');
} else {
  console.log('FAILURE: Calculation logic mismatch.');
}

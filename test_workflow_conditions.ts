import { WorkflowEngine } from './server/services/workflowEngine';

function runTests() {
  console.log('🧪 Starting Workflow Engine Condition Unit Tests...\n');

  let passedCount = 0;
  let failedCount = 0;

  const testCases = [
    // 1. Direct Slug Referencing (Numbers)
    {
      name: 'Direct slug: simple numeric comparison (true)',
      record: { amount: 15000 },
      condition: 'amount > 10000',
      expected: true
    },
    {
      name: 'Direct slug: simple numeric comparison (false)',
      record: { amount: 5000 },
      condition: 'amount > 10000',
      expected: false
    },

    // 2. Backward Compatibility (record.prefix)
    {
      name: 'Backward compatibility: prefix numeric comparison (true)',
      record: { amount: 15000 },
      condition: 'record.amount > 10000',
      expected: true
    },
    {
      name: 'Backward compatibility: prefix numeric comparison (false)',
      record: { amount: 5000 },
      condition: 'record.amount > 10000',
      expected: false
    },

    // 3. String comparison
    {
      name: 'Direct slug: string comparison (true)',
      record: { status: 'Licensed', priority: 'High' },
      condition: "status === 'Licensed'",
      expected: true
    },
    {
      name: 'Direct slug: string comparison (false)',
      record: { status: 'Expired', priority: 'High' },
      condition: "status === 'Licensed'",
      expected: false
    },

    // 4. Multiple conditions (AND / OR)
    {
      name: 'Direct slug: logical AND (true)',
      record: { amount: 20000, priority: 'High' },
      condition: "amount > 15000 && priority === 'High'",
      expected: true
    },
    {
      name: 'Direct slug: logical AND (false due to amount)',
      record: { amount: 5000, priority: 'High' },
      condition: "amount > 15000 && priority === 'High'",
      expected: false
    },
    {
      name: 'Direct slug: logical OR (true)',
      record: { amount: 5000, priority: 'High' },
      condition: "amount > 15000 || priority === 'High'",
      expected: true
    },

    // 5. JavaScript identifier parsing & Safety
    {
      name: 'Safety: field slugs with invalid JS characters (hyphens) are filtered and do not crash evaluation',
      record: { 'case-amount': 5000, priority: 'Low' },
      condition: "priority === 'Low'",
      expected: true
    },
    {
      name: 'Safety: field slugs with invalid JS characters (hyphens) are still resolvable via record key index',
      record: { 'case-amount': 15000 },
      condition: "record['case-amount'] > 10000",
      expected: true
    },

    // 6. Undefined fields / Default values fallback
    {
      name: 'Undefined fields return false instead of throwing a ReferenceError',
      record: { priority: 'High' },
      condition: "amount > 1000",
      expected: false
    },

    // 7. Empty condition
    {
      name: 'Empty condition expression evaluates to true (unconditional transition)',
      record: { amount: 5000 },
      condition: '',
      expected: true
    },

    // 8. Layout-based slug resolution (Flat Field ID mapping)
    {
      name: 'Layout slug mapping: resolves value via ID from flat structure',
      record: { 'field_cmomx123': 50000 },
      condition: 'value > 5000',
      layout: [
        { id: 'field_cmomx123', name: 'value', label: 'Value' }
      ],
      expected: true
    },
    {
      name: 'Layout slug mapping: backward compatibility with record prefix prefixing',
      record: { 'field_cmomx123': 50000 },
      condition: 'record.value > 5000',
      layout: [
        { id: 'field_cmomx123', name: 'value', label: 'Value' }
      ],
      expected: true
    },
    {
      name: 'Layout slug mapping: resolves value via ID from nested structures',
      record: {
        'group_1': {
          'field_cmomx123': 50000
        }
      },
      condition: 'value > 5000',
      layout: [
        {
          id: 'group_1',
          type: 'fieldGroup',
          fields: [
            { id: 'field_cmomx123', name: 'value', label: 'Value' }
          ]
        }
      ],
      expected: true
    }
  ];

  testCases.forEach((tc, idx) => {
    const result = WorkflowEngine.evaluateCondition(tc.record, tc.condition, (tc as any).layout);
    const passed = result === tc.expected;

    if (passed) {
      passedCount++;
      console.log(`✅ [Test ${idx + 1}] ${tc.name}`);
    } else {
      failedCount++;
      console.error(`❌ [Test ${idx + 1}] ${tc.name}`);
      console.error(`   Condition: "${tc.condition}"`);
      console.error(`   Record:    ${JSON.stringify(tc.record)}`);
      console.error(`   Expected:  ${tc.expected}`);
      console.error(`   Received:  ${result}`);
    }
  });

  console.log(`\n📊 Summary: ${passedCount} passed, ${failedCount} failed.`);
  if (failedCount > 0) {
    process.exit(1);
  } else {
    console.log('🎉 All unit tests passed successfully!');
  }
}

runTests();

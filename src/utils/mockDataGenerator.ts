export interface MockDataOptions {
  count?: number;
  domain?: 'general' | 'crm' | 'hr' | 'projects' | 'finance' | 'healthcare' | 'ecommerce';
  customOverrides?: Record<string, any>;
}

const FIRST_NAMES = [
  'Sophia', 'Jackson', 'Emma', 'Aiden', 'Olivia', 'Lucas', 'Ava', 'Liam',
  'Mia', 'Noah', 'Isabella', 'Ethan', 'Charlotte', 'Mason', 'Amelia', 'Oliver',
  'Harper', 'Elijah', 'Evelyn', 'Logan', 'Abigail', 'James', 'Emily', 'Benjamin'
];

const LAST_NAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson'
];

const COMPANIES = [
  'Acme Global Solutions', 'Apex Technologies', 'Nexus Dynamics', 'Starlight Logistics',
  'Vanguard Enterprises', 'Beacon Analytics', 'Quantum Cloud Inc.', 'Pinnacle Partners',
  'Summit Media Group', 'Blue Horizon Health', 'Aegis Security Labs', 'Horizon Robotics'
];

const DEPARTMENTS = ['Sales', 'Engineering', 'Marketing', 'Product', 'Customer Success', 'Legal', 'Operations', 'Finance', 'Human Resources'];
const JOB_TITLES = ['Account Executive', 'Senior Product Designer', 'Solutions Architect', 'Project Coordinator', 'VP of Growth', 'DevOps Specialist', 'Data Strategist', 'Operations Lead'];
const STREETS = ['104 Market St', '452 Ocean Avenue', '789 Innovation Way', '1250 Broadway Suite 400', '33 Pinecrest Rd', '500 Technology Parkway', '88 River Street'];
const CITIES = ['San Francisco', 'New York', 'Austin', 'Seattle', 'Chicago', 'Denver', 'Boston', 'Sydney', 'London', 'Toronto'];
const STATES = ['CA', 'NY', 'TX', 'WA', 'IL', 'CO', 'MA', 'NSW', 'VIC', 'ON'];
const COUNTRIES = ['United States', 'Australia', 'United Kingdom', 'Canada', 'Germany', 'Singapore'];

const STATUS_SETS: Record<string, string[]> = {
  general: ['Active', 'Pending', 'In Review', 'Completed', 'Archived'],
  crm: ['Lead', 'Qualified', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost'],
  hr: ['Onboarding', 'Active', 'On Leave', 'Contract', 'Offboarded'],
  projects: ['Backlog', 'In Progress', 'In Review', 'Blocked', 'Completed'],
  finance: ['Draft', 'Pending Approval', 'Approved', 'Paid', 'Overdue', 'Cancelled'],
  healthcare: ['Scheduled', 'Checked In', 'In Consultation', 'Discharged', 'Follow-up Required'],
  ecommerce: ['Processing', 'Shipped', 'Delivered', 'Returned', 'Refunded']
};

const SAMPLE_TAGS = ['Urgent', 'Tier 1', 'VIP', 'Enterprise', 'Compliance', 'Q4 Initiative', 'Automated', 'Key Account'];

const randomItem = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const randomInt = (min: number, max: number): number => Math.floor(Math.random() * (max - min + 1)) + min;
const randomFloat = (min: number, max: number, decimals: number = 2): number => {
  const factor = Math.pow(10, decimals);
  return Math.round((Math.random() * (max - min) + min) * factor) / factor;
};

export const generateMockDataset = (
  fields: any[],
  options: MockDataOptions = {}
): any[] => {
  const { count = 10, domain = 'general', customOverrides = {} } = options;
  const rows: any[] = [];
  const statusPool = STATUS_SETS[domain] || STATUS_SETS.general;

  for (let i = 0; i < count; i++) {
    const firstName = randomItem(FIRST_NAMES);
    const lastName = randomItem(LAST_NAMES);
    const fullName = `${firstName} ${lastName}`;
    const company = randomItem(COMPANIES);
    const city = randomItem(CITIES);
    const state = randomItem(STATES);
    const street = randomItem(STREETS);
    const createdDate = new Date(Date.now() - randomInt(1, 180) * 86400000);
    const dueDate = new Date(Date.now() + randomInt(1, 60) * 86400000);

    const record: Record<string, any> = {
      id: `mock-rec-${1000 + i}`,
      _record_key: `AUR-${2000 + i}`,
      createdAt: createdDate.toISOString(),
      updatedAt: new Date(createdDate.getTime() + randomInt(1000, 8640000)).toISOString()
    };

    // First pass: generate static and heuristic values
    fields.forEach((field: any) => {
      if (!field?.id) return;
      if (customOverrides[field.id] !== undefined) {
        record[field.id] = customOverrides[field.id];
        return;
      }

      const label = (field.label || field.name || '').toLowerCase();
      const type = (field.type || 'text').toLowerCase();

      switch (type) {
        case 'text':
        case 'string':
          if (label.includes('first name')) {
            record[field.id] = firstName;
          } else if (label.includes('last name')) {
            record[field.id] = lastName;
          } else if (label.includes('name') || label.includes('contact') || label.includes('client') || label.includes('author')) {
            record[field.id] = fullName;
          } else if (label.includes('company') || label.includes('organization') || label.includes('account') || label.includes('vendor')) {
            record[field.id] = company;
          } else if (label.includes('title') || label.includes('position') || label.includes('role')) {
            record[field.id] = randomItem(JOB_TITLES);
          } else if (label.includes('dept') || label.includes('department')) {
            record[field.id] = randomItem(DEPARTMENTS);
          } else if (label.includes('city')) {
            record[field.id] = city;
          } else if (label.includes('state') || label.includes('province')) {
            record[field.id] = state;
          } else if (label.includes('zip') || label.includes('postal')) {
            record[field.id] = `${randomInt(10000, 99999)}`;
          } else if (label.includes('country')) {
            record[field.id] = randomItem(COUNTRIES);
          } else if (label.includes('street') || label.includes('address')) {
            record[field.id] = street;
          } else if (label.includes('sku') || label.includes('code') || label.includes('ref')) {
            record[field.id] = `SKU-${randomInt(100, 999)}-${randomInt(10, 99)}`;
          } else {
            record[field.id] = `${field.label || 'Item'} ${i + 1}`;
          }
          break;

        case 'textarea':
        case 'richtext':
          if (label.includes('note') || label.includes('comment')) {
            record[field.id] = `Notes from follow-up meeting with ${fullName} regarding project deliverables and milestone sign-off.`;
          } else if (label.includes('desc') || label.includes('summary')) {
            record[field.id] = `Comprehensive requirements breakdown for ${company}. All standard specifications and quality criteria apply.`;
          } else {
            record[field.id] = `Detailed description text for entry ${i + 1}. Contains formatted context and background overview.`;
          }
          break;

        case 'email':
          record[field.id] = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g, '') || 'example'}.com`;
          break;

        case 'phone':
        case 'tel':
          record[field.id] = `+1 (555) ${randomInt(100, 999)}-${randomInt(1000, 9999)}`;
          break;

        case 'number':
          if (label.includes('quantity') || label.includes('qty') || label.includes('units') || label.includes('count')) {
            record[field.id] = randomInt(1, 50);
          } else if (label.includes('year')) {
            record[field.id] = randomInt(2020, 2026);
          } else if (label.includes('age')) {
            record[field.id] = randomInt(22, 65);
          } else if (label.includes('score') || label.includes('point')) {
            record[field.id] = randomInt(50, 100);
          } else {
            record[field.id] = randomInt(10, 1000);
          }
          break;

        case 'currency':
        case 'money':
          if (label.includes('price') || label.includes('rate') || label.includes('unit cost')) {
            record[field.id] = randomFloat(25, 450, 2);
          } else if (label.includes('salary')) {
            record[field.id] = randomInt(65000, 185000);
          } else {
            record[field.id] = randomFloat(500, 25000, 2);
          }
          break;

        case 'percent':
        case 'percentage':
          if (label.includes('discount')) {
            record[field.id] = randomItem([5, 10, 15, 20, 25]);
          } else if (label.includes('tax')) {
            record[field.id] = randomItem([5, 8.25, 10, 12.5]);
          } else {
            record[field.id] = randomInt(10, 100);
          }
          break;

        case 'select':
        case 'radio':
          if (Array.isArray(field.options) && field.options.length > 0) {
            const rawOpt: any = randomItem(field.options);
            record[field.id] = typeof rawOpt === 'object' && rawOpt !== null ? (rawOpt.value || rawOpt.label || rawOpt.id) : rawOpt;
          } else if (label.includes('priority')) {
            record[field.id] = randomItem(['Low', 'Medium', 'High', 'Critical']);
          } else if (label.includes('tier')) {
            record[field.id] = randomItem(['Bronze', 'Silver', 'Gold', 'Platinum']);
          } else {
            record[field.id] = randomItem(statusPool);
          }
          break;

        case 'multiselect':
        case 'tags':
          if (Array.isArray(field.options) && field.options.length > 0) {
            const countToPick = randomInt(1, Math.min(3, field.options.length));
            const shuffled = [...field.options].sort(() => 0.5 - Math.random());
            record[field.id] = shuffled.slice(0, countToPick).map((o: any) => typeof o === 'object' && o !== null ? (o.value || o.label) : o);
          } else {
            const countToPick = randomInt(1, 2);
            record[field.id] = SAMPLE_TAGS.slice(0, countToPick);
          }
          break;

        case 'date':
          if (label.includes('due') || label.includes('target') || label.includes('end') || label.includes('deadline')) {
            record[field.id] = dueDate.toISOString().split('T')[0];
          } else if (label.includes('birth')) {
            const birthYear = randomInt(1975, 2002);
            record[field.id] = `${birthYear}-${String(randomInt(1, 12)).padStart(2, '0')}-${String(randomInt(1, 28)).padStart(2, '0')}`;
          } else {
            record[field.id] = createdDate.toISOString().split('T')[0];
          }
          break;

        case 'datetime':
        case 'timestamp':
          record[field.id] = createdDate.toISOString();
          break;

        case 'checkbox':
        case 'toggle':
        case 'boolean':
          record[field.id] = Math.random() > 0.4;
          break;

        case 'rating':
          record[field.id] = randomInt(3, 5);
          break;

        case 'url':
        case 'website':
          record[field.id] = `https://${company.toLowerCase().replace(/[^a-z]/g, '') || 'aurora'}.com`;
          break;

        case 'user':
        case 'assignee':
        case 'member':
          record[field.id] = {
            id: `usr-${randomInt(10, 99)}`,
            name: fullName,
            email: `${firstName.toLowerCase()}@example.com`,
            avatar: `https://images.unsplash.com/photo-${1534528741775 + i}?w=80&h=80&fit=crop&crop=face`
          };
          break;

        case 'address':
        case 'location':
          record[field.id] = `${street}, ${city}, ${state} ${randomInt(10000, 99999)}`;
          break;

        case 'color':
          record[field.id] = randomItem(['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']);
          break;

        case 'signature':
          record[field.id] = `signed:${fullName}`;
          break;

        default:
          record[field.id] = `${field.label || 'Value'} ${i + 1}`;
      }
    });

    // Second pass: resolve basic arithmetic expressions for calculated / formula fields
    fields.forEach((field: any) => {
      if (field?.type === 'calculated' || field?.formula) {
        try {
          const formulaStr = field.formula || '';
          if (formulaStr) {
            let evalExpr = formulaStr;
            fields.forEach((otherF: any) => {
              if (otherF.id !== field.id && record[otherF.id] !== undefined) {
                const val = typeof record[otherF.id] === 'number' ? record[otherF.id] : `"${record[otherF.id]}"`;
                evalExpr = evalExpr.split(`{${otherF.id}}`).join(val);
                evalExpr = evalExpr.split(`{${otherF.label}}`).join(val);
              }
            });
            if (!/[^0-9\.\+\-\*\/\(\)\s]/.test(evalExpr)) {
              // eslint-disable-next-line no-eval
              const res = Function(`"use strict"; return (${evalExpr})`)();
              if (typeof res === 'number' && !isNaN(res)) {
                record[field.id] = Math.round(res * 100) / 100;
              }
            }
          }
        } catch {
          record[field.id] = 100 + i * 15;
        }
      }
    });

    rows.push(record);
  }

  return rows;
};

export const exportRecordsToCsv = (records: any[], fields: any[], filename: string = 'mock-records.csv') => {
  if (!records || records.length === 0) return;
  const activeFields = fields.filter(f => f.id && !['heading', 'divider', 'spacer', 'card'].includes(f.type));
  
  const headers = ['ID', ...activeFields.map(f => f.label || f.name || f.id), 'Created At'];
  const csvRows: string[] = [];
  csvRows.push(headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(','));

  records.forEach(rec => {
    const row = [
      rec._record_key || rec.id,
      ...activeFields.map(f => {
        const val = rec[f.id];
        if (val === undefined || val === null) return '';
        if (typeof val === 'object') return JSON.stringify(val);
        return String(val);
      }),
      rec.createdAt || ''
    ];
    csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','));
  });

  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

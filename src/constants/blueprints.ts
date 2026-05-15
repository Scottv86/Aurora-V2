import { IndustryBlueprint } from '../types/platform';

export const BLUEPRINTS: IndustryBlueprint[] = [
  {
    id: 'real-estate-bp',
    name: 'Real Estate Portfolio',
    description: 'A complete ecosystem for managing property portfolios, leases, and maintenance workflows.',
    industry: 'Real Estate',
    icon: 'Building',
    config: {
      modules: [
        { templateId: 'assets', category: 'Portfolio' },
        { templateId: 'requests', category: 'Maintenance' },
        { templateId: 'invoices', category: 'Finance' }
      ],
      connections: [
        { sourceModule: 'assets', targetModule: 'requests', type: 'MAINTENANCE_LOG' }
      ]
    },
    dependencies: ['people_org'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'non-profit-bp',
    name: 'Non-Profit Operations',
    description: 'Integrated grant management, donor tracking, and community service intake.',
    industry: 'Non-Profit',
    icon: 'Heart',
    config: {
      modules: [
        { templateId: 'grants', category: 'Funding' },
        { templateId: 'people_org', category: 'Donors' },
        { templateId: 'requests', category: 'Services' }
      ],
      connections: [
        { sourceModule: 'people_org', targetModule: 'grants', type: 'APPLICANT' }
      ]
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

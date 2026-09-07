import { 
  ContentBlock, 
  ContentBlockType, 
  ContentType, 
  ContentBlockCondition, 
  ContentBlockRule, 
  ConditionOperator 
} from '../../types/platform';

export interface FontFamilyConfig {
  id: string;
  name: string;
  label: string;
  family: string;
  category: 'sans' | 'serif' | 'mono';
}

export const FONT_FAMILIES: FontFamilyConfig[] = [
  { id: 'Inter', name: 'Inter', label: 'Inter (Modern Sans)', family: "Inter, -apple-system, BlinkMacSystemFont, sans-serif", category: 'sans' },
  { id: 'Plus Jakarta Sans', name: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans', family: "'Plus Jakarta Sans', -apple-system, sans-serif", category: 'sans' },
  { id: 'Roboto', name: 'Roboto', label: 'Roboto', family: "Roboto, -apple-system, sans-serif", category: 'sans' },
  { id: 'System UI', name: 'System UI', label: 'System UI / SF Pro', family: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif", category: 'sans' },
  { id: 'Merriweather', name: 'Merriweather', label: 'Merriweather (Legal Serif)', family: "Merriweather, Georgia, serif", category: 'serif' },
  { id: 'Playfair Display', name: 'Playfair Display', label: 'Playfair Display (Editorial)', family: "'Playfair Display', Georgia, serif", category: 'serif' },
  { id: 'Source Serif 4', name: 'Source Serif 4', label: 'Source Serif', family: "'Source Serif 4', Georgia, serif", category: 'serif' },
  { id: 'JetBrains Mono', name: 'JetBrains Mono', label: 'JetBrains Mono (Code/Mono)', family: "'JetBrains Mono', monospace", category: 'mono' },
];

export const getFontFamilyCSS = (fontNameOrId?: string, fallback = 'Inter'): string => {
  if (!fontNameOrId) fontNameOrId = fallback;
  const match = FONT_FAMILIES.find(f => f.id.toLowerCase() === fontNameOrId!.toLowerCase() || f.name.toLowerCase() === fontNameOrId!.toLowerCase() || fontNameOrId!.toLowerCase().includes(f.name.toLowerCase()));
  if (match) return match.family;
  return fontNameOrId;
};

/**
 * Retrieve nested object value safely via dot-notation or flat key
 */
export const getNestedValue = (obj: Record<string, any>, path: string): any => {
  if (!obj || !path) return undefined;
  if (obj[path] !== undefined) return obj[path];
  
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
};

/**
 * Evaluates whether a content block condition passes given sample/record data
 */
export const evaluateBlockConditions = (
  condition?: ContentBlockCondition, 
  data: Record<string, any> = {}
): boolean => {
  if (!condition || condition.enabled === false) return true;

  const rules: ContentBlockRule[] = [];
  if (condition.rules && condition.rules.length > 0) {
    rules.push(...condition.rules);
  } else if (condition.field) {
    rules.push({
      id: 'legacy',
      field: condition.field,
      operator: condition.operator || 'equals',
      value: condition.value || ''
    });
  }

  if (rules.length === 0) return true;

  const results = rules.map(rule => {
    const rawVal = getNestedValue(data, rule.field);
    const fieldVal = rawVal !== undefined && rawVal !== null ? String(rawVal).trim() : '';
    const targetVal = (rule.value || '').trim();

    switch (rule.operator) {
      case 'equals':
        return fieldVal.toLowerCase() === targetVal.toLowerCase();
      case 'not_equals':
        return fieldVal.toLowerCase() !== targetVal.toLowerCase();
      case 'contains':
        return fieldVal.toLowerCase().includes(targetVal.toLowerCase());
      case 'not_contains':
        return !fieldVal.toLowerCase().includes(targetVal.toLowerCase());
      case 'greater_than': {
        const numA = parseFloat(fieldVal.replace(/[^0-9.-]+/g, ''));
        const numB = parseFloat(targetVal.replace(/[^0-9.-]+/g, ''));
        return !isNaN(numA) && !isNaN(numB) && numA > numB;
      }
      case 'less_than': {
        const numA = parseFloat(fieldVal.replace(/[^0-9.-]+/g, ''));
        const numB = parseFloat(targetVal.replace(/[^0-9.-]+/g, ''));
        return !isNaN(numA) && !isNaN(numB) && numA < numB;
      }
      case 'is_empty':
        return fieldVal === '';
      case 'is_not_empty':
        return fieldVal !== '';
      default:
        return true;
    }
  });

  const conjunction = condition.conjunction || 'AND';
  if (conjunction === 'OR') {
    return results.some(r => r === true);
  }
  return results.every(r => r === true);
};

/**
 * Format piped variables e.g. {{amount | currency:'USD'}} or {{name | capitalize}}
 */
export const formatPipeValue = (val: any, pipeStr: string): string => {
  const parts = pipeStr.split(':').map(s => s.trim().replace(/^['"]|['"]$/g, ''));
  const pipeName = parts[0]?.toLowerCase();
  const pipeArg = parts[1];

  const strVal = val !== undefined && val !== null ? String(val) : '';

  switch (pipeName) {
    case 'currency': {
      const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
      if (isNaN(num)) return strVal || '$0.00';
      const currencyCode = pipeArg || 'USD';
      try {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: currencyCode }).format(num);
      } catch {
        return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
    }

    case 'number': {
      const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
      if (isNaN(num)) return strVal;
      const decimals = pipeArg ? parseInt(pipeArg, 10) : 2;
      return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }

    case 'percent': {
      const num = parseFloat(strVal.replace(/[^0-9.-]+/g, ''));
      if (isNaN(num)) return strVal;
      return `${(num > 1 ? num : num * 100).toFixed(1)}%`;
    }

    case 'date': {
      if (!strVal) return '';
      const d = new Date(strVal);
      if (isNaN(d.getTime())) return strVal;
      if (pipeArg?.toLowerCase().includes('short')) {
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      }
      return d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    }

    case 'uppercase':
      return strVal.toUpperCase();

    case 'lowercase':
      return strVal.toLowerCase();

    case 'capitalize':
      return strVal.replace(/\b\w/g, l => l.toUpperCase());

    case 'default':
    case 'fallback':
      return strVal.trim() ? strVal : (pipeArg || '');

    case 'trim':
      return strVal.trim();

    default:
      return strVal;
  }
};

/**
 * Resolves all merge tags and piped expressions in a string or HTML
 */
export const evaluateMergePipes = (
  rawText: string, 
  data: Record<string, any> = {}, 
  highlightVariables = false
): string => {
  if (!rawText) return '';

  // Handle repeater blocks [[REPEAT items]]...[[ENDREPEAT]]
  let resolved = rawText.replace(/\[\[REPEAT\s+([\w.]+)\]\]([\s\S]*?)\[\[ENDREPEAT\]\]/gi, (_match, collectionKey, blockContent) => {
    const items = getNestedValue(data, collectionKey);
    if (Array.isArray(items) && items.length > 0) {
      return items.map(item => {
        return evaluateMergePipes(blockContent, item, highlightVariables);
      }).join('');
    }
    const row1 = evaluateMergePipes(blockContent, { item_name: 'Standard Cloud License', item_qty: '5', item_price: '$120.00', item_total: '$600.00' }, highlightVariables);
    const row2 = evaluateMergePipes(blockContent, { item_name: 'Dedicated Support Tier', item_qty: '1', item_price: '$450.00', item_total: '$450.00' }, highlightVariables);
    return row1 + row2;
  });

  // Handle {{field | pipe1:arg | pipe2}} expressions
  resolved = resolved.replace(/\{\{\s*([a-zA-Z0-9_.-]+)(\s*\|[^}]+)?\s*\}\}/g, (_match, fieldKey, pipeChain) => {
    let val = getNestedValue(data, fieldKey);
    if (val === undefined || val === null) {
      val = '';
    }

    if (pipeChain) {
      const pipes = pipeChain.split('|').map((p: string) => p.trim()).filter(Boolean);
      for (const pipe of pipes) {
        val = formatPipeValue(val, pipe);
      }
    } else if (val === '') {
      val = fieldKey.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    }

    if (highlightVariables) {
      return `<span class="inline-block bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 font-semibold px-1.5 py-0.5 rounded border border-indigo-500/30 text-[0.9em]" title="Variable: {{${fieldKey}${pipeChain || ''}}}">${val}</span>`;
    }

    return String(val);
  });

  return resolved;
};

export const createBlockId = () => `blk_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;

export const createBlock = (type: ContentBlockType, initialData: Record<string, any> = {}, initialStyles: Record<string, any> = {}): ContentBlock => {
  const id = createBlockId();
  
  switch (type) {
    case 'heading':
      return {
        id,
        type: 'heading',
        data: {
          text: initialData.text || 'Heading Title',
          level: initialData.level || 'h2',
          ...initialData
        },
        styles: {
          fontSize: initialData.level === 'h1' ? '28px' : initialData.level === 'h3' ? '18px' : '22px',
          fontWeight: '700',
          textColor: '#18181b',
          align: 'left',
          ...initialStyles
        }
      };

    case 'text':
      return {
        id,
        type: 'text',
        data: {
          html: initialData.html || '<p>Enter your content here. You can insert merge tags like {{first_name}} directly into your text.</p>',
          ...initialData
        },
        styles: {
          fontSize: '14px',
          lineHeight: '1.6',
          textColor: '#3f3f46',
          align: 'left',
          ...initialStyles
        }
      };

    case 'letterhead':
      return {
        id,
        type: 'letterhead',
        data: {
          companyName: initialData.companyName || '{{tenant_name}}',
          subtitle: initialData.subtitle || 'Official Corporate Communications',
          dateTag: initialData.dateTag || '{{today_date}}',
          refTag: initialData.refTag || 'DOC-{{record_id}}',
          showLogo: initialData.showLogo !== false,
          accentColor: initialData.accentColor || '#4f46e5',
          ...initialData
        },
        styles: {
          padding: '16px 0',
          borderColor: '#4f46e5',
          ...initialStyles
        }
      };

    case 'signature_block':
      return {
        id,
        type: 'signature_block',
        data: {
          layout: initialData.layout || 'dual',
          disclosingTitle: initialData.disclosingTitle || 'Authorized Signature (Disclosing)',
          disclosingName: initialData.disclosingName || '{{tenant_signer_name}}',
          disclosingSubtitle: initialData.disclosingSubtitle || '{{tenant_signer_title}}',
          receivingTitle: initialData.receivingTitle || 'Authorized Signature (Receiving)',
          receivingName: initialData.receivingName || '{{recipient_name}}',
          receivingSubtitle: initialData.receivingSubtitle || 'Date: ________________________',
          ...initialData
        },
        styles: {
          padding: '24px 0',
          ...initialStyles
        }
      };

    case 'table_repeater':
      return {
        id,
        type: 'table_repeater',
        data: {
          collection: initialData.collection || 'items',
          columns: initialData.columns || [
            { key: 'item_name', title: 'Description / Item', align: 'left', width: '45%' },
            { key: 'item_qty', title: 'Qty', align: 'center', width: '15%' },
            { key: 'item_price', title: 'Unit Price', align: 'right', width: '20%' },
            { key: 'item_total', title: 'Total', align: 'right', width: '20%' }
          ],
          ...initialData
        },
        styles: {
          bgColor: '#f8fafc',
          borderColor: '#e2e8f0',
          padding: '12px',
          ...initialStyles
        }
      };

    case 'callout':
      return {
        id,
        type: 'callout',
        data: {
          title: initialData.title || 'Important Notice',
          message: initialData.message || 'Please review and execute the required terms within 14 business days.',
          variant: initialData.variant || 'info',
          ...initialData
        },
        styles: {
          bgColor: '#eff6ff',
          borderColor: '#3b82f6',
          textColor: '#1e40af',
          borderRadius: '12px',
          padding: '16px',
          ...initialStyles
        }
      };

    case 'hero_banner':
      return {
        id,
        type: 'hero_banner',
        data: {
          title: initialData.title || 'Welcome to {{tenant_name}}',
          subtitle: initialData.subtitle || 'Your enterprise workspace is ready to use.',
          buttonText: initialData.buttonText || 'Access Portal →',
          buttonUrl: initialData.buttonUrl || '{{portal_url}}',
          ...initialData
        },
        styles: {
          bgColor: '#4f46e5',
          textColor: '#ffffff',
          borderRadius: '16px',
          padding: '36px 24px',
          align: 'center',
          ...initialStyles
        }
      };

    case 'grid_2col':
      return {
        id,
        type: 'grid_2col',
        data: {
          col1Title: initialData.col1Title || 'Account Details',
          col1Content: initialData.col1Content || 'ID: {{account_id}}\nStatus: {{status}}',
          col2Title: initialData.col2Title || 'Billing Overview',
          col2Content: initialData.col2Content || 'Plan: Enterprise Pro\nRenewal: {{renewal_date}}',
          ...initialData
        },
        styles: {
          bgColor: '#f4f4f5',
          borderRadius: '12px',
          padding: '16px',
          ...initialStyles
        }
      };

    case 'button':
      return {
        id,
        type: 'button',
        data: {
          text: initialData.text || 'Confirm & Proceed →',
          url: initialData.url || '{{action_url}}',
          variant: initialData.variant || 'primary',
          ...initialData
        },
        styles: {
          bgColor: '#4f46e5',
          textColor: '#ffffff',
          borderRadius: '8px',
          padding: '12px 28px',
          align: 'center',
          fontWeight: '700',
          fontSize: '14px',
          ...initialStyles
        }
      };

    case 'divider':
      return {
        id,
        type: 'divider',
        data: {
          style: initialData.style || 'solid',
          ...initialData
        },
        styles: {
          borderColor: '#e4e4e7',
          padding: '16px 0',
          ...initialStyles
        }
      };

    case 'spacer':
      return {
        id,
        type: 'spacer',
        data: {
          height: initialData.height || 24,
          ...initialData
        },
        styles: {
          padding: '12px 0',
          ...initialStyles
        }
      };

    case 'quote':
      return {
        id,
        type: 'quote',
        data: {
          text: initialData.text || 'Excellence is not an act, but a habit.',
          author: initialData.author || '{{author_name}}',
          ...initialData
        },
        styles: {
          fontSize: '15px',
          textColor: '#475569',
          borderColor: '#6366f1',
          padding: '12px 16px',
          ...initialStyles
        }
      };

    case 'code':
      return {
        id,
        type: 'code',
        data: {
          code: initialData.code || '{\n  "status": "APPROVED",\n  "reference": "{{record_id}}"\n}',
          language: initialData.language || 'json',
          ...initialData
        },
        styles: {
          bgColor: '#18181b',
          textColor: '#a5b4fc',
          fontFamily: "'JetBrains Mono', monospace",
          borderRadius: '10px',
          padding: '16px',
          ...initialStyles
        }
      };

    default:
      return {
        id,
        type: 'text',
        data: { html: '<p>Content block</p>' }
      };
  }
};

/**
 * Generate default starter block list when creating a new template
 */
export const createDefaultBlocksForType = (type: ContentType, tenantName = '{{tenant_name}}'): ContentBlock[] => {
  switch (type) {
    case 'letter':
      return [
        createBlock('letterhead', { companyName: tenantName }),
        createBlock('heading', { text: 'MUTUAL NON-DISCLOSURE AGREEMENT', level: 'h2' }, { align: 'center' }),
        createBlock('text', { 
          html: `<p>This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of <strong>{{createdAt}}</strong>, by and between <strong>${tenantName}</strong> ("Disclosing Party") and <strong>{{recipient_name}}</strong> ("Receiving Party").</p>` 
        }),
        createBlock('heading', { text: '1. Purpose & Scope', level: 'h3' }),
        createBlock('text', { 
          html: `<p>The parties wish to explore a confidential business collaboration concerning <strong>{{project_title}}</strong> and will exchange proprietary information under the terms of this Agreement.</p>` 
        }),
        createBlock('heading', { text: '2. Confidential Information', level: 'h3' }),
        createBlock('text', { 
          html: `<p>All proprietary information marked as Confidential shall remain protected against unauthorized disclosure for a period of two (2) years from effective date.</p>` 
        }),
        createBlock('callout', {
          title: 'Governing Law Notice',
          message: 'This Agreement shall be construed in accordance with the laws of the jurisdiction specified in the Master Services Schedule.'
        }),
        createBlock('signature_block', {
          disclosingTitle: 'Authorized Signature (Disclosing Party)',
          disclosingName: '{{tenant_signer_name}}',
          disclosingSubtitle: '{{tenant_signer_title}}',
          receivingTitle: 'Authorized Signature (Receiving Party)',
          receivingName: '{{recipient_name}}',
          receivingSubtitle: 'Date: ________________________'
        })
      ];

    case 'email':
      return [
        createBlock('hero_banner', {
          title: 'Welcome to Aurora Platform',
          subtitle: 'Your workspace account is now fully provisioned and ready.',
          buttonText: 'Access Workspace →',
          buttonUrl: '{{portal_url}}'
        }),
        createBlock('text', {
          html: `<p>Hello <strong>{{first_name}}</strong>,</p><p>We are delighted to welcome you to the <strong>${tenantName}</strong> workspace. Your team credentials and modules have been activated.</p>`
        }),
        createBlock('grid_2col', {
          col1Title: 'Account Details',
          col1Content: 'User: {{first_name}} {{last_name}}\nEmail: {{email}}',
          col2Title: 'Organization',
          col2Content: 'Tenant: ' + tenantName + '\nRole: Standard User'
        }),
        createBlock('button', {
          text: 'Get Started with Your Dashboard →',
          url: '{{action_url}}'
        }),
        createBlock('divider'),
        createBlock('text', {
          html: `<p style="font-size: 11px; color: #a1a1aa; text-align: center;">© ${tenantName} • 100 Technology Plaza • <a href="{{unsubscribe_url}}" style="color: #71717a;">Notification Preferences</a></p>`
        }, { align: 'center', fontSize: '11px', textColor: '#a1a1aa' })
      ];

    case 'page':
      return [
        createBlock('hero_banner', {
          title: 'System Notice & Announcements',
          subtitle: 'Real-time operational updates and scheduled maintenance info.',
          buttonText: 'View Status Portal →'
        }),
        createBlock('callout', {
          variant: 'info',
          title: 'Scheduled Optimization Window',
          message: 'Automated data processing will undergo routine background optimization this weekend from 11:00 PM to 02:00 AM UTC.'
        }),
        createBlock('heading', { text: 'Frequently Asked Questions', level: 'h3' }),
        createBlock('text', {
          html: `<p><strong>Q: Will portals remain accessible during maintenance?</strong><br />A: Yes, all public intake portals and authenticated forms remain online.</p><p><strong>Q: What should I do if a workflow is delayed?</strong><br />A: Queued tasks automatically resume processing immediately following maintenance completion.</p>`
        })
      ];

    case 'message':
      return [
        createBlock('text', {
          html: `Hi {{first_name}}, this is an update regarding your request #{{record_id}}. Status is now active. Reply YES to confirm or STOP to unsubscribe.`
        })
      ];
  }
};

export interface CompileBlocksOptions {
  globalFont?: string;
  data?: Record<string, any>;
  evaluateConditions?: boolean;
  highlightVariables?: boolean;
}

/**
 * Compiles an array of ContentBlocks into production HTML
 */
export const compileBlocksToHTML = (
  blocks: ContentBlock[], 
  optionsOrFont: string | CompileBlocksOptions = 'Inter, sans-serif'
): string => {
  if (!blocks || blocks.length === 0) return '';

  const options: CompileBlocksOptions = typeof optionsOrFont === 'string'
    ? { globalFont: optionsOrFont }
    : (optionsOrFont || {});

  const globalFont = options.globalFont || 'Inter, sans-serif';
  const data = options.data;
  const shouldEvaluateConditions = options.evaluateConditions && !!data;
  const shouldResolvePipes = !!data;
  const highlightVariables = !!options.highlightVariables;

  // Filter blocks if conditional logic evaluation is active
  const activeBlocks = shouldEvaluateConditions
    ? blocks.filter(b => evaluateBlockConditions(b.conditions, data))
    : blocks;

  const blockHtmls = activeBlocks.map(block => {
    const s = block.styles || {};
    const font = s.fontFamily || globalFont;
    const align = s.align || 'left';
    const color = s.textColor || 'inherit';

    let html = '';

    switch (block.type) {
      case 'heading': {
        const tag = block.data.level || 'h2';
        const size = s.fontSize || (tag === 'h1' ? '28px' : tag === 'h3' ? '18px' : '22px');
        const weight = s.fontWeight || '700';
        html = `<${tag} style="font-family: ${font}; font-size: ${size}; font-weight: ${weight}; text-align: ${align}; color: ${color}; margin: 16px 0 8px 0; line-height: 1.3;">${block.data.text || ''}</${tag}>`;
        break;
      }

      case 'text': {
        const size = s.fontSize || '14px';
        const lineH = s.lineHeight || '1.6';
        html = `<div style="font-family: ${font}; font-size: ${size}; line-height: ${lineH}; text-align: ${align}; color: ${color}; margin: 8px 0;">${block.data.html || ''}</div>`;
        break;
      }

      case 'letterhead': {
        const accent = block.data.accentColor || '#4f46e5';
        html = `<table style="width: 100%; border-collapse: collapse; border-bottom: 2px solid ${accent}; padding-bottom: 16px; margin-bottom: 24px; font-family: ${font};">
  <tr>
    <td style="vertical-align: middle;">
      <h1 style="margin: 0; font-size: 22px; color: #1e1b4b; font-weight: 900; letter-spacing: -0.025em;">${block.data.companyName || '{{tenant_name}}'}</h1>
      <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b;">${block.data.subtitle || 'Official Communications'}</p>
    </td>
    <td style="text-align: right; vertical-align: middle; font-size: 11px; color: #64748b;">
      <p style="margin: 0;">Date: <strong>${block.data.dateTag || '{{today_date}}'}</strong></p>
      <p style="margin: 2px 0 0 0;">Ref: <strong>${block.data.refTag || 'DOC-{{record_id}}'}</strong></p>
    </td>
  </tr>
</table>`;
        break;
      }

      case 'signature_block': {
        html = `<table style="width: 100%; border: none; margin-top: 40px; margin-bottom: 20px; font-family: ${font}; font-size: 13px;">
  <tr>
    <td style="width: 50%; vertical-align: top; padding-right: 20px;">
      <p style="margin-bottom: 40px; color: #475569;">Sincerely,</p>
      <div style="border-top: 1px solid #334155; padding-top: 6px;">
        <p style="margin: 0; font-weight: 700; color: #0f172a;">${block.data.disclosingName || '{{tenant_signer_name}}'}</p>
        <p style="margin: 0; font-size: 11px; color: #64748b;">${block.data.disclosingSubtitle || '{{tenant_signer_title}}'}</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8;">${block.data.disclosingTitle || 'Authorized Signature'}</p>
      </div>
    </td>
    <td style="width: 50%; vertical-align: top; padding-left: 20px;">
      <p style="margin-bottom: 40px; color: #475569;">Acknowledged & Accepted By:</p>
      <div style="border-top: 1px solid #334155; padding-top: 6px;">
        <p style="margin: 0; font-weight: 700; color: #0f172a;">${block.data.receivingName || '{{recipient_name}}'}</p>
        <p style="margin: 0; font-size: 11px; color: #64748b;">${block.data.receivingSubtitle || 'Date: ________________________'}</p>
        <p style="margin: 2px 0 0 0; font-size: 10px; color: #94a3b8;">${block.data.receivingTitle || 'Authorized Signature'}</p>
      </div>
    </td>
  </tr>
</table>`;
        break;
      }

      case 'table_repeater': {
        const cols = block.data.columns || [];
        const colHeaders = cols.map((c: any) => 
          `<th style="padding: 10px; text-align: ${c.align || 'left'}; width: ${c.width || 'auto'}; font-weight: 700; color: #475569;">${c.title}</th>`
        ).join('');

        const colCells = cols.map((c: any) => 
          `<td style="padding: 10px; text-align: ${c.align || 'left'};">{{${c.key}}}</td>`
        ).join('');

        html = `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px; font-family: ${font};">
  <thead>
    <tr style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
      ${colHeaders}
    </tr>
  </thead>
  <tbody>
    [[REPEAT ${block.data.collection || 'items'}]]
    <tr style="border-bottom: 1px solid #f1f5f9;">
      ${colCells}
    </tr>
    [[ENDREPEAT]]
  </tbody>
</table>`;
        break;
      }

      case 'callout': {
        const bg = s.bgColor || '#eff6ff';
        const borderC = s.borderColor || '#3b82f6';
        const textC = s.textColor || '#1e40af';
        html = `<div style="padding: 16px 20px; background: ${bg}; border-left: 4px solid ${borderC}; border-radius: ${s.borderRadius || '0 10px 10px 0'}; margin: 18px 0; color: ${textC}; font-family: ${font};">
  <p style="margin: 0; font-weight: 700; font-size: 14px;">ℹ️ ${block.data.title || 'Important Notice'}</p>
  <p style="margin: 4px 0 0 0; font-size: 13px; opacity: 0.95; line-height: 1.5;">${block.data.message || ''}</p>
</div>`;
        break;
      }

      case 'hero_banner': {
        const bg = s.bgColor || '#4f46e5';
        const textC = s.textColor || '#ffffff';
        const btnText = block.data.buttonText;
        const btnUrl = block.data.buttonUrl || '#';
        html = `<div style="background: ${bg}; padding: ${s.padding || '36px 24px'}; border-radius: ${s.borderRadius || '16px'}; text-align: ${align}; color: ${textC}; margin-bottom: 20px; font-family: ${font};">
  <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.02em;">${block.data.title || ''}</h1>
  <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9; max-width: 500px; margin-left: auto; margin-right: auto;">${block.data.subtitle || ''}</p>
  ${btnText ? `<div style="margin-top: 20px;"><a href="${btnUrl}" style="background: #ffffff; color: ${bg}; padding: 10px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block; font-size: 13px;">${btnText}</a></div>` : ''}
</div>`;
        break;
      }

      case 'grid_2col': {
        const bg = s.bgColor || '#f4f4f5';
        html = `<table style="width: 100%; border-collapse: collapse; margin: 16px 0; font-family: ${font}; font-size: 13px;">
  <tr>
    <td style="width: 50%; padding: 14px; background: ${bg}; border-radius: 10px 0 0 10px; vertical-align: top; border-right: 1px solid #e4e4e7;">
      <p style="margin: 0; font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase;">${block.data.col1Title || 'Column 1'}</p>
      <div style="margin: 6px 0 0 0; line-height: 1.5; white-space: pre-line; color: #18181b;">${block.data.col1Content || ''}</div>
    </td>
    <td style="width: 50%; padding: 14px; background: ${bg}; border-radius: 0 10px 10px 0; vertical-align: top;">
      <p style="margin: 0; font-size: 11px; font-weight: 700; color: #71717a; text-transform: uppercase;">${block.data.col2Title || 'Column 2'}</p>
      <div style="margin: 6px 0 0 0; line-height: 1.5; white-space: pre-line; color: #18181b;">${block.data.col2Content || ''}</div>
    </td>
  </tr>
</table>`;
        break;
      }

      case 'button': {
        const bg = s.bgColor || '#4f46e5';
        const textC = s.textColor || '#ffffff';
        const radius = s.borderRadius || '8px';
        const padding = s.padding || '12px 28px';
        html = `<div style="margin: 24px 0; text-align: ${align}; font-family: ${font};">
  <a href="${block.data.url || '#'}" style="background: ${bg}; color: ${textC}; padding: ${padding}; border-radius: ${radius}; font-weight: 700; text-decoration: none; display: inline-block; font-size: 14px;">${block.data.text || 'Action Button'}</a>
</div>`;
        break;
      }

      case 'divider': {
        const style = block.data.style || 'solid';
        const borderC = s.borderColor || '#e4e4e7';
        html = `<hr style="border: none; border-top: 1px ${style} ${borderC}; margin: 24px 0;" />`;
        break;
      }

      case 'spacer': {
        const h = block.data.height || 24;
        html = `<div style="height: ${h}px;" />`;
        break;
      }

      case 'quote': {
        const textC = s.textColor || '#475569';
        const borderC = s.borderColor || '#6366f1';
        html = `<blockquote style="border-left: 3px solid ${borderC}; padding: 8px 16px; margin: 16px 0; font-style: italic; color: ${textC}; font-family: ${font};">
  <p style="margin: 0; font-size: 15px;">"${block.data.text || ''}"</p>
  ${block.data.author ? `<footer style="margin-top: 4px; font-size: 12px; font-weight: 600; color: #64748b;">— ${block.data.author}</footer>` : ''}
</blockquote>`;
        break;
      }

      case 'code': {
        const bg = s.bgColor || '#18181b';
        const textC = s.textColor || '#a5b4fc';
        html = `<pre style="background: ${bg}; color: ${textC}; padding: 14px; border-radius: 10px; font-family: 'JetBrains Mono', monospace; font-size: 12px; overflow-x: auto; margin: 16px 0;"><code>${(block.data.code || '').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>`;
        break;
      }

      default:
        html = '';
    }

    if (shouldResolvePipes && html) {
      return evaluateMergePipes(html, data, highlightVariables);
    }
    return html;
  });

  return `<div style="font-family: ${globalFont};">${blockHtmls.filter(Boolean).join('\n')}</div>`;
};

/**
 * Parses raw HTML string into structured ContentBlock array
 */
export const parseHTMLToInitialBlocks = (html: string, contentType: ContentType): ContentBlock[] => {
  if (!html || !html.trim()) {
    return createDefaultBlocksForType(contentType);
  }

  return [
    createBlock('text', { html: html.trim() })
  ];
};

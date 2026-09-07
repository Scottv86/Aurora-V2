import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Plus, 
  X, 
  Variable, 
  Type as TypeIcon, 
  Table as TableIcon, 
  Sparkles,
  Mail,
  FileText,
  Globe,
  MessageSquare,
  Smartphone,
  Monitor,
  Tablet,
  Layout,
  MousePointerClick,
  Columns,
  Minus,
  PenTool,
  AlertCircle,
  Layers,
  Check,
  Sun,
  Moon,
  Sliders,
  Printer,
  RotateCcw,
  ShieldCheck,
  Tag,
  Wand2,
  Scale,
  Scissors,
  PanelRightClose,
  ChevronRight,
  Heading,
  Quote,
  Code,
  ArrowUpDown,
  Building2,
  Users,
  Briefcase,
  DollarSign,
  Calendar,
  Boxes,
  Search,
  Zap,
  Filter,
  ChevronDown,
  Database
} from 'lucide-react';
import { cn } from '../lib/utils';
import { 
  DocumentTemplate, 
  ContentType, 
  ContentMetadata, 
  ContentBlock, 
  ContentBlockType,
  ContentBlockCondition
} from '../types/platform';
import { DocumentService } from '../services/documentService';
import { executeServerCompletion } from '../services/aiService';
import { usePlatform } from '../hooks/usePlatform';
import { useTheme } from '../hooks/useTheme';
import { toast } from 'sonner';
import { UnsavedChangesModal } from './Common/UnsavedChangesModal';
import { BlockCanvas } from './ContentBuilder/BlockCanvas';
import { BlockSettingsDrawer } from './ContentBuilder/BlockSettingsDrawer';
import { 
  compileBlocksToHTML, 
  createBlock, 
  createDefaultBlocksForType, 
  parseHTMLToInitialBlocks, 
  FONT_FAMILIES,
  getFontFamilyCSS,
  evaluateMergePipes
} from './ContentBuilder/contentCompiler';

interface DocumentTemplateBuilderProps {
  template?: DocumentTemplate;
  initialType?: ContentType;
  moduleId?: string;
  onSave?: (template: DocumentTemplate) => void;
  onCancel?: () => void;
}

export const DocumentTemplateBuilder: React.FC<DocumentTemplateBuilderProps> = ({
  template,
  initialType = 'letter',
  moduleId,
  onSave,
  onCancel
}) => {
  const { currentTenant: tenant, user, setIsBuilderFullscreen } = usePlatform();
  const { theme } = useTheme();

  // Make the builder fullscreen across the viewport on mount and restore on unmount
  useEffect(() => {
    setIsBuilderFullscreen(true);
    return () => {
      setIsBuilderFullscreen(false);
    };
  }, [setIsBuilderFullscreen]);

  // Primary document state
  const [name, setName] = useState(template?.name || '');
  const [contentType, setContentType] = useState<ContentType>(template?.type || initialType);
  const [status, setStatus] = useState<'draft' | 'published'>(template?.status || 'draft');
  const [globalFont, setGlobalFont] = useState<string>(template?.fontFamily || 'Inter');

  // Studio tabs & viewports
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const [leftSidebarTab, setLeftSidebarTab] = useState<'blocks' | 'schema'>('blocks');
  const [schemaSearchQuery, setSchemaSearchQuery] = useState('');
  const [selectedPipePreset, setSelectedPipePreset] = useState<string>('none');
  const [expandedSchemaGroups, setExpandedSchemaGroups] = useState<Record<string, boolean>>({
    tenant: true,
    contact: true,
    account: true,
    deal: true,
    today: true,
    items: false
  });
  const [viewport, setViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>(() => theme || 'dark');

  // Modular Blocks state
  const [blocks, setBlocks] = useState<ContentBlock[]>(() => {
    if (template?.blocks && template.blocks.length > 0) {
      return template.blocks;
    }
    if (template?.content && template.content.trim()) {
      return parseHTMLToInitialBlocks(template.content, template.type || initialType || 'letter');
    }
    return createDefaultBlocksForType(template?.type || initialType || 'letter');
  });

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [showBlockSettings, setShowBlockSettings] = useState<boolean>(false);

  useEffect(() => {
    if (theme) {
      setPreviewMode(theme);
    }
  }, [theme]);

  // Type-specific metadata
  const [metadata, setMetadata] = useState<ContentMetadata>(() => ({
    subject: template?.metadata?.subject || '',
    preheader: template?.metadata?.preheader || '',
    senderName: template?.metadata?.senderName || tenant?.name || 'Aurora Team',
    replyTo: template?.metadata?.replyTo || 'support@aurora.io',
    paperSize: template?.metadata?.paperSize || 'A4',
    orientation: template?.metadata?.orientation || 'portrait',
    showLetterhead: template?.metadata?.showLetterhead ?? true,
    slug: template?.metadata?.slug || '',
    containerWidth: template?.metadata?.containerWidth || 'contained',
    seoTitle: template?.metadata?.seoTitle || '',
    channel: template?.metadata?.channel || 'sms',
    maxChars: template?.metadata?.maxChars || 160,
    ...template?.metadata
  }));

  // Interactive Preview & Condition Evaluation Sample Data
  const [highlightVariables, setHighlightVariables] = useState(false);
  const [evaluateConditionLogic, setEvaluateConditionLogic] = useState(true);
  const [sampleData, setSampleData] = useState<Record<string, any>>({
    tenant_name: tenant?.name || 'Acme Global Enterprises',
    tenant_signer_name: user?.name || 'David Vance',
    tenant_signer_title: 'Chief Operating Officer',
    'tenant.name': tenant?.name || 'Acme Global Enterprises',
    'tenant.domain': 'acme-enterprise.io',
    'tenant.phone': '+1 (800) 555-0199',
    'tenant.address': '100 Tech Blvd, Suite 400, Austin, TX',
    'tenant.tax_id': 'US-94-8219481',
    recipient_name: 'Sarah Jenkins',
    recipient_organization: 'Nexus Technologies Ltd',
    recipient_address: '452 Innovation Blvd, Suite 300, San Francisco, CA',
    first_name: 'Sarah',
    last_name: 'Jenkins',
    name: 'Sarah Jenkins',
    email: 's.jenkins@nexustech.io',
    email_address: 's.jenkins@nexustech.io',
    phone_number: '+1 (555) 234-5678',
    'contact.first_name': 'Sarah',
    'contact.last_name': 'Jenkins',
    'contact.email': 's.jenkins@nexustech.io',
    'contact.phone': '+1 (555) 234-5678',
    'contact.title': 'VP of Infrastructure',
    'contact.department': 'Engineering',
    'contact.role': 'Executive Decision Maker',
    organization: 'Nexus Technologies Ltd',
    organization_name: 'Nexus Technologies Ltd',
    account_name: 'Nexus Enterprise Pro',
    account_id: 'ACC-98214',
    'account.name': 'Nexus Technologies Ltd',
    'account.id': 'ACC-98214',
    'account.tier': 'Enterprise',
    'account.status': 'Active',
    'account.industry': 'Cloud Software',
    'account.annual_revenue': '12500000',
    project_title: 'Project Aurora Horizon',
    'deal.title': 'Annual Enterprise Cloud Agreement',
    'deal.amount': '48500',
    'deal.stage': 'Closed Won',
    'deal.close_date': '2026-09-30',
    'deal.currency': 'USD',
    'invoice.number': 'INV-2026-0491',
    'invoice.total': '12450',
    'invoice.status': 'Paid',
    'invoice.due_date': '2026-10-15',
    button_url: '#',
    portal_link: '#',
    action_link: '#',
    header_title: 'Quarterly Operations Summary',
    header_subtitle: 'Overview of performance and compliance metrics',
    status: 'Active',
    record_id: 'REC-2026-8492',
    'record.id': 'REC-2026-8492',
    createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    today_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    current_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    'today.year': '2026',
    'today.month': 'September',
    item_name: 'Enterprise Cloud License',
    item_qty: '1',
    item_price: '2400',
    item_total: '2400',
    'items.item_name': 'Enterprise Cloud License',
    'items.item_qty': '1',
    'items.item_price': '2400',
    'items.item_total': '2400',
    unsubscribe_url: '#',
  });

  // Helper to compile live preview HTML from blocks with conditional logic & pipe resolving
  const compiledPreviewHTML = useMemo(() => {
    return compileBlocksToHTML(blocks, {
      globalFont,
      data: sampleData,
      evaluateConditions: evaluateConditionLogic,
      highlightVariables
    });
  }, [blocks, globalFont, sampleData, evaluateConditionLogic, highlightVariables]);

  // AI & Editor state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiTone, setAiTone] = useState<'professional' | 'formal' | 'friendly' | 'urgent'>('professional');
  const [showAiSidebar, setShowAiSidebar] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [showUnsavedConfirm, setShowUnsavedConfirm] = useState(false);
  const [copiedTag, setCopiedTag] = useState<string | null>(null);
  const isInitializedRef = React.useRef(false);

  // Suggestions tailored to content type
  const aiSuggestions = useMemo(() => {
    switch (contentType) {
      case 'email':
        return [
          { label: 'Welcome Onboarding', prompt: 'Create an engaging customer onboarding welcome email with credentials overview, portal action button, and support contact.' },
          { label: 'Account Verification', prompt: 'Draft a security-focused account verification email with 6-digit one-time code and link.' },
          { label: 'Monthly Digest', prompt: 'Create an executive monthly activity digest with 2-column metrics grid and status report.' },
          { label: 'Payment Receipt', prompt: 'Design a clean transactional payment confirmation email with receipt breakdown and invoice download link.' }
        ];
      case 'letter':
        return [
          { label: 'Mutual NDA', prompt: 'Create a comprehensive mutual non-disclosure agreement with 2-year confidentiality period, definition of proprietary assets, and dual signature blocks.' },
          { label: 'Employment Offer', prompt: 'Draft a formal full-time employment offer letter specifying title, annual compensation, benefits commencement, and acceptance signature lines.' },
          { label: 'SLA Contract', prompt: 'Draft a professional SLA contract with uptime guarantees, response windows, and escalation tiers.' },
          { label: 'Termination Notice', prompt: 'Draft a formal vendor service termination notice citing contractual notice period and asset return terms.' }
        ];
      case 'page':
        return [
          { label: 'Maintenance Banner', prompt: 'Create a stylish service maintenance announcement banner with scheduled window, affected systems list, and emergency support.' },
          { label: 'FAQ Section', prompt: 'Build a comprehensive 4-question frequently asked questions section with clear accordion-style layout.' },
          { label: 'Terms Update', prompt: 'Draft a terms of service and compliance update page informing users of privacy policy enhancements.' },
          { label: 'Feature Launch', prompt: 'Create a new feature release announcement page with highlight cards and call-to-action.' }
        ];
      case 'message':
        return [
          { label: 'Appointment Reminder', prompt: 'Write an SMS appointment reminder asking user to reply YES to confirm or NO to reschedule.' },
          { label: '2FA Code Alert', prompt: 'Write a secure SMS verification message with {{code}} valid for 10 minutes.' },
          { label: 'Urgent Dispatch', prompt: 'Write a high-priority dispatch notice informing user of status update #{{record_id}}.' }
        ];
    }
  }, [contentType]);

  // Block Manipulation Handlers
  const handleUpdateBlockData = (id: string, newData: Record<string, any>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, data: { ...b.data, ...newData } } : b));
  };

  const handleUpdateBlockStyles = (id: string, newStyles: Record<string, any>) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, styles: { ...b.styles, ...newStyles } } : b));
  };

  const handleReorderBlocks = (newBlocks: ContentBlock[]) => {
    setBlocks(newBlocks);
  };

  const handleInsertBlock = (type: ContentBlockType, atIndex?: number) => {
    const newBlock = createBlock(type);
    setBlocks(prev => {
      if (typeof atIndex === 'number' && atIndex >= 0 && atIndex <= prev.length) {
        const next = [...prev];
        next.splice(atIndex, 0, newBlock);
        return next;
      }
      return [...prev, newBlock];
    });
    setSelectedBlockId(newBlock.id);
    toast.success(`Added ${type.replace('_', ' ')} block`);
  };

  const handleDuplicateBlock = (id: string) => {
    const blockIndex = blocks.findIndex(b => b.id === id);
    if (blockIndex === -1) return;
    const original = blocks[blockIndex];
    const duplicated: ContentBlock = {
      ...original,
      id: `block_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      data: JSON.parse(JSON.stringify(original.data))
    };
    setBlocks(prev => {
      const next = [...prev];
      next.splice(blockIndex + 1, 0, duplicated);
      return next;
    });
    setSelectedBlockId(duplicated.id);
    toast.success('Block duplicated');
  };

  const handleDeleteBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
    if (selectedBlockId === id) {
      setSelectedBlockId(null);
      setShowBlockSettings(false);
    }
    toast.success('Block removed');
  };

  const handleOpenSettings = (id: string) => {
    setSelectedBlockId(id);
    setShowBlockSettings(true);
  };

  const handleInsertTag = (tag: string) => {
    if (selectedBlockId) {
      const activeBlock = blocks.find(b => b.id === selectedBlockId);
      if (activeBlock) {
        if (typeof activeBlock.data.text === 'string') {
          handleUpdateBlockData(selectedBlockId, { text: activeBlock.data.text + ' ' + tag });
          toast.success(`Inserted ${tag} into active block`);
          return;
        } else if (typeof activeBlock.data.content === 'string') {
          handleUpdateBlockData(selectedBlockId, { content: activeBlock.data.content + ' ' + tag });
          toast.success(`Inserted ${tag} into active block`);
          return;
        }
      }
    }
    const newBlock = createBlock('text', { text: `Dynamic Value: ${tag}` });
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    toast.success(`Added text block with ${tag}`);
  };

  const handleAIRefine = async (instruction: string) => {
    if (blocks.length === 0) {
      toast.error('No content blocks to refine yet. Add blocks or generate content first.');
      return;
    }
    setIsGenerating(true);
    try {
      const currentHTML = compileBlocksToHTML(blocks, globalFont);
      const systemPrompt = `You are an expert copywriter and document designer for enterprise software.
Refine the provided ${contentType.toUpperCase()} HTML according to this instruction: "${instruction}".
Selected tone: ${aiTone.toUpperCase()}.
Preserve all HTML block structure, inline styling, and existing merge variables like {{first_name}}, {{tenant_name}}, {{recipient_name}}.
Return ONLY the refined HTML, without markdown fences or additional explanation.`;

      const res = await executeServerCompletion(currentHTML, systemPrompt, 'text/plain');
      if (res && res.trim()) {
        const refinedBlocks = parseHTMLToInitialBlocks(res.trim(), contentType);
        setBlocks(refinedBlocks);
        toast.success(`Content refined: ${instruction}`);
      }
    } catch (error) {
      console.error('Error refining content:', error);
      toast.error('Failed to refine content');
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isInitializedRef.current) {
      setIsDirty(true);
    }
  }, [name, blocks, globalFont, status, contentType, metadata]);

  useEffect(() => {
    setTimeout(() => {
      isInitializedRef.current = true;
      setIsDirty(false);
    }, 150);
  }, [template]);

  // Default starter templates if switching type on new items
  const handleTypeChange = (newType: ContentType) => {
    setContentType(newType);
    const defaultBlocks = createDefaultBlocksForType(newType);
    setBlocks(defaultBlocks);
    setSelectedBlockId(null);
    setShowBlockSettings(false);
  };

  // Modular Block Library Options
  const blockLibraryItems = useMemo(() => [
    { type: 'heading' as ContentBlockType, label: 'Section Heading', icon: Heading, description: 'Title or section divider' },
    { type: 'text' as ContentBlockType, label: 'Rich Text Body', icon: TypeIcon, description: 'Formatted paragraph text' },
    { type: 'letterhead' as ContentBlockType, label: 'Official Letterhead', icon: Layout, description: 'Organization logo & date' },
    { type: 'signature_block' as ContentBlockType, label: 'Dual Signatures', icon: PenTool, description: 'Signer & counter-signer lines' },
    { type: 'table_repeater' as ContentBlockType, label: 'Repeater Table', icon: TableIcon, description: 'Dynamic line-item grid' },
    { type: 'callout' as ContentBlockType, label: 'Notice & Callout', icon: AlertCircle, description: 'Highlighted info or warning' },
    { type: 'hero_banner' as ContentBlockType, label: 'Hero Banner', icon: Layout, description: 'High-impact color banner' },
    { type: 'grid_2col' as ContentBlockType, label: '2-Column Summary', icon: Columns, description: 'Side-by-side key-values' },
    { type: 'button' as ContentBlockType, label: 'Action Button / CTA', icon: MousePointerClick, description: 'Styled portal link button' },
    { type: 'quote' as ContentBlockType, label: 'Blockquote', icon: Quote, description: 'Highlighted quotation' },
    { type: 'code' as ContentBlockType, label: 'Code Snippet', icon: Code, description: 'Monospace payload or script' },
    { type: 'divider' as ContentBlockType, label: 'Divider Line', icon: Minus, description: 'Horizontal boundary line' },
    { type: 'spacer' as ContentBlockType, label: 'Vertical Spacer', icon: ArrowUpDown, description: 'Adjustable blank spacing' },
  ], []);

  const handleUpdateBlockConditions = (id: string, newConditions: ContentBlockCondition) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, conditions: newConditions } : b));
  };

  // Schema Categories & Merge Field Explorer Model
  const SCHEMA_CATEGORIES = useMemo(() => [
    {
      id: 'tenant',
      title: 'Organization & Workspace',
      icon: Building2,
      fields: [
        { key: 'tenant_name', label: 'Company / Tenant Name', sample: 'Acme Global Enterprises', type: 'string' },
        { key: 'tenant.domain', label: 'Primary Domain', sample: 'acme-enterprise.io', type: 'string' },
        { key: 'tenant.phone', label: 'Support Phone', sample: '+1 (800) 555-0199', type: 'string' },
        { key: 'tenant.address', label: 'Headquarters Address', sample: '100 Tech Blvd, Suite 400', type: 'string' },
        { key: 'tenant.tax_id', label: 'Tax Identification Number', sample: 'US-94-8219481', type: 'string' },
        { key: 'tenant_signer_name', label: 'Corporate Signatory Name', sample: 'David Vance', type: 'string' },
        { key: 'tenant_signer_title', label: 'Corporate Signatory Title', sample: 'Chief Operating Officer', type: 'string' },
      ]
    },
    {
      id: 'contact',
      title: 'Recipient & Contact',
      icon: Users,
      fields: [
        { key: 'first_name', label: 'First Name', sample: 'Sarah', type: 'string' },
        { key: 'last_name', label: 'Last Name', sample: 'Jenkins', type: 'string' },
        { key: 'recipient_name', label: 'Full Recipient Name', sample: 'Sarah Jenkins', type: 'string' },
        { key: 'email', label: 'Email Address', sample: 's.jenkins@nexustech.io', type: 'string' },
        { key: 'phone_number', label: 'Phone Number', sample: '+1 (555) 234-5678', type: 'string' },
        { key: 'contact.title', label: 'Job Title / Designation', sample: 'VP of Infrastructure', type: 'string' },
        { key: 'contact.department', label: 'Department', sample: 'Engineering', type: 'string' },
        { key: 'contact.role', label: 'CRM Buying Role', sample: 'Executive Decision Maker', type: 'string' },
        { key: 'recipient_organization', label: 'Client Organization', sample: 'Nexus Technologies Ltd', type: 'string' },
        { key: 'recipient_address', label: 'Physical Billing Address', sample: '452 Innovation Blvd, Suite 300', type: 'string' }
      ]
    },
    {
      id: 'account',
      title: 'Account & CRM Criteria',
      icon: Briefcase,
      fields: [
        { key: 'account_name', label: 'Account Name', sample: 'Nexus Enterprise Pro', type: 'string' },
        { key: 'account_id', label: 'Account CRM Identifier', sample: 'ACC-98214', type: 'string' },
        { key: 'account.tier', label: 'Service / License Tier', sample: 'Enterprise', type: 'string' },
        { key: 'account.status', label: 'Account Status', sample: 'Active', type: 'string' },
        { key: 'account.industry', label: 'Industry Vertical', sample: 'Cloud Software', type: 'string' },
        { key: 'account.annual_revenue', label: 'Annual Revenue', sample: '12500000', type: 'currency' },
      ]
    },
    {
      id: 'deal',
      title: 'Deals & Commercials',
      icon: DollarSign,
      fields: [
        { key: 'project_title', label: 'Project / Subject Title', sample: 'Project Aurora Horizon', type: 'string' },
        { key: 'deal.title', label: 'Deal / Opportunity Name', sample: 'Annual Enterprise Cloud License', type: 'string' },
        { key: 'deal.amount', label: 'Deal Value / Amount', sample: '48500', type: 'currency' },
        { key: 'deal.stage', label: 'Deal Pipeline Stage', sample: 'Closed Won', type: 'string' },
        { key: 'deal.currency', label: 'Deal Currency', sample: 'USD', type: 'string' },
        { key: 'invoice.number', label: 'Invoice Reference', sample: 'INV-2026-0491', type: 'string' },
        { key: 'invoice.total', label: 'Invoice Amount Due', sample: '12450', type: 'currency' },
        { key: 'invoice.status', label: 'Invoice Payment Status', sample: 'Paid', type: 'string' },
      ]
    },
    {
      id: 'today',
      title: 'Date & System Macros',
      icon: Calendar,
      fields: [
        { key: 'today_date', label: 'Current Date (Standard)', sample: '07 Sep 2026', type: 'date' },
        { key: 'createdAt', label: 'Record Created Date', sample: 'September 7, 2026', type: 'date' },
        { key: 'today.year', label: 'Current Year Macro', sample: '2026', type: 'string' },
        { key: 'today.month', label: 'Current Month Name', sample: 'September', type: 'string' },
        { key: 'record_id', label: 'Current Record ID', sample: 'REC-2026-8492', type: 'string' },
        { key: 'status', label: 'Record Status', sample: 'Active', type: 'string' },
      ]
    },
    {
      id: 'items',
      title: 'Relational Repeating Items',
      icon: Boxes,
      fields: [
        { key: 'items.item_name', label: 'Line Item Name', sample: 'Enterprise Cloud License', type: 'string' },
        { key: 'items.item_qty', label: 'Line Item Quantity', sample: '1', type: 'number' },
        { key: 'items.item_price', label: 'Unit Price', sample: '2400', type: 'currency' },
        { key: 'items.item_total', label: 'Line Total', sample: '2400', type: 'currency' },
      ]
    }
  ], []);

  const PIPE_PRESETS = useMemo(() => [
    { id: 'none', label: 'Raw Token', suffix: '', description: 'Direct unformatted value' },
    { id: 'currency', label: 'Currency ($)', suffix: " | currency:'USD'", description: 'Format as $12,450.00' },
    { id: 'date_long', label: 'Date (Long)', suffix: " | date:'long'", description: 'September 7, 2026' },
    { id: 'date_short', label: 'Date (Short)', suffix: " | date:'short'", description: 'Sep 7, 2026' },
    { id: 'uppercase', label: 'Uppercase', suffix: ' | uppercase', description: 'UPPERCASE' },
    { id: 'capitalize', label: 'Capitalize', suffix: ' | capitalize', description: 'Capitalized Name' },
    { id: 'default', label: 'Fallback Default', suffix: " | default:'Valued Client'", description: 'Fallback text if empty' },
    { id: 'percent', label: 'Percentage (%)', suffix: ' | percent', description: 'Format as 15.0%' },
    { id: 'number', label: 'Number (2 dec)', suffix: ' | number:2', description: '1,250.00' },
  ], []);

  const toggleSchemaGroup = (groupId: string) => {
    setExpandedSchemaGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  const copyMergeTag = (key: string) => {
    const pipe = PIPE_PRESETS.find(p => p.id === selectedPipePreset);
    const pipeSuffix = pipe ? pipe.suffix : '';
    const tag = `{{${key}${pipeSuffix}}}`;
    handleInsertTag(tag);
    setCopiedTag(key);
    setTimeout(() => setCopiedTag(null), 1500);
  };

  const handleSave = async () => {
    const tenantId = tenant?.id || 'default';
    const userId = user?.id || 'user';
    if (!name.trim()) {
      toast.error('Please enter a content title');
      return;
    }

    try {
      const compiledHTML = compileBlocksToHTML(blocks, globalFont);
      const savedTemplate = await DocumentService.saveTemplate(tenantId, {
        ...template,
        name,
        type: contentType,
        content: compiledHTML,
        blocks,
        fontFamily: globalFont,
        metadata,
        status,
        moduleId,
        createdBy: userId
      });
      setIsDirty(false);
      toast.success('Content saved successfully');
      onSave?.(savedTemplate);
    } catch (error) {
      console.error('Error saving content:', error);
      toast.error('Failed to save content');
    }
  };

  const handleAIGenerate = async () => {
    if (!aiPrompt.trim()) {
      toast.error('Please describe what you want to generate');
      return;
    }

    setIsGenerating(true);
    try {
      const typeInstructions: Record<ContentType, string> = {
        email: 'Design an engaging, responsive HTML email template with header banner, body copy, 2-column highlights, CTA button, and footer.',
        letter: 'Design a formal, structured printable HTML letter or agreement with letterhead, recipient address, contractual terms, and dual signature blocks.',
        page: 'Design a clean, modern web/portal snippet with hero section, cards grid, and notice callouts.',
        message: 'Write a concise SMS text (under 160 characters) with placeholders like {{first_name}} and {{portal_url}}.'
      };

      const systemPrompt = `You are a professional content and document designer for enterprise business software.
Format your output as valid JSON with:
{
  "name": "Concise descriptive title",
  "content": "HTML or plain text depending on format",
  "subject": "Email subject line if applicable"
}
Target Content Type: ${contentType.toUpperCase()}
Rule: ${typeInstructions[contentType]}`;

      const res = await executeServerCompletion(aiPrompt, systemPrompt, 'application/json');
      const parsed = JSON.parse(res);
      if (parsed.name) setName(parsed.name);
      if (parsed.subject && contentType === 'email') {
        setMetadata(prev => ({ ...prev, subject: parsed.subject }));
      }
      if (parsed.content) {
        const generatedBlocks = parseHTMLToInitialBlocks(parsed.content, contentType);
        setBlocks(generatedBlocks);
      }
      toast.success('Content generated with AI');
    } catch (error) {
      console.error('Error generating with AI:', error);
      toast.error('Failed to generate content with AI');
    } finally {
      setIsGenerating(false);
    }
  };

  // Selected block reference for inspector drawer
  const selectedBlock = useMemo(() => {
    return blocks.find(b => b.id === selectedBlockId) || null;
  }, [blocks, selectedBlockId]);

  // SMS character and segment calculation
  const compiledContent = useMemo(() => compileBlocksToHTML(blocks, globalFont), [blocks, globalFont]);
  const smsCharCount = compiledContent.replace(/<[^>]*>?/gm, '').length;
  const smsSegments = Math.ceil(smsCharCount / 160) || 1;

  return (
    <div className="flex flex-col bg-zinc-950 text-zinc-200 h-screen overflow-hidden">
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md shadow-sm shrink-0 z-30">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (isDirty) setShowUnsavedConfirm(true);
              else onCancel?.();
            }}
            className="p-2 hover:bg-zinc-800 rounded-xl transition-colors text-zinc-400 hover:text-white cursor-pointer"
            title="Close Builder"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Content Title or Name..."
              className="font-bold text-white bg-transparent border-none focus:ring-0 p-0 placeholder-zinc-600 text-base transition-all focus:outline-none"
            />
            <span className="text-[10px] text-zinc-500 font-mono">
              Type: {contentType.toUpperCase()} • {blocks.length} Blocks • v{template?.version || 1}
            </span>
          </div>

          {/* Type Switcher Pills */}
          <div className="hidden lg:flex items-center gap-1 bg-zinc-900 border border-zinc-800 p-1 rounded-xl ml-2">
            {[
              { id: 'email', label: 'Email', icon: Mail },
              { id: 'letter', label: 'Letter / Doc', icon: FileText },
              { id: 'page', label: 'Site Page', icon: Globe },
              { id: 'message', label: 'SMS / Msg', icon: MessageSquare }
            ].map(item => {
              const Icon = item.icon;
              const isActive = contentType === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleTypeChange(item.id as ContentType)}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer",
                    isActive 
                      ? "bg-indigo-600 text-white shadow-sm" 
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  )}
                >
                  <Icon size={13} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Global Font Family Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-900 border border-zinc-800 px-2 py-1.5 rounded-lg" title="Document Font Family">
            <TypeIcon size={13} className="text-zinc-400 shrink-0" />
            <select
              value={globalFont}
              onChange={(e) => setGlobalFont(e.target.value)}
              className="bg-transparent text-xs font-bold text-zinc-200 border-none focus:outline-none cursor-pointer pr-2"
            >
              {FONT_FAMILIES.map(f => (
                <option key={f.id} value={f.id} className="bg-zinc-900 text-zinc-200">
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          {/* Viewport controls for Email & Page */}
          {(contentType === 'email' || contentType === 'page') && (
            <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 p-1 rounded-lg">
              <button
                onClick={() => setViewport('desktop')}
                className={cn("p-1.5 rounded text-xs transition-colors cursor-pointer", viewport === 'desktop' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
                title="Desktop View"
              >
                <Monitor size={14} />
              </button>
              {contentType === 'page' && (
                <button
                  onClick={() => setViewport('tablet')}
                  className={cn("p-1.5 rounded text-xs transition-colors cursor-pointer", viewport === 'tablet' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
                  title="Tablet View"
                >
                  <Tablet size={14} />
                </button>
              )}
              <button
                onClick={() => setViewport('mobile')}
                className={cn("p-1.5 rounded text-xs transition-colors cursor-pointer", viewport === 'mobile' ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-300")}
                title="Mobile View"
              >
                <Smartphone size={14} />
              </button>
            </div>
          )}

          {/* Canvas Preview Theme Toggle */}
          <button
            onClick={() => setPreviewMode(prev => prev === 'dark' ? 'light' : 'dark')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
              previewMode === 'dark' 
                ? "bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:border-zinc-700" 
                : "bg-white border-zinc-300 text-zinc-700 hover:text-zinc-900 shadow-sm"
            )}
            title={`Toggle Canvas Preview Mode (currently ${previewMode})`}
          >
            {previewMode === 'dark' ? (
              <>
                <Moon size={13} className="text-indigo-400" />
                <span>Dark Canvas</span>
              </>
            ) : (
              <>
                <Sun size={13} className="text-amber-500" />
                <span>Light Canvas</span>
              </>
            )}
          </button>

          {/* AI Assistant Sidebar Toggle */}
          <button
            onClick={() => setShowAiSidebar(prev => !prev)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border cursor-pointer",
              showAiSidebar 
                ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm" 
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800"
            )}
            title="Toggle AI Content Assistant Sidebar"
          >
            <Sparkles size={13} className={showAiSidebar ? "text-indigo-400" : "text-zinc-400"} />
            <span>AI Assistant</span>
          </button>

          {/* Mode Switcher */}
          <div className="flex bg-zinc-900 p-1 rounded-lg border border-zinc-800">
            <button
              onClick={() => setActiveTab('editor')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                activeTab === 'editor' ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Editor
            </button>
            <button
              onClick={() => setActiveTab('preview')}
              className={cn(
                "px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                activeTab === 'preview' ? "bg-zinc-800 text-white shadow-md" : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              Preview
            </button>
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as any)}
            className="text-xs font-bold bg-zinc-900 border-zinc-800 text-zinc-300 rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="Draft">Draft</option>
            <option value="Published">Published</option>
            <option value="Archived">Archived</option>
          </select>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-bold text-xs shadow-lg shadow-indigo-600/30 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Content</span>
          </button>
        </div>
      </div>

      {/* 2. Secondary Context Metadata Bar (Type-Specific) */}
      <div className="bg-zinc-900/60 border-b border-zinc-800/80 px-6 py-2 flex items-center justify-between gap-4 text-xs">
        {contentType === 'email' && (
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2 flex-1 max-w-xl">
              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">Subject:</span>
              <input
                type="text"
                value={metadata.subject || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, subject: e.target.value }))}
                placeholder="e.g. Welcome to {{tenant_name}} — Setup Instructions"
                className="w-full bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-zinc-400 font-bold uppercase tracking-wider text-[10px]">From:</span>
              <input
                type="text"
                value={metadata.senderName || ''}
                onChange={(e) => setMetadata(prev => ({ ...prev, senderName: e.target.value }))}
                placeholder="Sender Display Name"
                className="bg-zinc-950/80 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-indigo-500 w-44"
              />
            </div>
          </div>
        )}

        {contentType === 'letter' && (
          <div className="flex items-center gap-6 text-xs text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">Format:</span>
              <select
                value={metadata.paperSize || 'A4'}
                onChange={(e) => setMetadata(prev => ({ ...prev, paperSize: e.target.value as any }))}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 py-1 text-xs"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">US Letter (8.5 × 11 in)</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider">Orientation:</span>
              <select
                value={metadata.orientation || 'portrait'}
                onChange={(e) => setMetadata(prev => ({ ...prev, orientation: e.target.value as any }))}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 py-1 text-xs"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>
          </div>
        )}

        {contentType === 'page' && (
          <div className="flex items-center gap-4 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">Slug:</span>
              <div className="flex items-center bg-zinc-950/80 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs">
                <span className="text-zinc-500">/pages/</span>
                <input
                  type="text"
                  value={metadata.slug || ''}
                  onChange={(e) => setMetadata(prev => ({ ...prev, slug: e.target.value }))}
                  placeholder="portal-announcement"
                  className="bg-transparent border-none text-white focus:outline-none p-0 ml-0.5 text-xs w-48"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">Layout Width:</span>
              <select
                value={metadata.containerWidth || 'contained'}
                onChange={(e) => setMetadata(prev => ({ ...prev, containerWidth: e.target.value as any }))}
                className="bg-zinc-950 border border-zinc-800 text-zinc-200 rounded px-2 py-1 text-xs"
              >
                <option value="contained">Contained (1200px)</option>
                <option value="full">Full Width</option>
              </select>
            </div>
          </div>
        )}

        {contentType === 'message' && (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <span className="font-bold text-[10px] uppercase tracking-wider text-zinc-400">Channel:</span>
              <span className="px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-[11px] font-bold">
                SMS Transactional Gateway
              </span>
            </div>
            <div className="flex items-center gap-4 font-mono text-xs">
              <span className={cn(smsCharCount > 160 ? "text-amber-400 font-bold" : "text-zinc-400")}>
                Characters: <strong>{smsCharCount}</strong>/160
              </span>
              <span className="text-zinc-400">
                Segments: <strong>{smsSegments}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 3. Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-80 border-r border-zinc-800 bg-zinc-950 overflow-y-auto p-4 space-y-4 shrink-0">
          {activeTab === 'editor' ? (
            <>
              {/* Sidebar Navigation Tabs */}
              <div className="grid grid-cols-2 p-1 bg-zinc-900/90 rounded-xl border border-zinc-800 text-xs">
                <button
                  onClick={() => setLeftSidebarTab('blocks')}
                  className={cn(
                    "py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    leftSidebarTab === 'blocks'
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Layers size={13} className="text-indigo-400" />
                  <span>Block Library</span>
                </button>
                <button
                  onClick={() => setLeftSidebarTab('schema')}
                  className={cn(
                    "py-1.5 px-2.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer",
                    leftSidebarTab === 'schema'
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  )}
                >
                  <Database size={13} className="text-indigo-400" />
                  <span>Schema & Tags</span>
                </button>
              </div>

              {/* TAB 1: MODULAR BLOCK LIBRARY */}
              {leftSidebarTab === 'blocks' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                      Available Blocks
                    </span>
                    <span className="text-[10px] text-zinc-500 font-mono">{blocks.length} on canvas</span>
                  </div>

                  <div className="grid grid-cols-1 gap-1.5">
                    {blockLibraryItems.map((m) => {
                      const Icon = m.icon;
                      return (
                        <button
                          key={m.type}
                          onClick={() => handleInsertBlock(m.type)}
                          className="flex items-center gap-2.5 p-2 bg-zinc-900/60 border border-zinc-800/80 rounded-xl hover:border-indigo-500/50 hover:bg-zinc-900 transition-all text-left group cursor-pointer"
                        >
                          <div className="p-1.5 bg-zinc-800 rounded-lg group-hover:bg-indigo-500/20 text-zinc-400 group-hover:text-indigo-400 transition-colors shrink-0">
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold text-zinc-300 group-hover:text-white truncate">{m.label}</p>
                            <p className="text-[10px] text-zinc-500 truncate">{m.description}</p>
                          </div>
                          <Plus size={12} className="text-zinc-600 group-hover:text-indigo-400 shrink-0" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: SCHEMA EXPLORER & FORMAT PIPES */}
              {leftSidebarTab === 'schema' && (
                <div className="space-y-4">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={13} className="absolute left-3 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      value={schemaSearchQuery}
                      onChange={(e) => setSchemaSearchQuery(e.target.value)}
                      placeholder="Search schema fields..."
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Format Pipe Modifier Picker */}
                  <div className="p-3 bg-zinc-900/70 rounded-xl border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                        <Filter size={11} className="text-indigo-400" />
                        <span>Format Pipe Preset</span>
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                        {PIPE_PRESETS.find(p => p.id === selectedPipePreset)?.label}
                      </span>
                    </div>
                    <select
                      value={selectedPipePreset}
                      onChange={(e) => setSelectedPipePreset(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      {PIPE_PRESETS.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.label} ({p.description})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Schema Tree Groups */}
                  <div className="space-y-2">
                    {SCHEMA_CATEGORIES.map(category => {
                      const Icon = category.icon;
                      const isExpanded = expandedSchemaGroups[category.id] !== false;
                      const filteredFields = category.fields.filter(f => 
                        !schemaSearchQuery || 
                        f.label.toLowerCase().includes(schemaSearchQuery.toLowerCase()) || 
                        f.key.toLowerCase().includes(schemaSearchQuery.toLowerCase())
                      );

                      if (filteredFields.length === 0 && schemaSearchQuery) return null;

                      return (
                        <div key={category.id} className="rounded-xl border border-zinc-800/80 bg-zinc-900/40 overflow-hidden">
                          {/* Group Header */}
                          <button
                            onClick={() => toggleSchemaGroup(category.id)}
                            className="w-full px-3 py-2 bg-zinc-900/60 hover:bg-zinc-900 flex items-center justify-between text-left transition-colors cursor-pointer"
                          >
                            <div className="flex items-center gap-2">
                              <Icon size={13} className="text-indigo-400 shrink-0" />
                              <span className="text-xs font-bold text-zinc-300">{category.title}</span>
                              <span className="text-[10px] text-zinc-500 font-mono">({filteredFields.length})</span>
                            </div>
                            <ChevronDown size={13} className={cn("text-zinc-500 transition-transform", isExpanded ? "transform rotate-180" : "")} />
                          </button>

                          {/* Field Nodes */}
                          {isExpanded && (
                            <div className="p-1.5 space-y-1">
                              {filteredFields.map(field => {
                                const activePipe = PIPE_PRESETS.find(p => p.id === selectedPipePreset);
                                const tokenPreview = `{{${field.key}${activePipe?.suffix || ''}}}`;

                                return (
                                  <div
                                    key={field.key}
                                    className="p-2 bg-zinc-950/60 hover:bg-zinc-900/90 rounded-lg border border-zinc-800/60 flex items-center justify-between gap-2 group transition-all"
                                  >
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-semibold text-zinc-200 truncate">{field.label}</p>
                                      <p className="text-[10px] font-mono text-indigo-400 truncate">{tokenPreview}</p>
                                    </div>
                                    <button
                                      onClick={() => copyMergeTag(field.key)}
                                      className="p-1.5 rounded-lg bg-zinc-800 hover:bg-indigo-600 text-zinc-300 hover:text-white transition-colors shrink-0 cursor-pointer shadow-sm"
                                      title={`Insert ${tokenPreview}`}
                                    >
                                      {copiedTag === field.key ? (
                                        <Check size={12} className="text-emerald-400" />
                                      ) : (
                                        <Plus size={12} />
                                      )}
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Preview Inspector & Mock Data Controls */
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em] flex items-center gap-1.5">
                    <Sliders size={13} className="text-indigo-400" />
                    <span>Preview Engine</span>
                  </h3>
                </div>

                {/* Highlight Variables Switch */}
                <button
                  onClick={() => setHighlightVariables(prev => !prev)}
                  className={cn(
                    "w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer mb-2",
                    highlightVariables
                      ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Tag size={13} className="text-indigo-400" />
                    <span>Highlight Merge Tags</span>
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    highlightVariables ? "bg-indigo-500 text-white" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {highlightVariables ? "ON" : "OFF"}
                  </span>
                </button>

                {/* Conditional Logic Evaluation Switch */}
                <button
                  onClick={() => setEvaluateConditionLogic(prev => !prev)}
                  className={cn(
                    "w-full py-2 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer",
                    evaluateConditionLogic
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40 shadow-sm"
                      : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:bg-zinc-800"
                  )}
                >
                  <span className="flex items-center gap-2">
                    <Zap size={13} className={cn(evaluateConditionLogic ? "text-amber-400 fill-amber-400" : "text-zinc-500")} />
                    <span>Evaluate Condition Rules</span>
                  </span>
                  <span className={cn(
                    "text-[10px] px-2 py-0.5 rounded-full font-bold",
                    evaluateConditionLogic ? "bg-amber-500 text-zinc-950 font-black" : "bg-zinc-800 text-zinc-500"
                  )}>
                    {evaluateConditionLogic ? "ACTIVE" : "OFF"}
                  </span>
                </button>
              </div>

              {/* Sample Test Data Editor */}
              <div className="space-y-3 pt-2 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Variable size={12} className="text-indigo-400" />
                    <span>Live Simulation Data</span>
                  </h4>
                  <button
                    onClick={() => setSampleData({
                      tenant_name: tenant?.name || 'Acme Global Enterprises',
                      tenant_signer_name: user?.name || 'David Vance',
                      tenant_signer_title: 'Chief Operating Officer',
                      recipient_name: 'Sarah Jenkins',
                      recipient_organization: 'Nexus Technologies Ltd',
                      recipient_address: '452 Innovation Blvd, Suite 300, San Francisco, CA',
                      first_name: 'Sarah',
                      last_name: 'Jenkins',
                      name: 'Sarah Jenkins',
                      email: 's.jenkins@nexustech.io',
                      email_address: 's.jenkins@nexustech.io',
                      phone_number: '+1 (555) 234-5678',
                      'contact.first_name': 'Sarah',
                      'contact.last_name': 'Jenkins',
                      'contact.email': 's.jenkins@nexustech.io',
                      'contact.phone': '+1 (555) 234-5678',
                      'contact.title': 'VP of Infrastructure',
                      'contact.department': 'Engineering',
                      'contact.role': 'Executive Decision Maker',
                      organization: 'Nexus Technologies Ltd',
                      organization_name: 'Nexus Technologies Ltd',
                      account_name: 'Nexus Enterprise Pro',
                      account_id: 'ACC-98214',
                      'account.name': 'Nexus Technologies Ltd',
                      'account.id': 'ACC-98214',
                      'account.tier': 'Enterprise',
                      'account.status': 'Active',
                      'account.industry': 'Cloud Software',
                      'account.annual_revenue': '12500000',
                      project_title: 'Project Aurora Horizon',
                      'deal.title': 'Annual Enterprise Cloud Agreement',
                      'deal.amount': '48500',
                      'deal.stage': 'Closed Won',
                      'deal.close_date': '2026-09-30',
                      'deal.currency': 'USD',
                      'invoice.number': 'INV-2026-0491',
                      'invoice.total': '12450',
                      'invoice.status': 'Paid',
                      'invoice.due_date': '2026-10-15',
                      button_url: '#',
                      portal_link: '#',
                      action_link: '#',
                      header_title: 'Quarterly Operations Summary',
                      header_subtitle: 'Overview of performance and compliance metrics',
                      status: 'Active',
                      record_id: 'REC-2026-8492',
                      'record.id': 'REC-2026-8492',
                      createdAt: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                      today_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                      current_date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                      today: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                      'today.year': '2026',
                      'today.month': 'September',
                      item_name: 'Enterprise Cloud License',
                      item_qty: '1',
                      item_price: '2400',
                      item_total: '2400',
                      'items.item_name': 'Enterprise Cloud License',
                      'items.item_qty': '1',
                      'items.item_price': '2400',
                      'items.item_total': '2400',
                      unsubscribe_url: '#',
                    })}
                    className="text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                    title="Reset simulation values"
                  >
                    <RotateCcw size={10} />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Recipient / Customer Name
                    </label>
                    <input
                      type="text"
                      value={sampleData.recipient_name}
                      onChange={(e) => setSampleData(prev => ({ 
                        ...prev, 
                        recipient_name: e.target.value, 
                        first_name: e.target.value.split(' ')[0] || e.target.value, 
                        name: e.target.value,
                        'contact.first_name': e.target.value.split(' ')[0] || e.target.value
                      }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Account Tier (for conditional rules)
                    </label>
                    <select
                      value={sampleData['account.tier'] || 'Enterprise'}
                      onChange={(e) => setSampleData(prev => ({ ...prev, 'account.tier': e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Enterprise">Enterprise</option>
                      <option value="Growth">Growth</option>
                      <option value="Starter">Starter</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Deal Amount ($)
                    </label>
                    <input
                      type="text"
                      value={sampleData['deal.amount']}
                      onChange={(e) => setSampleData(prev => ({ ...prev, 'deal.amount': e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Company / Organization
                    </label>
                    <input
                      type="text"
                      value={sampleData.tenant_name}
                      onChange={(e) => setSampleData(prev => ({ ...prev, tenant_name: e.target.value, organization: e.target.value, 'tenant.name': e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">
                      Record Status
                    </label>
                    <select
                      value={sampleData.status || 'Active'}
                      onChange={(e) => setSampleData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="Active">Active</option>
                      <option value="Pending">Pending</option>
                      <option value="Expired">Expired</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Letter Options in Preview */}
              {contentType === 'letter' && (
                <div className="p-3 bg-zinc-900/60 rounded-xl border border-zinc-800/80 space-y-2">
                  <h4 className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Document Layout</h4>
                  <label className="flex items-center justify-between text-xs text-zinc-300 cursor-pointer">
                    <span>Show Official Letterhead</span>
                    <input
                      type="checkbox"
                      checked={metadata.showLetterhead !== false}
                      onChange={(e) => setMetadata(prev => ({ ...prev, showLetterhead: e.target.checked }))}
                      className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                </div>
              )}

              {/* Quick Actions */}
              <div className="space-y-2 pt-2 border-t border-zinc-800">
                <button
                  onClick={() => window.print()}
                  className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer size={13} />
                  <span>Print / Export PDF</span>
                </button>
                <button
                  onClick={() => setActiveTab('editor')}
                  className="w-full py-2 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 text-indigo-300 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Return to Editor</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Canvas & Editor Workspace */}
        <div className={cn(
          "flex-1 overflow-y-auto p-8 flex items-start justify-center transition-colors duration-200",
          previewMode === 'dark' ? "bg-zinc-950" : "bg-slate-200/90"
        )}>
          {/* A. EMAIL CANVAS */}
          {contentType === 'email' && (
            <div className={cn(
              "transition-all duration-300 w-full flex flex-col items-center py-4",
              viewport === 'mobile' ? "max-w-sm" : "max-w-2xl"
            )}>
              {/* Email Chrome Preview */}
              <div className={cn(
                "w-full rounded-t-2xl p-4 text-xs space-y-2 shadow-xl border transition-colors",
                previewMode === 'dark' 
                  ? "bg-zinc-900 border-zinc-800 text-zinc-300" 
                  : "bg-zinc-100 border-zinc-300 text-zinc-700"
              )}>
                <div className="flex items-center justify-between border-b pb-2 border-zinc-700/40">
                  <div className="flex items-center gap-2 flex-1 mr-2">
                    <span className={cn("font-bold text-[11px] w-14 shrink-0", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-500")}>Subject:</span>
                    <span className={cn("font-semibold truncate", previewMode === 'dark' ? "text-white" : "text-zinc-900")}>
                      {activeTab === 'preview'
                        ? evaluateMergePipes(metadata.subject || '(No Subject Line Set)', sampleData, highlightVariables)
                        : (metadata.subject || '(No Subject Line Set)')}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono hidden sm:inline shrink-0">Today, 2:15 PM</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold text-[11px] w-14", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-500")}>From:</span>
                    <span className={previewMode === 'dark' ? "text-zinc-300" : "text-zinc-700"}>{metadata.senderName} &lt;{metadata.replyTo}&gt;</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-500">
                    <ShieldCheck size={12} />
                    <span className="font-semibold">TLS Verified</span>
                  </div>
                </div>
                {activeTab === 'preview' && (
                  <div className="flex items-center gap-2">
                    <span className={cn("font-bold text-[11px] w-14", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-500")}>To:</span>
                    <span className={previewMode === 'dark' ? "text-zinc-300" : "text-zinc-700"}>
                      {sampleData.recipient_name} &lt;{sampleData.email}&gt;
                    </span>
                  </div>
                )}
              </div>

              {/* Email Body Card */}
              <div 
                style={{ fontFamily: getFontFamilyCSS(globalFont) }}
                className={cn(
                  "w-full shadow-2xl rounded-b-2xl min-h-[500px] border border-t-0 p-6 overflow-hidden transition-colors",
                  previewMode === 'dark'
                    ? "bg-zinc-950 text-zinc-100 border-zinc-800"
                    : "bg-white text-zinc-900 border-zinc-300"
                )}
              >
                {activeTab === 'editor' ? (
                  <BlockCanvas
                    blocks={blocks}
                    selectedBlockId={selectedBlockId}
                    contentType={contentType}
                    isDarkCanvas={previewMode === 'dark'}
                    globalFont={globalFont}
                    onSelectBlock={setSelectedBlockId}
                    onUpdateBlockData={handleUpdateBlockData}
                    onUpdateBlockStyles={handleUpdateBlockStyles}
                    onReorderBlocks={handleReorderBlocks}
                    onInsertBlock={handleInsertBlock}
                    onDuplicateBlock={handleDuplicateBlock}
                    onDeleteBlock={handleDeleteBlock}
                    onOpenSettings={handleOpenSettings}
                    onInsertTag={handleInsertTag}
                  />
                ) : (
                  <div 
                    className={cn(
                      "p-4 prose max-w-none", 
                      previewMode === 'dark' ? "prose-invert prose-indigo text-zinc-200" : "prose-slate"
                    )} 
                    dangerouslySetInnerHTML={{ __html: compiledPreviewHTML }} 
                  />
                )}
              </div>
            </div>
          )}

          {/* B. LETTER / DOCUMENT CANVAS */}
          {contentType === 'letter' && (
            <div className="w-full flex justify-center py-4">
              <div 
                style={{ fontFamily: getFontFamilyCSS(globalFont) }}
                className={cn(
                  "transition-all duration-300 w-full flex flex-col justify-between",
                  metadata.orientation === 'landscape'
                    ? "max-w-5xl min-h-[794px]"
                    : "max-w-[794px] min-h-[1123px]",
                  previewMode === 'dark'
                    ? "bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] ring-1 ring-white/5"
                    : "bg-white text-zinc-900 border border-zinc-300 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18)] ring-1 ring-black/5",
                  "rounded-sm px-12 py-10"
                )}
              >
                {activeTab === 'editor' ? (
                  <div className="flex-1 flex flex-col">
                    <BlockCanvas
                      blocks={blocks}
                      selectedBlockId={selectedBlockId}
                      contentType={contentType}
                      isDarkCanvas={previewMode === 'dark'}
                      globalFont={globalFont}
                      onSelectBlock={setSelectedBlockId}
                      onUpdateBlockData={handleUpdateBlockData}
                      onUpdateBlockStyles={handleUpdateBlockStyles}
                      onReorderBlocks={handleReorderBlocks}
                      onInsertBlock={handleInsertBlock}
                      onDuplicateBlock={handleDuplicateBlock}
                      onDeleteBlock={handleDeleteBlock}
                      onOpenSettings={handleOpenSettings}
                      onInsertTag={handleInsertTag}
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col justify-between">
                    {/* Document Header / Letterhead */}
                    {metadata.showLetterhead !== false && (
                      <div className={cn(
                        "pb-6 mb-8 border-b-2 flex items-start justify-between not-prose",
                        previewMode === 'dark' ? "border-zinc-800" : "border-indigo-600/30"
                      )}>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-black text-lg shadow-md shadow-indigo-500/30">
                            {tenant?.name?.charAt(0) || 'A'}
                          </div>
                          <div>
                            <h2 className={cn("font-bold text-base tracking-tight", previewMode === 'dark' ? "text-white" : "text-zinc-900")}>
                              {tenant?.name || sampleData.tenant_name}
                            </h2>
                            <p className={cn("text-xs", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                              Official Corporate Document • Confidential
                            </p>
                          </div>
                        </div>
                        <div className={cn("text-right text-xs space-y-0.5", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-500")}>
                          <p><span className="font-semibold">Date:</span> {sampleData.createdAt}</p>
                          <p><span className="font-semibold">Ref:</span> {sampleData.record_id}</p>
                        </div>
                      </div>
                    )}

                    {/* Document Content */}
                    <div
                      className={cn(
                        "prose max-w-none flex-1 leading-relaxed",
                        previewMode === 'dark' ? "prose-invert prose-indigo text-zinc-200" : "prose-slate text-zinc-800",
                        "[&_table]:border-collapse [&_table]:border-0 [&_table_td]:border-0 [&_table_th]:border-0 [&_table_td]:p-2"
                      )}
                      dangerouslySetInnerHTML={{ __html: compiledPreviewHTML }}
                    />

                    {/* Document Footer */}
                    <div className={cn(
                      "mt-16 pt-6 border-t flex items-center justify-between text-[11px] not-prose",
                      previewMode === 'dark' ? "border-zinc-800 text-zinc-500" : "border-zinc-200 text-zinc-400"
                    )}>
                      <span>{tenant?.name || sampleData.tenant_name} • Internal & Confidential</span>
                      <span>Page 1 of 1 • Aurora Content Services</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* C. SITE / WEB PAGE CANVAS */}
          {contentType === 'page' && (
            <div 
              style={{ fontFamily: getFontFamilyCSS(globalFont) }}
              className={cn(
                "transition-all duration-300 w-full shadow-2xl rounded-2xl overflow-hidden border transition-colors my-4",
                previewMode === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-300",
                viewport === 'mobile' ? "max-w-sm" : viewport === 'tablet' ? "max-w-2xl" : "max-w-5xl"
              )}
            >
              {/* Browser bar mockup */}
              <div className={cn(
                "px-4 py-2.5 border-b flex items-center gap-2",
                previewMode === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"
              )}>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-md text-[11px] flex-1 ml-2 truncate font-mono border flex items-center gap-2",
                  previewMode === 'dark' 
                    ? "bg-zinc-950 text-zinc-400 border-zinc-800" 
                    : "bg-white text-zinc-600 border-zinc-200 shadow-sm"
                )}>
                  <Globe size={11} className="text-indigo-400 shrink-0" />
                  <span className="truncate">https://portal.aurora.io/pages/{metadata.slug || 'untitled-page'}</span>
                </div>
              </div>

              <div className={cn(
                "p-8 min-h-[500px]",
                previewMode === 'dark' ? "bg-zinc-950 text-white" : "bg-white text-zinc-900"
              )}>
                {activeTab === 'editor' ? (
                  <BlockCanvas
                    blocks={blocks}
                    selectedBlockId={selectedBlockId}
                    contentType={contentType}
                    isDarkCanvas={previewMode === 'dark'}
                    globalFont={globalFont}
                    onSelectBlock={setSelectedBlockId}
                    onUpdateBlockData={handleUpdateBlockData}
                    onUpdateBlockStyles={handleUpdateBlockStyles}
                    onReorderBlocks={handleReorderBlocks}
                    onInsertBlock={handleInsertBlock}
                    onDuplicateBlock={handleDuplicateBlock}
                    onDeleteBlock={handleDeleteBlock}
                    onOpenSettings={handleOpenSettings}
                    onInsertTag={handleInsertTag}
                  />
                ) : (
                  <div 
                    className={cn(
                      "prose max-w-none", 
                      previewMode === 'dark' ? "prose-invert prose-indigo text-zinc-200" : "prose-slate"
                    )} 
                    dangerouslySetInnerHTML={{ __html: compiledPreviewHTML }} 
                  />
                )}
              </div>
            </div>
          )}

          {/* D. MESSAGE / SMS CANVAS */}
          {contentType === 'message' && (
            <div className="max-w-sm w-full flex flex-col items-center py-4">
              <div className={cn(
                "w-full border-2 rounded-[40px] p-4 shadow-2xl transition-colors relative",
                previewMode === 'dark' ? "bg-zinc-950 border-zinc-800" : "bg-white border-zinc-300"
              )}>
                {/* Phone Speaker & Status Notch */}
                <div className="flex items-center justify-between px-3 pt-1 pb-4">
                  <span className={cn("text-[11px] font-bold font-mono", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-600")}>9:41</span>
                  <div className={cn("w-20 h-4 rounded-full", previewMode === 'dark' ? "bg-zinc-800" : "bg-zinc-200")} />
                  <div className="flex items-center gap-1 text-zinc-400 text-[10px]">
                    <span>5G</span>
                  </div>
                </div>

                {/* Contact Header in Preview */}
                {activeTab === 'preview' && (
                  <div className={cn("text-center pb-4 mb-3 border-b", previewMode === 'dark' ? "border-zinc-800" : "border-zinc-200")}>
                    <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center mx-auto mb-1 text-xs">
                      {sampleData.recipient_name.split(' ').map(n => n[0]).join('') || 'SJ'}
                    </div>
                    <p className={cn("text-xs font-bold", previewMode === 'dark' ? "text-zinc-200" : "text-zinc-900")}>
                      {sampleData.recipient_name}
                    </p>
                    <span className="text-[10px] text-zinc-500">iMessage • SMS</span>
                  </div>
                )}

                {/* Message Bubble Simulator */}
                <div className={cn(
                  "p-4 rounded-2xl border mb-4 space-y-2",
                  previewMode === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-zinc-50 border-zinc-200"
                )}>
                  <div className={cn("flex items-center justify-between text-[10px] font-bold uppercase", previewMode === 'dark' ? "text-zinc-500" : "text-zinc-400")}>
                    <span>Outgoing SMS</span>
                    <span>Now</span>
                  </div>
                  <div className="bg-indigo-600 text-white p-3.5 rounded-2xl rounded-tr-none text-xs font-medium leading-relaxed break-words shadow-md">
                    {compiledPreviewHTML.replace(/<[^>]*>?/gm, '').trim() || 'Type your message text...'}
                  </div>
                  {activeTab === 'preview' && (
                    <div className="text-right">
                      <span className="text-[9px] text-zinc-500">Delivered</span>
                    </div>
                  )}
                </div>

                {/* Editor Box */}
                {activeTab === 'editor' ? (
                  <div className="space-y-3">
                    <label className={cn("text-[11px] font-bold uppercase tracking-wider block", previewMode === 'dark' ? "text-zinc-400" : "text-zinc-600")}>
                      Interactive Message Blocks:
                    </label>
                    <BlockCanvas
                      blocks={blocks}
                      selectedBlockId={selectedBlockId}
                      contentType={contentType}
                      isDarkCanvas={previewMode === 'dark'}
                      globalFont={globalFont}
                      onSelectBlock={setSelectedBlockId}
                      onUpdateBlockData={handleUpdateBlockData}
                      onUpdateBlockStyles={handleUpdateBlockStyles}
                      onReorderBlocks={handleReorderBlocks}
                      onInsertBlock={handleInsertBlock}
                      onDuplicateBlock={handleDuplicateBlock}
                      onDeleteBlock={handleDeleteBlock}
                      onOpenSettings={handleOpenSettings}
                      onInsertTag={handleInsertTag}
                    />
                  </div>
                ) : (
                  <div className={cn(
                    "p-2.5 rounded-full border text-xs text-zinc-500 flex items-center justify-between px-4",
                    previewMode === 'dark' ? "bg-zinc-900 border-zinc-800" : "bg-zinc-100 border-zinc-200"
                  )}>
                    <span className="text-[11px]">iMessage</span>
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs">
                      &uarr;
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar - Block Settings Inspector (when open) OR AI Assistant */}
        {showBlockSettings && selectedBlock ? (
          <BlockSettingsDrawer
            block={selectedBlock}
            onClose={() => setShowBlockSettings(false)}
            onUpdateStyles={(newStyles) => handleUpdateBlockStyles(selectedBlock.id, newStyles)}
            onUpdateConditions={(newConditions) => handleUpdateBlockConditions(selectedBlock.id, newConditions)}
          />
        ) : showAiSidebar ? (
          <div className="w-80 border-l border-zinc-800 bg-zinc-950 overflow-y-auto p-5 flex flex-col justify-between shrink-0 transition-all duration-300">
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    <Sparkles size={14} />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white tracking-tight">AI Content Assistant</h3>
                    <span className="text-[10px] text-zinc-500 font-mono">Aurora Intelligence</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiSidebar(false)}
                  className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                  title="Collapse AI Assistant"
                >
                  <PanelRightClose size={14} />
                </button>
              </div>

              {/* Quick Starters */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2 flex items-center gap-1">
                  <Sparkles size={11} className="text-amber-400" />
                  <span>Quick Starters</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {aiSuggestions.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => setAiPrompt(item.prompt)}
                      className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800/90 text-zinc-300 hover:text-white hover:border-indigo-500/50 hover:bg-zinc-800 transition-all text-left cursor-pointer"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tone & Style Selector */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Tone & Style
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'professional', label: 'Professional' },
                    { id: 'formal', label: 'Formal Legal' },
                    { id: 'friendly', label: 'Friendly' },
                    { id: 'urgent', label: 'Direct / Action' }
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAiTone(t.id as any)}
                      className={cn(
                        "px-2.5 py-1.5 text-[11px] font-medium rounded-lg border transition-all text-center cursor-pointer",
                        aiTone === t.id
                          ? "bg-indigo-600/20 text-indigo-300 border-indigo-500/50 shadow-sm"
                          : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200"
                      )}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Prompt Area */}
              <div>
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1.5">
                  Prompt Instructions
                </label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder={`Describe the ${contentType} content, required clauses, or key details for AI to draft...`}
                  rows={4}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none font-sans leading-relaxed transition-colors"
                />
              </div>

              {/* Draft Generation Button */}
              <button
                onClick={handleAIGenerate}
                disabled={isGenerating}
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>Drafting with AI...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-3.5 h-3.5" />
                    <span>Generate Full Draft</span>
                  </>
                )}
              </button>

              {/* Quick Refine Tools (When Blocks Exist) */}
              {blocks.length > 0 && (
                <div className="pt-2 border-t border-zinc-800/80 space-y-2">
                  <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    1-Click Refinement
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    <button
                      onClick={() => handleAIRefine('Improve flow, clarity, and grammatical precision while preserving format')}
                      disabled={isGenerating}
                      className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={12} className="text-indigo-400" />
                        <span>Enhance Writing & Flow</span>
                      </span>
                      <ChevronRight size={12} className="text-zinc-500" />
                    </button>

                    <button
                      onClick={() => handleAIRefine('Elevate the formality, structure, and legal precision of the text')}
                      disabled={isGenerating}
                      className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5">
                        <Scale size={12} className="text-amber-400" />
                        <span>Make More Formal / Legal</span>
                      </span>
                      <ChevronRight size={12} className="text-zinc-500" />
                    </button>

                    <button
                      onClick={() => handleAIRefine('Make the content more concise and punchy without losing essential meaning')}
                      disabled={isGenerating}
                      className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5">
                        <Scissors size={12} className="text-rose-400" />
                        <span>Shorten & Condense</span>
                      </span>
                      <ChevronRight size={12} className="text-zinc-500" />
                    </button>

                    <button
                      onClick={() => handleAIRefine('Ensure dynamic placeholders like {{first_name}}, {{recipient_name}}, {{tenant_name}}, {{createdAt}} are used appropriately throughout')}
                      disabled={isGenerating}
                      className="w-full py-1.5 px-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white text-[11px] font-medium rounded-lg transition-all flex items-center justify-between cursor-pointer disabled:opacity-50"
                    >
                      <span className="flex items-center gap-1.5">
                        <Tag size={12} className="text-emerald-400" />
                        <span>Optimize Merge Variables</span>
                      </span>
                      <ChevronRight size={12} className="text-zinc-500" />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Info */}
            <div className="pt-4 border-t border-zinc-800/80 text-[10px] text-zinc-500 flex items-center justify-between">
              <span>AI Assistant active</span>
              <span className="font-mono">v2.4</span>
            </div>
          </div>
        ) : null}
      </div>

      {showUnsavedConfirm && (
        <UnsavedChangesModal
          isOpen={showUnsavedConfirm}
          entityName="content"
          isSaving={false}
          onSaveAndExit={async () => {
            await handleSave();
            setIsDirty(false);
            setShowUnsavedConfirm(false);
            onCancel?.();
          }}
          onDiscardAndExit={() => {
            setIsDirty(false);
            setShowUnsavedConfirm(false);
            onCancel?.();
          }}
          onCancel={() => setShowUnsavedConfirm(false)}
        />
      )}
    </div>
  );
};

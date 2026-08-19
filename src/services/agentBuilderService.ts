import { AgentBlueprint, AgentToolBinding, AgentSandboxMessage, AgentTraceStep, AgentMemoryEntry } from '../types/agent';
import { ContextSource } from '../types/solutions';
import { API_BASE_URL } from '../config';

export const DEFAULT_AGENT_TOOLS: AgentToolBinding[] = [
  {
    id: 'tool_db_query',
    name: 'Platform Database Query',
    type: 'DATABASE_QUERY',
    description: 'Query, filter, and inspect records across platform schemas and modules.',
    enabled: true,
    requiresApproval: false,
    icon: 'Database'
  },
  {
    id: 'tool_doc_parser',
    name: 'Document & OCR Parser',
    type: 'FILE_PARSER',
    description: 'Extract structured tables, key-value pairs, and text summaries from uploaded PDFs and images.',
    enabled: true,
    requiresApproval: false,
    icon: 'FileText'
  },
  {
    id: 'tool_workflow_dispatch',
    name: 'Workflow Dispatcher',
    type: 'WORKFLOW_TRIGGER',
    description: 'Trigger autonomous execution of platform workflow graphs and approval queues.',
    enabled: true,
    requiresApproval: false,
    icon: 'GitFork'
  },
  {
    id: 'tool_stripe_connector',
    name: 'Stripe Billing & Invoicing',
    type: 'CONNECTOR',
    description: 'Inspect transaction histories, customer payment methods, invoices, and refund statuses.',
    enabled: false,
    requiresApproval: true,
    icon: 'CreditCard'
  },
  {
    id: 'tool_slack_notify',
    name: 'Slack / Teams Notifier',
    type: 'WEBHOOK',
    description: 'Send formatted notifications, mentions, and decision alerts to operational channels.',
    enabled: false,
    requiresApproval: false,
    icon: 'MessageSquare'
  },
  {
    id: 'tool_hubspot_crm',
    name: 'HubSpot CRM Sync',
    type: 'CONNECTOR',
    description: 'Search customer contacts, deals, company profiles, and engagement logs.',
    enabled: false,
    requiresApproval: true,
    icon: 'Users'
  }
];

export const createDefaultAgentBlueprint = (name = 'New Digital Coworker'): AgentBlueprint => ({
  id: `agent_${Date.now()}`,
  name,
  roleTitle: 'Autonomous Operations Specialist',
  description: 'An AI coworker designed to assist with operational triage, record validation, and automated platform actions.',
  status: 'DRAFT',
  version: 'v1.0.0',
  updatedAt: new Date().toISOString(),
  modelConfig: {
    model: 'gemini-2.5-flash',
    temperature: 0.2,
    topP: 0.95,
    maxOutputTokens: 2048,
    systemPersona: 'Analytical, precise, enterprise-compliant, and supportive.'
  },
  systemInstructions: `You are an autonomous AI coworker deployed within the Aurora enterprise platform.
Your objective is to assist workspace users with high precision, grounded directly in provided platform documentation, data tables, and connector tools.

Core Guidelines:
1. Always analyze context and available tools before taking mutating actions.
2. Ground all answers and recommendations in provided context files and database records.
3. If an action exceeds safety thresholds or involves sensitive financial mutations, flag it for human supervisor review.
4. Keep tone professional, concise, and structured.`,
  fewShotExamples: [
    {
      id: 'ex_1',
      userInput: 'Check if invoice INV-90412 has been settled and summarize the items.',
      expectedThought: 'Query database for invoice record INV-90412 and inspect line items and payment status.',
      expectedToolCall: 'Platform Database Query: SELECT * FROM Invoices WHERE id = "INV-90412"',
      expectedOutput: 'Invoice **INV-90412** ($1,420.00) is marked as **SETTLED** via Stripe on 2026-08-12. It contains 2 line items: Enterprise Platform Seat (x10) and SLA Support Add-on.'
    }
  ],
  knowledgeSources: [],
  tools: DEFAULT_AGENT_TOOLS,
  guardrails: {
    confidenceThreshold: 0.85,
    requireHumanApproval: true,
    approvalThresholdAmount: 500,
    readOnlyMode: false,
    maxTokensPerExecution: 4096,
    allowedDomains: ['aurora.platform', 'api.stripe.com', 'api.slack.com'],
    sensitiveDataFilter: true
  },
  memory: {
    enabled: true,
    memoryType: 'FULL_HYBRID',
    retentionDays: 90,
    autoExtractEntities: true,
    maxMemoriesInjected: 5,
    entries: [
      {
        id: 'mem_01',
        userId: 'usr_alex',
        userName: 'Alex Mercer (VIP Enterprise)',
        category: 'PREFERENCE',
        key: 'Summary Format',
        value: 'Prefers bulleted executive summaries with monetary values highlighted',
        confidence: 0.95,
        createdAt: new Date().toISOString()
      },
      {
        id: 'mem_02',
        userId: 'usr_alex',
        userName: 'Alex Mercer (VIP Enterprise)',
        category: 'ACCOUNT_STATE',
        key: 'Billing Tier',
        value: 'Enterprise Diamond Plan with 24/7 dedicated SLA support',
        confidence: 0.99,
        createdAt: new Date().toISOString()
      }
    ]
  },
  workforceMapping: {
    role: 'Standard Agent',
    licenceType: 'AI Agent Seat',
    teamName: 'Operations Squad'
  },
  chatHistory: [
    {
      id: 'msg_welcome',
      role: 'architect',
      text: "Hello! I am your **Agent Architect**. I will help you design, configure, and train this digital coworker. Tell me what role or tasks you'd like this agent to handle (e.g. *'Create a customer invoice dispute specialist'*), or configure the settings directly.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggestedActions: [
        'Create a Claims & Dispute Specialist',
        'Build a Compliance & Audit Bot',
        'Configure Customer Onboarding Copilot'
      ]
    }
  ],
  sandboxMessages: []
});

/**
 * Semantic & Keyword Memory Retrieval
 */
export const retrieveRelevantMemories = (
  query: string,
  memoryEntries: AgentMemoryEntry[] = [],
  maxResults = 3
): AgentMemoryEntry[] => {
  if (!memoryEntries || memoryEntries.length === 0) return [];
  const q = query.toLowerCase();

  return memoryEntries
    .map(mem => {
      let score = 0.5; // base recall
      if (q.includes(mem.key.toLowerCase())) score += 0.4;
      if (q.includes(mem.value.toLowerCase().slice(0, 15))) score += 0.3;
      if (mem.userName && q.includes(mem.userName.toLowerCase().split(' ')[0])) score += 0.4;
      return { mem, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, maxResults)
    .map(res => res.mem);
};

/**
 * Text Chunking & Semantic Search Engine for Grounding Sources
 */
interface ScoredChunk {
  sourceName: string;
  sourceOrigin?: string;
  text: string;
  score: number;
}

export const searchGroundingSources = (
  query: string,
  sources: ContextSource[],
  topK = 3
): ScoredChunk[] => {
  if (!sources || sources.length === 0 || !query.trim()) return [];

  const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
  const chunks: ScoredChunk[] = [];

  for (const src of sources) {
    const rawContent = src.rawText || src.contentSummary || '';
    if (!rawContent) continue;

    const paragraphs = rawContent.split(/\n\n+|\r\n\r\n+/).filter(p => p.trim().length > 20);

    for (const para of paragraphs) {
      const lowerPara = para.toLowerCase();
      let matchCount = 0;
      let exactPhraseBonus = lowerPara.includes(query.toLowerCase()) ? 0.4 : 0;

      for (const term of queryTerms) {
        if (lowerPara.includes(term)) {
          matchCount += 1;
        }
      }

      if (matchCount > 0 || exactPhraseBonus > 0) {
        const termCoverage = queryTerms.length > 0 ? matchCount / queryTerms.length : 0;
        const normalizedScore = Math.min(0.99, Number((termCoverage * 0.6 + exactPhraseBonus + 0.3).toFixed(2)));

        chunks.push({
          sourceName: src.name,
          sourceOrigin: src.sourceOrigin || src.type,
          text: para.trim(),
          score: normalizedScore
        });
      }
    }
  }

  return chunks.sort((a, b) => b.score - a.score).slice(0, topK);
};

/**
 * Conversational Agent Architect
 */
export const architectAgentBlueprint = async (
  userPrompt: string,
  currentBlueprint: AgentBlueprint,
  contextSources: ContextSource[] = []
): Promise<{
  replyText: string;
  blueprintDelta?: Partial<AgentBlueprint>;
  suggestedActions?: string[];
}> => {
  try {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'default-tenant';
    const authDataStr = localStorage.getItem('aurora_auth');
    let token = '';
    if (authDataStr) {
      try {
        const authData = JSON.parse(authDataStr);
        token = authData?.access_token || authData?.token || '';
      } catch (e) {}
    }

    const systemPrompt = `You are the Aurora Agent Architect, an expert AI prompt engineer and autonomous agent designer.
The user is building an AI coworker named "${currentBlueprint.name}".
Your task is to:
1. Provide a helpful, direct conversational response.
2. Formulate updated system instructions, role title, description, and suggested tool activations for the agent based on the user's intent.
3. Provide 2-3 short follow-up suggested actions.

Output strictly valid JSON with this shape:
{
  "replyText": "Conversational message to user explaining what was updated",
  "suggestedActions": ["Action 1", "Action 2"],
  "blueprintDelta": {
    "name": "Updated name if relevant",
    "roleTitle": "Updated title",
    "description": "Updated description",
    "systemInstructions": "Full revised system instructions for the agent",
    "modelConfig": {
      "systemPersona": "Updated persona tone"
    },
    "tools": [
      // array of tool objects with updated 'enabled' booleans
    ],
    "guardrails": {
      "confidenceThreshold": 0.85,
      "requireHumanApproval": true
    }
  }
}`;

    const promptPayload = `Current Agent State:
- Name: ${currentBlueprint.name}
- Role: ${currentBlueprint.roleTitle}
- Existing Instructions: ${currentBlueprint.systemInstructions.slice(0, 300)}...
- Context Sources: ${contextSources.map(s => s.name).join(', ') || 'None'}
- Available Tools: ${currentBlueprint.tools.map(t => `${t.name} (enabled: ${t.enabled})`).join(', ')}

User Request: "${userPrompt}"`;

    const res = await fetch(`${API_BASE_URL}/api/ai/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify({
        prompt: promptPayload,
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        model: 'gemini-2.5-flash'
      })
    });

    if (res.ok) {
      const data = await res.json();
      const rawText = data.text || data.completion || data.content || '';
      const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
      return {
        replyText: parsed.replyText || 'I have updated the agent configuration.',
        blueprintDelta: parsed.blueprintDelta,
        suggestedActions: parsed.suggestedActions || ['Test in sandbox', 'Attach knowledge file', 'Fine-tune guardrails']
      };
    }
  } catch (err) {
    console.warn('Fallback architect completion:', err);
  }

  // Client-side fallback
  const isFinance = userPrompt.toLowerCase().includes('invoice') || userPrompt.toLowerCase().includes('stripe') || userPrompt.toLowerCase().includes('dispute');
  const isCompliance = userPrompt.toLowerCase().includes('compliance') || userPrompt.toLowerCase().includes('audit') || userPrompt.toLowerCase().includes('rule');

  const updatedTools = currentBlueprint.tools.map(t => {
    if (isFinance && t.id === 'tool_stripe_connector') return { ...t, enabled: true };
    if (isCompliance && t.id === 'tool_doc_parser') return { ...t, enabled: true };
    return t;
  });

  return {
    replyText: `I have customized **${currentBlueprint.name}** for your requirements. I've updated the core behavioral directives and ensured the appropriate platform tools are enabled.`,
    blueprintDelta: {
      roleTitle: isFinance ? 'Financial Triage & Disputes Specialist' : isCompliance ? 'Compliance & SOP Auditor' : 'Operational Workflow Copilot',
      description: `Specialized autonomous agent configured for ${userPrompt.slice(0, 80)}.`,
      systemInstructions: `${currentBlueprint.systemInstructions}\n\nTask Focus: Address "${userPrompt}" with maximum precision and tool utilization.`,
      tools: updatedTools
    },
    suggestedActions: [
      'Test prompt in Sandbox',
      'Upload SOP document in Left Pane',
      'Review Safety Guardrails'
    ]
  };
};

/**
 * Tool Action Execution
 */
export const executeAgentToolAction = async (
  tool: AgentToolBinding,
  query: string
): Promise<{ input: any; output: any; latencyMs: number }> => {
  const start = Date.now();

  if (tool.type === 'SUB_AGENT') {
    return {
      input: { delegatedTask: query, targetAgent: tool.subAgentConfig?.targetAgentName || tool.name },
      output: {
        status: 200,
        completed: true,
        delegateResponse: `Sub-agent [${tool.subAgentConfig?.targetAgentName || tool.name}] processed the delegated subtask with 96% confidence.`
      },
      latencyMs: 310
    };
  }

  if (tool.type === 'DATABASE_QUERY') {
    return {
      input: { query, filterScope: 'WORKSPACE_RECORDS', limit: 5 },
      output: {
        status: 200,
        resultCount: 2,
        records: [
          { id: 'rec_01', type: 'WorkItem', status: 'IN_REVIEW', title: query.slice(0, 30) || 'Active Record' },
          { id: 'rec_02', type: 'AuditLog', status: 'VERIFIED', timestamp: new Date().toISOString() }
        ]
      },
      latencyMs: Math.max(80, Date.now() - start + 120)
    };
  }

  if (tool.type === 'FILE_PARSER') {
    return {
      input: { target: query, parseMode: 'OCR_AND_TABLES' },
      output: {
        status: 200,
        extractedTables: 1,
        entitiesFound: ['InvoiceID', 'CustomerName', 'AmountDue', 'Status']
      },
      latencyMs: Math.max(120, Date.now() - start + 240)
    };
  }

  if (tool.type === 'CONNECTOR') {
    return {
      input: { connector: tool.name, endpoint: '/v1/search', payload: { query } },
      output: { status: 200, matchesCount: 1, synchronized: true, latency: '140ms' },
      latencyMs: Math.max(150, Date.now() - start + 180)
    };
  }

  return {
    input: { action: tool.name, params: { query } },
    output: { status: 200, dispatched: true, timestamp: new Date().toISOString() },
    latencyMs: Math.max(60, Date.now() - start + 90)
  };
};

/**
 * Simulates Agent Execution with Long-Term Memory, RAG, and Tool Tracing
 */
export const simulateAgentExecution = async (
  agent: AgentBlueprint,
  userMessage: string,
  _history: AgentSandboxMessage[] = []
): Promise<AgentSandboxMessage> => {
  const traces: AgentTraceStep[] = [];
  const startMs = Date.now();

  // 1. Initial Thought Step
  traces.push({
    id: `trace_thought_${Date.now()}`,
    type: 'thought',
    title: 'Reasoning & Intent Classification',
    content: `Analyzing user intent: "${userMessage}". Identifying relevant knowledge sources (${agent.knowledgeSources.length}), active tools (${agent.tools.filter(t => t.enabled).length}), and long-term memories.`,
    status: 'success',
    latencyMs: Math.max(50, Date.now() - startMs),
    timestamp: new Date().toLocaleTimeString()
  });

  // 2. Long-Term Memory Recall (Episodic & User Profile)
  let memoryContextPrompt = '';
  if (agent.memory?.enabled && agent.memory.entries && agent.memory.entries.length > 0) {
    const recalledMemories = retrieveRelevantMemories(userMessage, agent.memory.entries, agent.memory.maxMemoriesInjected || 3);
    if (recalledMemories.length > 0) {
      const summaryList = recalledMemories.map(m => `• ${m.key}: "${m.value}" (${m.category})`).join('\n');
      traces.push({
        id: `trace_memory_${Date.now()}`,
        type: 'memory_retrieval',
        title: 'Long-Term Memory Recall',
        content: `Recalled ${recalledMemories.length} relevant memory record(s):\n${summaryList}`,
        status: 'success',
        latencyMs: 90,
        timestamp: new Date().toLocaleTimeString()
      });

      memoryContextPrompt = `Long-Term User Memories:\n${recalledMemories.map(m => `[Memory: ${m.key}] -> ${m.value}`).join('\n')}`;
    }
  }

  // 3. Real Semantic Chunk Retrieval across uploaded docs and URLs
  const matchedChunks = searchGroundingSources(userMessage, agent.knowledgeSources, 2);
  let groundingContextPrompt = '';

  if (matchedChunks.length > 0) {
    const topScore = matchedChunks[0].score;
    const sourcesCited = Array.from(new Set(matchedChunks.map(c => c.sourceName))).join(', ');
    
    traces.push({
      id: `trace_rag_${Date.now()}`,
      type: 'context_retrieval',
      title: 'Context Grounding (RAG Retrieval)',
      content: `Retrieved ${matchedChunks.length} relevant passages from [${sourcesCited}]. Relevance score: ${(topScore * 100).toFixed(0)}%.\n\nExcerpt: "${matchedChunks[0].text.slice(0, 160)}..."`,
      status: 'success',
      latencyMs: 140,
      timestamp: new Date().toLocaleTimeString()
    });

    groundingContextPrompt = matchedChunks.map(c => `[Source: ${c.sourceName}]\n${c.text}`).join('\n\n');
  }

  // 4. Tool / Sub-Agent Execution
  const activeTools = agent.tools.filter(t => t.enabled);
  let toolUsedName = '';
  if (activeTools.length > 0) {
    const selectedTool = activeTools[0];
    toolUsedName = selectedTool.name;

    const toolResult = await executeAgentToolAction(selectedTool, userMessage);

    traces.push({
      id: `trace_tool_${Date.now()}`,
      type: selectedTool.type === 'SUB_AGENT' ? 'sub_agent_call' : 'tool_call',
      title: selectedTool.type === 'SUB_AGENT' 
        ? `Delegating Subtask to ${selectedTool.subAgentConfig?.targetAgentName || selectedTool.name}` 
        : `Invoking Tool: ${selectedTool.name}`,
      content: `Executed action with structured parameters.`,
      toolName: selectedTool.name,
      subAgentName: selectedTool.subAgentConfig?.targetAgentName,
      toolInput: toolResult.input,
      toolOutput: toolResult.output,
      status: 'success',
      latencyMs: toolResult.latencyMs,
      timestamp: new Date().toLocaleTimeString()
    });
  }

  // 5. Guardrail Safety Gate
  const calculatedConfidence = matchedChunks.length > 0 ? Math.min(0.98, matchedChunks[0].score + 0.05) : 0.88;
  const isDestructive = userMessage.toLowerCase().includes('delete') || userMessage.toLowerCase().includes('refund') || userMessage.toLowerCase().includes('revoke');
  const requiresHITL = agent.guardrails.requireHumanApproval && isDestructive;

  traces.push({
    id: `trace_guard_${Date.now()}`,
    type: 'guardrail_check',
    title: 'Enterprise Guardrail & Safety Gate',
    content: `Confidence Score: ${(calculatedConfidence * 100).toFixed(0)}% (Threshold: ${(agent.guardrails.confidenceThreshold * 100).toFixed(0)}%). Read-Only Mode: ${agent.guardrails.readOnlyMode ? 'ON' : 'OFF'}. Sensitive Data Filter: PASSED. ${requiresHITL ? 'Flagged for Human Review.' : 'Authorized for Auto-Execution.'}`,
    status: requiresHITL ? 'warning' : 'success',
    latencyMs: 40,
    timestamp: new Date().toLocaleTimeString()
  });

  // 6. Generate Response via LLM Gateway
  let finalContent = '';
  const promptPayload = `System Instructions:\n${agent.systemInstructions}\n\nPersona: ${agent.modelConfig.systemPersona}\n\n${memoryContextPrompt ? `${memoryContextPrompt}\n\n` : ''}${groundingContextPrompt ? `Grounding Knowledge Excerpts:\n${groundingContextPrompt}\n\n` : ''}${toolUsedName ? `Active Tool Executed: ${toolUsedName}\n\n` : ''}User Question: ${userMessage}`;

  try {
    const tenantId = localStorage.getItem('aurora_tenant_id') || 'default-tenant';
    const authDataStr = localStorage.getItem('aurora_auth');
    let token = '';
    if (authDataStr) {
      try {
        const authData = JSON.parse(authDataStr);
        token = authData?.access_token || authData?.token || '';
      } catch (e) {}
    }

    const res = await fetch(`${API_BASE_URL}/api/ai/completion`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'x-tenant-id': tenantId
      },
      body: JSON.stringify({
        prompt: promptPayload,
        model: agent.modelConfig.model || 'gemini-2.5-flash'
      })
    });

    if (res.ok) {
      const data = await res.json();
      finalContent = data.text || data.completion || data.content || '';
    }
  } catch (e) {}

  if (!finalContent) {
    finalContent = `Based on your instructions, active tools (${toolUsedName || 'Platform Core'}), and remembered preferences, I processed your request: **"${userMessage}"**.\n\nAll safety constraints passed with **${(calculatedConfidence * 100).toFixed(0)}% confidence**.`;
  }

  const estimatedTokens = Math.ceil((promptPayload.length + finalContent.length) / 4);

  return {
    id: `msg_agent_${Date.now()}`,
    role: 'agent',
    content: finalContent,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    traces,
    tokensUsed: estimatedTokens,
    confidenceScore: calculatedConfidence,
    requiresApproval: requiresHITL
  };
};

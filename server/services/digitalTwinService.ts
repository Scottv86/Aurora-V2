import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { DigitalTwinConfig, TwinActivityLog, TwinDraftItem, HandoverDigest } from '../../src/types/twin';

dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || '';
const genAI = new GoogleGenAI({ apiKey });

// In-Memory Storage fallback for Digital Twin Configs, Logs & Drafts
const twinConfigs: Record<string, DigitalTwinConfig> = {};
const twinLogs: Record<string, TwinActivityLog[]> = {};
const twinDrafts: Record<string, TwinDraftItem[]> = {};

// Helper: Get or initialize default twin config for user
export function getOrCreateTwinConfig(userId: string): DigitalTwinConfig {
  if (!twinConfigs[userId]) {
    twinConfigs[userId] = {
      id: `twin-${userId}`,
      userId,
      status: 'AVAILABLE',
      mode: 'DRAFT_ONLY',
      roleTitle: 'Senior Product Manager',
      department: 'Platform Operations',
      responsibilities: 'Overseeing module development, approving workflow automation specifications, and triaging team requests.',
      keyProjects: ['Aurora V2 Migration', 'Agent Orchestration Framework', 'User Twin Delegate'],
      confidenceThreshold: 0.85,
      writingStyle: {
        formality: 65,
        conciseness: 80,
        enthusiasm: 50,
        greetingPreference: 'Hi team,',
        signoffPreference: 'Best regards,',
        customToneInstructions: 'Direct, clear, solution-oriented. Prefers bullet points for multi-step tasks. Avoids fluff.',
        sampleSnippets: [
          "Thanks for flagging this. I've reviewed the specs and approve moving forward with step 2.",
          "Let's make sure we log the telemetry before deploying to staging.",
          "I'm out of office until 4 PM. If urgent, please tag the on-call engineer."
        ],
        extractedKeywords: ['Pragmatic', 'Structured', 'Decisive', 'Polite']
      },
      autoActivateOnSchedule: true,
      nightShiftSchedule: {
        startTime: '18:00',
        endTime: '08:30',
        enabledDays: ['mon', 'tue', 'wed', 'thu', 'fri']
      }
    };
  }

  if (!twinLogs[userId]) {
    twinLogs[userId] = [
      {
        id: `log-1`,
        userId,
        timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
        actionType: 'MESSAGE_REPLY',
        title: 'Answered Status Ping from Alex',
        description: 'Responded regarding the API migration timeline based on project backlog.',
        channel: 'Slack #engineering',
        status: 'COMPLETED',
        confidenceScore: 0.92
      },
      {
        id: `log-2`,
        userId,
        timestamp: new Date(Date.now() - 3600000 * 5).toISOString(),
        actionType: 'DRAFT_CREATED',
        title: 'Drafted Sprint Summary Report',
        description: 'Compiled pull request metrics for the weekly engineering handover.',
        channel: 'Email',
        status: 'PENDING_APPROVAL',
        confidenceScore: 0.88
      }
    ];
  }

  if (!twinDrafts[userId]) {
    twinDrafts[userId] = [
      {
        id: `draft-1`,
        userId,
        targetChannel: 'Email to Sarah (Lead Architect)',
        recipientName: 'Sarah Connor',
        recipientRole: 'Lead Architect',
        incomingPrompt: 'Hi Daniela, do we need to delay the database schema update until after the audit?',
        draftedResponse: "Hi Sarah,\n\nBased on our compliance checklist, yes—we should hold off on schema migrations until the audit completes this Thursday. I'll make sure the team is aligned.\n\nBest regards,\nDaniela",
        createdAt: new Date(Date.now() - 1800000).toISOString(),
        status: 'PENDING'
      }
    ];
  }

  return twinConfigs[userId];
}

export function updateTwinConfig(userId: string, partial: Partial<DigitalTwinConfig>): DigitalTwinConfig {
  const current = getOrCreateTwinConfig(userId);
  twinConfigs[userId] = { ...current, ...partial };
  return twinConfigs[userId];
}

export function getTwinLogs(userId: string): TwinActivityLog[] {
  getOrCreateTwinConfig(userId);
  return twinLogs[userId] || [];
}

export function getTwinDrafts(userId: string): TwinDraftItem[] {
  getOrCreateTwinConfig(userId);
  return twinDrafts[userId] || [];
}

/**
 * AI Writing Style Analysis from text samples
 */
export async function analyzeWritingStyle(userId: string, sampleTexts: string[]): Promise<any> {
  const config = getOrCreateTwinConfig(userId);
  
  if (!apiKey || sampleTexts.length === 0) {
    // Return updated config fallback
    config.writingStyle.sampleSnippets = sampleTexts;
    return config.writingStyle;
  }

  try {
    const prompt = `
Analyze the following writing samples from a user. Return ONLY a valid JSON object matching this exact schema:
{
  "formality": (number 0 to 100),
  "conciseness": (number 0 to 100),
  "enthusiasm": (number 0 to 100),
  "greetingPreference": "(likely greeting style)",
  "signoffPreference": "(likely sign-off style)",
  "customToneInstructions": "(summary of writing tone and rules)",
  "extractedKeywords": ["keyword1", "keyword2", "keyword3", "keyword4"]
}

Samples:
${sampleTexts.map((s, i) => `--- Sample ${i+1} ---\n${s}`).join('\n')}
`;

    const response = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [{ parts: [{ text: prompt }] }]
    });

    const outputText = response.response?.text() || '';
    const cleanJson = outputText.replace(/```json\n?|\n?```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    config.writingStyle = {
      ...config.writingStyle,
      ...parsed,
      sampleSnippets: sampleTexts
    };

    return config.writingStyle;
  } catch (err) {
    console.error('Error analyzing writing style:', err);
    config.writingStyle.sampleSnippets = sampleTexts;
    return config.writingStyle;
  }
}

/**
 * Generate response in User's Voice (Playground or Live Away Delegate)
 */
export async function generateTwinResponse(userId: string, userPrompt: string, channel: string = 'General Chat'): Promise<{ responseText: string; confidenceScore: number }> {
  const config = getOrCreateTwinConfig(userId);
  const style = config.writingStyle;

  const systemInstruction = `
You are the Digital Twin AI Delegate for ${config.roleTitle} in ${config.department}.
Your job is to speak and respond EXACTLY on behalf of the user, mimicking their exact tone, style, and domain authority.

User Role Context:
- Position: ${config.roleTitle} (${config.department})
- Responsibilities: ${config.responsibilities}
- Active Projects: ${config.keyProjects.join(', ')}

User Writing Style Profile:
- Formality Level: ${style.formality}/100
- Conciseness: ${style.conciseness}/100
- Tone Rules: ${style.customToneInstructions}
- Preferred Greeting: "${style.greetingPreference}"
- Preferred Sign-off: "${style.signoffPreference}"
- Voice Keywords: ${style.extractedKeywords.join(', ')}

Instructions:
1. Write the response in the FIRST PERSON ("I", "my", "our team") as the user.
2. Match their conciseness and tone rules.
3. Be professional, authentic, and accurate to their role context.
4. Do NOT say "As an AI" or "I am a digital twin". You ARE their avatar writing their message.
`;

  if (!apiKey) {
    const fallbackText = `${style.greetingPreference}\n\nThanks for reaching out regarding "${userPrompt.slice(0, 40)}...". Based on our ${config.keyProjects[0] || 'current roadmap'}, I've reviewed this and approve proceeding. Let me know if you need anything else.\n\n${style.signoffPreference}`;
    return { responseText: fallbackText, confidenceScore: 0.89 };
  }

  try {
    const res = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        { parts: [{ text: `${systemInstruction}\n\nIncoming Request / Prompt:\n"${userPrompt}"` }] }
      ]
    });

    const responseText = res.response?.text() || 'I am currently reviewing this item and will follow up shortly.';
    return { responseText, confidenceScore: 0.91 };
  } catch (err) {
    console.error('Error generating Twin response:', err);
    return {
      responseText: `${style.greetingPreference}\n\nI've received your note regarding this request. Let's touch base shortly.\n\n${style.signoffPreference}`,
      confidenceScore: 0.75
    };
  }
}

/**
 * Simulate Away Triage & Create Log/Draft
 */
export async function triageIncomingPing(userId: string, incomingMessage: string, senderName: string, channel: string) {
  const config = getOrCreateTwinConfig(userId);
  const { responseText, confidenceScore } = await generateTwinResponse(userId, incomingMessage, channel);

  const isAutonomous = config.mode === 'AUTONOMOUS' && confidenceScore >= config.confidenceThreshold;

  if (isAutonomous) {
    // Executed automatically
    const newLog: TwinActivityLog = {
      id: `log-${Date.now()}`,
      userId,
      timestamp: new Date().toISOString(),
      actionType: 'MESSAGE_REPLY',
      title: `Auto-replied to ${senderName}`,
      description: `Incoming: "${incomingMessage.slice(0, 50)}..." -> Auto-sent response in user's voice.`,
      channel,
      status: 'COMPLETED',
      confidenceScore
    };
    twinLogs[userId].unshift(newLog);
    return { action: 'AUTO_SENT', log: newLog, responseText };
  } else {
    // Queued as draft for user approval
    const newDraft: TwinDraftItem = {
      id: `draft-${Date.now()}`,
      userId,
      targetChannel: channel,
      recipientName: senderName,
      incomingPrompt: incomingMessage,
      draftedResponse: responseText,
      createdAt: new Date().toISOString(),
      status: 'PENDING'
    };

    const newLog: TwinActivityLog = {
      id: `log-${Date.now()}`,
      userId,
      timestamp: new Date().toISOString(),
      actionType: 'DRAFT_CREATED',
      title: `Prepared draft for ${senderName}`,
      description: `Created response draft for review: "${incomingMessage.slice(0, 45)}..."`,
      channel,
      status: 'PENDING_APPROVAL',
      confidenceScore
    };

    twinDrafts[userId].unshift(newDraft);
    twinLogs[userId].unshift(newLog);
    return { action: 'DRAFTED', draft: newDraft, log: newLog };
  }
}

/**
 * Handle Draft Actions (Approve / Reject)
 */
export function processDraftAction(userId: string, draftId: string, action: 'APPROVE' | 'REJECT', editedContent?: string): boolean {
  const drafts = getTwinDrafts(userId);
  const draft = drafts.find(d => d.id === draftId);
  if (!draft) return false;

  draft.status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED';
  if (editedContent) draft.draftedResponse = editedContent;

  // Record log
  const newLog: TwinActivityLog = {
    id: `log-${Date.now()}`,
    userId,
    timestamp: new Date().toISOString(),
    actionType: 'MESSAGE_REPLY',
    title: action === 'APPROVE' ? `Approved draft for ${draft.recipientName}` : `Discarded draft for ${draft.recipientName}`,
    description: action === 'APPROVE' ? `Sent response to ${draft.recipientName}: "${draft.draftedResponse.slice(0, 50)}..."` : `Draft dismissed.`,
    channel: draft.targetChannel,
    status: action === 'APPROVE' ? 'COMPLETED' : 'PENDING_APPROVAL',
    confidenceScore: 1.0
  };
  twinLogs[userId].unshift(newLog);

  return true;
}

/**
 * Generate Morning Handover Digest
 */
export function getHandoverDigest(userId: string): HandoverDigest {
  const config = getOrCreateTwinConfig(userId);
  const logs = getTwinLogs(userId);
  const drafts = getTwinDrafts(userId).filter(d => d.status === 'PENDING');

  const completedCount = logs.filter(l => l.status === 'COMPLETED').length;

  return {
    timestamp: new Date().toISOString(),
    periodSummary: `While you were away (${config.status.replace('_', ' ')}), your Digital Twin triaged incoming activity, auto-executed ${completedCount} routine items, and prepared ${drafts.length} response drafts for your sign-off.`,
    totalPingsTriaged: logs.length,
    tasksCompletedCount: completedCount,
    pendingApprovalsCount: drafts.length,
    logs,
    pendingDrafts: drafts,
    highPriorityAlerts: drafts.length > 0 ? [`${drafts.length} response drafts waiting for morning sign-off.`] : []
  };
}

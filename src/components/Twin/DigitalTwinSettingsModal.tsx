import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bot, 
  Sparkles, 
  Sliders, 
  UserCheck, 
  ShieldAlert, 
  MessageSquare, 
  X, 
  Send, 
  RefreshCw, 
  Check, 
  FileText,
  Zap,
  CheckCircle2
} from 'lucide-react';
import { useDigitalTwin } from '../../context/DigitalTwinContext';
import { TwinMode } from '../../types/twin';

export const DigitalTwinSettingsModal: React.FC = () => {
  const { 
    twinConfig, 
    updateConfig, 
    isSettingsOpen, 
    setIsSettingsOpen, 
    testTwin, 
    analyzeStyle,
    setPresenceStatus,
    setTwinMode
  } = useDigitalTwin();

  const [activeTab, setActiveTab] = useState<'persona' | 'role' | 'autonomy' | 'playground'>('persona');
  
  // Persona Form State
  const [formality, setFormality] = useState(twinConfig?.writingStyle?.formality ?? 65);
  const [conciseness, setConciseness] = useState(twinConfig?.writingStyle?.conciseness ?? 80);
  const [greeting, setGreeting] = useState(twinConfig?.writingStyle?.greetingPreference ?? 'Hi team,');
  const [signoff, setSignoff] = useState(twinConfig?.writingStyle?.signoffPreference ?? 'Best regards,');
  const [customTone, setCustomTone] = useState(twinConfig?.writingStyle?.customToneInstructions ?? '');
  const [sampleText, setSampleText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Role Form State
  const [roleTitle, setRoleTitle] = useState(twinConfig?.roleTitle ?? '');
  const [department, setDepartment] = useState(twinConfig?.department ?? '');
  const [responsibilities, setResponsibilities] = useState(twinConfig?.responsibilities ?? '');

  // Guardrails State
  const [confidence, setConfidence] = useState((twinConfig?.confidenceThreshold ?? 0.85) * 100);

  // Playground Chat State
  const [playgroundPrompt, setPlaygroundPrompt] = useState('');
  const [playgroundMessages, setPlaygroundMessages] = useState<Array<{ sender: 'user' | 'twin'; text: string; confidence?: number }>>([
    { sender: 'twin', text: "Hello! I'm your Digital Twin playground. Type a question or incoming request to test how I respond in your voice.", confidence: 1.0 }
  ]);
  const [isTesting, setIsTesting] = useState(false);

  // Sync local form state when twinConfig loads
  React.useEffect(() => {
    if (twinConfig) {
      setFormality(twinConfig.writingStyle?.formality ?? 65);
      setConciseness(twinConfig.writingStyle?.conciseness ?? 80);
      setGreeting(twinConfig.writingStyle?.greetingPreference ?? 'Hi team,');
      setSignoff(twinConfig.writingStyle?.signoffPreference ?? 'Best regards,');
      setCustomTone(twinConfig.writingStyle?.customToneInstructions ?? '');
      setRoleTitle(twinConfig.roleTitle ?? '');
      setDepartment(twinConfig.department ?? '');
      setResponsibilities(twinConfig.responsibilities ?? '');
      setConfidence((twinConfig.confidenceThreshold ?? 0.85) * 100);
    }
  }, [twinConfig]);

  const handleSavePersona = async () => {
    const currentStyle = twinConfig?.writingStyle || {
      formality: 65,
      conciseness: 80,
      enthusiasm: 50,
      greetingPreference: 'Hi team,',
      signoffPreference: 'Best regards,',
      customToneInstructions: '',
      sampleSnippets: [],
      extractedKeywords: []
    };

    await updateConfig({
      writingStyle: {
        ...currentStyle,
        formality,
        conciseness,
        greetingPreference: greeting,
        signoffPreference: signoff,
        customToneInstructions: customTone
      }
    });
  };

  const handleRunStyleAnalysis = async () => {
    if (!sampleText.trim()) return;
    setIsAnalyzing(true);
    const snippets = sampleText.split('\n\n').filter(s => s.trim().length > 0);
    const updatedStyle = await analyzeStyle(snippets);
    if (updatedStyle) {
      setFormality(updatedStyle.formality);
      setConciseness(updatedStyle.conciseness);
      setGreeting(updatedStyle.greetingPreference);
      setSignoff(updatedStyle.signoffPreference);
      setCustomTone(updatedStyle.customToneInstructions);
    }
    setIsAnalyzing(false);
  };

  const handleSaveRole = async () => {
    await updateConfig({
      roleTitle,
      department,
      responsibilities
    });
  };

  const handleSaveGuardrails = async (newMode?: TwinMode) => {
    await updateConfig({
      confidenceThreshold: confidence / 100,
      ...(newMode && { mode: newMode })
    });
  };

  const handleSendPlayground = async () => {
    if (!playgroundPrompt.trim() || isTesting) return;
    const prompt = playgroundPrompt;
    setPlaygroundPrompt('');
    setPlaygroundMessages(prev => [...prev, { sender: 'user', text: prompt }]);
    setIsTesting(true);

    const res = await testTwin(prompt);
    setPlaygroundMessages(prev => [...prev, { sender: 'twin', text: res.responseText, confidence: res.confidenceScore }]);
    setIsTesting(false);
  };

  return (
    <AnimatePresence>
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 md:p-8">
          {/* Motion Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSettingsOpen(false)}
            className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xl"
          />

          {/* Premium Modal Dialog */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative z-10 bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 rounded-[2rem] shadow-2xl shadow-indigo-500/10 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden"
          >

        
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Sparkles size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Aurora Twin Studio
                <span className="text-[10px] font-extrabold uppercase bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {(twinConfig?.status || 'AVAILABLE').replace('_', ' ')}
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Personalize your writing voice, role context, and away delegate guardrails</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPresenceStatus(twinConfig?.status === 'OFFLINE' ? 'AVAILABLE' : 'OFFLINE')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all border flex items-center gap-1.5 shadow-sm ${
                twinConfig?.status !== 'OFFLINE'
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${twinConfig?.status !== 'OFFLINE' ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-400'}`} />
              {twinConfig?.status !== 'OFFLINE' ? 'Twin Active' : 'Twin Disabled'}
            </button>
            <button 
              onClick={() => setIsSettingsOpen(false)}
              className="p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-white rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/30 dark:bg-zinc-950/30 overflow-x-auto">
          <button
            onClick={() => setActiveTab('persona')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'persona' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <Sliders size={14} />
            Persona & Writing Style
          </button>
          <button
            onClick={() => setActiveTab('role')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'role' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <UserCheck size={14} />
            Role & Scope Context
          </button>
          <button
            onClick={() => setActiveTab('autonomy')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'autonomy' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <ShieldAlert size={14} />
            Autonomy & Guardrails
          </button>
          <button
            onClick={() => setActiveTab('playground')}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
              activeTab === 'playground' 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <MessageSquare size={14} />
            Live Twin Playground
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* TAB 1: PERSONA & WRITING STYLE */}
          {activeTab === 'persona' && (
            <div className="space-y-6">
              
              {/* Style Sliders */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-700 dark:text-zinc-300">Formality Level</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{formality}% ({formality > 50 ? 'Formal' : 'Casual'})</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={formality} 
                    onChange={e => setFormality(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                    <span>Casual / Friendly</span>
                    <span>Corporate / Formal</span>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-zinc-700 dark:text-zinc-300">Conciseness</span>
                    <span className="text-indigo-600 dark:text-indigo-400">{conciseness}% ({conciseness > 50 ? 'Direct & Short' : 'Detailed & Thorough'})</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={conciseness} 
                    onChange={e => setConciseness(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-zinc-400 mt-1">
                    <span>Detailed Explanations</span>
                    <span>Bullet Points & Short</span>
                  </div>
                </div>
              </div>

              {/* Preferences Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Preferred Greeting</label>
                  <input 
                    type="text" 
                    value={greeting} 
                    onChange={e => setGreeting(e.target.value)} 
                    placeholder="e.g. Hi team, or Hey,"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Preferred Sign-off</label>
                  <input 
                    type="text" 
                    value={signoff} 
                    onChange={e => setSignoff(e.target.value)} 
                    placeholder="e.g. Best regards, or Cheers,"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Custom Tone & Voice Guidelines</label>
                <textarea 
                  rows={3} 
                  value={customTone} 
                  onChange={e => setCustomTone(e.target.value)} 
                  placeholder="Describe your writing voice (e.g. Direct, data-backed, polite, avoids jargon...)"
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>

              {/* Sample Analysis Box */}
              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    AI Style Analyzer (Paste Past Emails or Messages)
                  </h4>
                  {(twinConfig?.writingStyle?.extractedKeywords || []).length > 0 && (
                    <div className="flex gap-1">
                      {twinConfig.writingStyle.extractedKeywords.map((k, i) => (
                        <span key={i} className="text-[9px] font-bold bg-indigo-500/10 text-indigo-500 px-1.5 py-0.5 rounded">
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <textarea 
                  rows={3} 
                  value={sampleText} 
                  onChange={e => setSampleText(e.target.value)} 
                  placeholder="Paste 2-3 sample emails or Slack messages you wrote..."
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-white"
                />
                <button
                  onClick={handleRunStyleAnalysis}
                  disabled={isAnalyzing || !sampleText.trim()}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {isAnalyzing ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                  Analyze Writing Style
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={handleSavePersona}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Save Persona
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ROLE & SCOPE CONTEXT */}
          {activeTab === 'role' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Job Title / Role</label>
                  <input 
                    type="text" 
                    value={roleTitle} 
                    onChange={e => setRoleTitle(e.target.value)} 
                    placeholder="e.g. Senior Product Manager"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Department</label>
                  <input 
                    type="text" 
                    value={department} 
                    onChange={e => setDepartment(e.target.value)} 
                    placeholder="e.g. Platform Operations"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Core Responsibilities & Decision Scope</label>
                <textarea 
                  rows={4} 
                  value={responsibilities} 
                  onChange={e => setResponsibilities(e.target.value)} 
                  placeholder="Describe what you approve, manage, and triage on a daily basis..."
                  className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">Active Projects Context</label>
                <div className="flex flex-wrap gap-2 p-3 bg-zinc-50 dark:bg-zinc-800/30 rounded-lg border border-zinc-200 dark:border-zinc-800">
                  {(twinConfig?.keyProjects || []).map((proj, i) => (
                    <span key={i} className="text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 px-2.5 py-1 rounded-md text-zinc-800 dark:text-zinc-200 font-medium">
                      {proj}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button 
                  onClick={handleSaveRole}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Save Role Context
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: AUTONOMY & GUARDRAILS */}
          {activeTab === 'autonomy' && (
            <div className="space-y-6">
              
              {/* Autonomy Mode Cards */}
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-3">Twin Away Delegation Mode</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  <div 
                    onClick={() => setTwinMode('DRAFT_ONLY')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      twinConfig?.mode === 'DRAFT_ONLY'
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <FileText size={18} className={twinConfig?.mode === 'DRAFT_ONLY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'} />
                      {twinConfig?.mode === 'DRAFT_ONLY' && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Ghostwriter (Drafts Only)</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Prepares responses & updates as drafts. Requires 1-click morning sign-off.</p>
                  </div>

                  <div 
                    onClick={() => setTwinMode('AUTONOMOUS')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      twinConfig?.mode === 'AUTONOMOUS'
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Zap size={18} className={twinConfig?.mode === 'AUTONOMOUS' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'} />
                      {twinConfig?.mode === 'AUTONOMOUS' && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Autonomous Delegate</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Auto-sends answers to routine internal pings above your confidence threshold.</p>
                  </div>

                  <div 
                    onClick={() => setTwinMode('EMERGENCY_ONLY')}
                    className={`p-4 rounded-xl border cursor-pointer transition-all ${
                      twinConfig?.mode === 'EMERGENCY_ONLY'
                        ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <ShieldAlert size={18} className={twinConfig?.mode === 'EMERGENCY_ONLY' ? 'text-indigo-600 dark:text-indigo-400' : 'text-zinc-400'} />
                      {twinConfig?.mode === 'EMERGENCY_ONLY' && <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400" />}
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900 dark:text-white">Emergency Gate (DND)</h4>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">Suppresses all non-critical notifications; alerts phone only if urgent criteria met.</p>
                  </div>

                </div>
              </div>

              {/* Confidence Slider */}
              <div className="bg-zinc-50 dark:bg-zinc-800/30 p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-zinc-700 dark:text-zinc-300">Autonomous Confidence Threshold</span>
                  <span className="text-indigo-600 dark:text-indigo-400">{confidence}%</span>
                </div>
                <input 
                  type="range" 
                  min="50" 
                  max="99" 
                  value={confidence} 
                  onChange={e => setConfidence(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  If the Twin's AI certainty is below {confidence}%, it will automatically fallback to creating a draft instead of auto-sending.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button 
                  onClick={() => handleSaveGuardrails()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Check size={14} />
                  Save Guardrails
                </button>
              </div>
            </div>
          )}

          {/* TAB 4: LIVE TWIN PLAYGROUND */}
          {activeTab === 'playground' && (
            <div className="flex flex-col h-[400px] border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden bg-zinc-50/50 dark:bg-zinc-950/50">
              <div className="px-4 py-2 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-[11px] font-bold text-zinc-500 flex items-center gap-1.5">
                <Bot size={14} className="text-indigo-500" />
                Test how your Digital Twin speaks and responds in real time
              </div>

              {/* Chat Thread */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {playgroundMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-xl p-3 text-xs ${
                      msg.sender === 'user' 
                        ? 'bg-indigo-600 text-white font-medium rounded-br-none' 
                        : 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 rounded-bl-none shadow-sm'
                    }`}>
                      <p className="whitespace-pre-wrap leading-relaxed">{msg.text}</p>
                      {msg.confidence !== undefined && msg.sender === 'twin' && (
                        <div className="mt-2 pt-1 border-t border-zinc-100 dark:border-zinc-700/50 text-[9px] text-zinc-400 flex items-center gap-1">
                          <span>AI Confidence Score:</span>
                          <span className="font-bold text-indigo-500">{(msg.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isTesting && (
                  <div className="flex justify-start">
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 text-xs text-zinc-400 flex items-center gap-2">
                      <RefreshCw size={12} className="animate-spin text-indigo-500" />
                      Twin is drafting response...
                    </div>
                  </div>
                )}
              </div>

              {/* Input Footer */}
              <div className="p-3 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex gap-2">
                <input 
                  type="text" 
                  value={playgroundPrompt} 
                  onChange={e => setPlaygroundPrompt(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendPlayground()}
                  placeholder="Ask your Twin a question (e.g. 'What is our status on the API project?')"
                  className="flex-1 px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-white"
                />
                <button
                  onClick={handleSendPlayground}
                  disabled={isTesting || !playgroundPrompt.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                >
                  <Send size={12} />
                  Send
                </button>
              </div>
            </div>
          )}

        </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

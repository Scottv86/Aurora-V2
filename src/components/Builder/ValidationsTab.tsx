import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Plus,
  Trash2,
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Code,
  Hash,
  Search,
  FunctionSquare,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  Copy,
  ListChecks,
  XCircle,
  SlidersHorizontal,
  Wand2,
  AlertCircle,
  Info,
  PanelLeft,
  PanelRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import {
  ValidationRule,
  ValidationConditionNode,
  ValidationTestCase,
  evaluateRuleExpression,
  compileConditionTreeToExpression,
  validateExpressionSyntax
} from '../../lib/validationEngine';
import {
  VisualRuleBuilder,
  createDefaultConditionGroup,
  summarizeConditionTree
} from './VisualRuleBuilder';
import { generateExpression } from '../../services/aiService';

interface ValidationsTabProps {
  validationRules: ValidationRule[];
  setValidationRules: React.Dispatch<React.SetStateAction<ValidationRule[]>>;
  fields: any[];
  showAiAssist?: boolean;
  globalListData?: Record<string, any[]>;
}

const COMMON_FUNCTIONS = [
  { name: 'IF(cond, true, false)', template: 'IF(, , )', desc: 'Returns value based on condition' },
  { name: 'AND(c1, c2, ...)', template: 'AND(, )', desc: 'True if all conditions are true' },
  { name: 'OR(c1, c2, ...)', template: 'OR(, )', desc: 'True if any condition is true' },
  { name: 'NOT(cond)', template: 'NOT()', desc: 'Negates a condition' },
  { name: 'IS_NULL(val)', template: 'IS_NULL()', desc: 'Checks if value is empty' },
  { name: 'SUM(a, b, ...)', template: 'SUM(, )', desc: 'Calculates sum of inputs' },
  { name: 'AVG(a, b, ...)', template: 'AVG(, )', desc: 'Calculates average of inputs' },
  { name: 'ROUND(n, d)', template: 'ROUND(, 0)', desc: 'Rounds number to decimal places' },
  { name: 'TODAY()', template: 'TODAY()', desc: 'Returns current date' },
  { name: 'NOW()', template: 'NOW()', desc: 'Returns current timestamp' },
  { name: 'TIMESPAN(unit, d1, d2)', template: "TIMESPAN('days', , )", desc: 'Difference between two dates' },
  { name: 'ADD_DAYS(date, days)', template: 'ADD_DAYS(, 7)', desc: 'Adds days to a date' },
];

export const ValidationsTab: React.FC<ValidationsTabProps> = ({
  validationRules,
  setValidationRules,
  fields,
  showAiAssist = true,
  globalListData = {}
}) => {
  const [selectedRuleId, setSelectedRuleId] = useState<string | null>(null);

  // Resizable & Collapsible Sidebars (aligned with Forms & Workflows)
  const [leftWidth, setLeftWidth] = useState(264);
  const [rightWidth, setRightWidth] = useState(320);
  const [isLeftCollapsed, setIsLeftCollapsed] = useState(false);
  const [isRightCollapsed, setIsRightCollapsed] = useState(false);
  const [resizingSide, setResizingSide] = useState<'left' | 'right' | null>(null);
  const resizingSideRef = useRef<'left' | 'right' | null>(null);

  // Editor States
  const [name, setName] = useState('');
  const [mode, setMode] = useState<'visual' | 'expression'>('visual');
  const [conditionTree, setConditionTree] = useState<ValidationConditionNode>(() => createDefaultConditionGroup(fields));
  const [expression, setExpression] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isActive, setIsActive] = useState(true);
  const [severity, setSeverity] = useState<'error' | 'warning' | 'info'>('error');
  const [enforcement, setEnforcement] = useState<'block' | 'confirm' | 'allow'>('block');
  const [showBanner, setShowBanner] = useState<boolean>(true);
  const [showInline, setShowInline] = useState<boolean>(true);
  const [showToast, setShowToast] = useState<boolean>(true);
  const [triggerOn, setTriggerOn] = useState<'always' | 'create' | 'update'>('always');
  const [targetFieldIds, setTargetFieldIds] = useState<string[]>([]);
  const [exemptRoles, setExemptRoles] = useState<string[]>([]);
  const [newRoleInput, setNewRoleInput] = useState('');
  const [newTestCaseName, setNewTestCaseName] = useState('');
  const [newTestCaseExpected, setNewTestCaseExpected] = useState<boolean>(true);
  const [testCaseResults, setTestCaseResults] = useState<Record<string, { passed: boolean; matchedExpected: boolean }>>({});

  // AI State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Right Sidebar Tab State
  const [rightTab, setRightTab] = useState<'sandbox' | 'reference' | 'ai'>('sandbox');

  // Sandbox State
  const [sandboxData, setSandboxData] = useState<Record<string, any>>({});
  const [sandboxResult, setSandboxResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [batchResults, setBatchResults] = useState<{ id: string; name: string; severity: string; passed: boolean; errorMessage: string }[] | null>(null);

  // Search & Filtering States
  const [ruleSearchQuery, setRuleSearchQuery] = useState('');
  const [refSearchQuery, setRefSearchQuery] = useState('');
  const [refTab, setRefTab] = useState<'fields' | 'functions'>('fields');

  // IntelliSense State
  const [suggestions, setSuggestions] = useState<{ label: string; value: string; type: 'variable' | 'function'; description?: string }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [suggestionPos, setSuggestionPos] = useState({ top: 0, left: 0 });
  const [suggestionTrigger, setSuggestionTrigger] = useState<{ type: 'variable' | 'function'; index: number } | null>(null);

  const suggestionsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const dataFields = useMemo(
    () => fields.filter(f => !['heading', 'divider', 'spacer', 'container', 'section'].includes(f.type)),
    [fields]
  );

  const selectedRule = useMemo(() => {
    return validationRules.find(r => r.id === selectedRuleId) || null;
  }, [validationRules, selectedRuleId]);

  // Auto-select the first rule on mount if none selected
  useEffect(() => {
    if (!selectedRuleId && validationRules && validationRules.length > 0) {
      setSelectedRuleId(validationRules[0].id);
    }
  }, [validationRules, selectedRuleId]);

  // Sidebar resize listeners
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingSideRef.current) return;
      if (resizingSideRef.current === 'left') {
        const next = Math.min(380, Math.max(220, e.clientX - 56));
        setLeftWidth(next);
      } else {
        const next = Math.min(440, Math.max(260, window.innerWidth - e.clientX));
        setRightWidth(next);
      }
    };
    const handleMouseUp = () => {
      resizingSideRef.current = null;
      setResizingSide(null);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startResize = (side: 'left' | 'right') => {
    resizingSideRef.current = side;
    setResizingSide(side);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  };

  // Load selected rule into form
  useEffect(() => {
    if (selectedRule) {
      setName(selectedRule.name);
      const ruleMode: 'visual' | 'expression' =
        selectedRule.mode || (selectedRule.conditionTree ? 'visual' : 'expression');
      setMode(ruleMode);
      setConditionTree(selectedRule.conditionTree || createDefaultConditionGroup(dataFields));
      setExpression(selectedRule.expression || '');
      setErrorMessage(selectedRule.errorMessage);
      setIsActive(selectedRule.isActive);
      const sev = selectedRule.severity || 'error';
      setSeverity(sev);
      setEnforcement(
        selectedRule.enforcement ||
        (sev === 'error' ? 'block' : sev === 'warning' && selectedRule.bypassMode === 'confirm' ? 'confirm' : 'allow')
      );
      setShowBanner(selectedRule.showBanner !== false);
      setShowInline(selectedRule.showInline !== false);
      setShowToast(selectedRule.showToast !== false);
      setTriggerOn(selectedRule.triggerOn || 'always');
      setTargetFieldIds(selectedRule.targetFieldIds || []);
      setExemptRoles(selectedRule.exemptRoles || []);
    } else {
      setName('');
      setMode('visual');
      setConditionTree(createDefaultConditionGroup(dataFields));
      setExpression('');
      setErrorMessage('');
      setIsActive(true);
      setSeverity('error');
      setEnforcement('block');
      setShowBanner(true);
      setShowInline(true);
      setShowToast(true);
      setTriggerOn('always');
      setTargetFieldIds([]);
      setExemptRoles([]);
    }
    setSandboxResult(null);
    setBatchResults(null);
    setTestCaseResults({});
    setAiPrompt('');
  }, [selectedRuleId, selectedRule]);

  const updateCurrentRule = (updates: Partial<ValidationRule>) => {
    if (!selectedRuleId) return;
    setValidationRules(prev => prev.map(r => r.id === selectedRuleId ? { ...r, ...updates } : r));
  };

  const handleConditionTreeChange = (nextTree: ValidationConditionNode) => {
    setConditionTree(nextTree);
    const compiled = compileConditionTreeToExpression(nextTree, dataFields);
    setExpression(compiled);
    updateCurrentRule({
      mode: 'visual',
      conditionTree: nextTree,
      expression: compiled
    });
  };

  const handleModeSwitch = (nextMode: 'visual' | 'expression') => {
    setMode(nextMode);
    if (nextMode === 'visual') {
      const nextTree = selectedRule?.conditionTree || conditionTree || createDefaultConditionGroup(dataFields);
      const compiled = compileConditionTreeToExpression(nextTree, dataFields);
      setConditionTree(nextTree);
      setExpression(compiled);
      updateCurrentRule({ mode: 'visual', conditionTree: nextTree, expression: compiled });
    } else {
      updateCurrentRule({ mode: 'expression', expression });
    }
  };

  // Live syntax diagnostics for expression mode
  const diagnostics = useMemo(() => {
    return validateExpressionSyntax(expression, dataFields);
  }, [expression, dataFields]);

  // Sync Sandbox inputs structure when expression changes
  useEffect(() => {
    const variables: string[] = [];
    const regex = /\{([a-zA-Z0-9_ ]+)\}/g;
    let match;
    while ((match = regex.exec(expression)) !== null) {
      variables.push(match[1]);
    }
    const idRegex = /\{\{([a-zA-Z0-9_]+)\}\}/g;
    while ((match = idRegex.exec(expression)) !== null) {
      variables.push(match[1]);
    }

    const uniqueVars = [...new Set(variables)];

    setSandboxData(prev => {
      const nextData = { ...prev };
      uniqueVars.forEach(v => {
        const foundField = fields.find(f => f.name === v || f.id === v || f.label === v);
        if (nextData[v] === undefined) {
          nextData[v] = foundField?.defaultValue ?? (foundField?.type === 'number' || foundField?.type === 'currency' ? 0 : '');
        }
      });
      return nextData;
    });
  }, [expression, fields]);

  // Normalize sandbox data keys so {slug}, {Label}, and {{id}} all resolve
  const buildSandboxEvalData = (sourceData: Record<string, any> = sandboxData) => {
    const evalData: Record<string, any> = { ...sourceData };
    Object.entries(sourceData).forEach(([key, val]) => {
      const matched = fields.find(f => f.name === key || f.id === key || f.label === key);
      if (matched) {
        if (matched.id) evalData[matched.id] = val;
        if (matched.name) evalData[matched.name] = val;
      }
    });
    return evalData;
  };

  // Autocomplete Suggestions handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSuggestions]);

  const applySuggestion = (suggestion: any) => {
    if (!suggestionTrigger || !textareaRef.current) return;

    const textarea = textareaRef.current;
    const start = suggestionTrigger.index;
    const end = textarea.selectionStart;
    const currentVal = textarea.value;

    const func = suggestion.type === 'function' ? COMMON_FUNCTIONS.find(f => f.name.split('(')[0] === suggestion.label) : null;
    const isZeroArg = func?.template?.endsWith('()');

    const insertion = suggestion.type === 'variable' ? suggestion.value : `${suggestion.label}()`;
    const cursorOffset = (suggestion.type === 'function' && !isZeroArg) ? insertion.length - 1 : insertion.length;
    const newVal = currentVal.substring(0, start) + insertion + currentVal.substring(end);

    setExpression(newVal);
    updateCurrentRule({ expression: newVal });
    setShowSuggestions(false);
    setSuggestionTrigger(null);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + cursorOffset, start + cursorOffset);
      handleCursorMove();
    }, 0);
  };

  const handleCursorMove = () => {
    if (!textareaRef.current) return;
    const cursorIndex = textareaRef.current.selectionStart;
    const currentVal = textareaRef.current.value;

    if (showSuggestions && suggestionTrigger) {
      const textBeforeCursor = currentVal.substring(0, cursorIndex);
      if (suggestionTrigger.type === 'variable') {
        const match = textBeforeCursor.substring(suggestionTrigger.index + 1);
        if (match.includes('}') || match.includes('\n') || cursorIndex <= suggestionTrigger.index) {
          setShowSuggestions(false);
          setSuggestionTrigger(null);
        } else {
          updateSuggestions('variable', match);
          setTimeout(() => updateSuggestionPos(suggestionTrigger.index + 1), 0);
        }
      } else if (suggestionTrigger.type === 'function') {
        const words = textBeforeCursor.split(/[\s+\-*/%(),]/);
        const lastWord = words[words.length - 1];
        if (cursorIndex <= suggestionTrigger.index) {
          setShowSuggestions(false);
          setSuggestionTrigger(null);
        } else {
          updateSuggestions('universal', lastWord);
          setTimeout(() => updateSuggestionPos(suggestionTrigger.index), 0);
        }
      }
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    const cursorIndex = e.target.selectionStart;
    setExpression(newVal);
    updateCurrentRule({ expression: newVal });
    setTimeout(handleCursorMove, 0);

    const lastChar = newVal[cursorIndex - 1];
    const textBeforeCursor = newVal.substring(0, cursorIndex);
    const words = textBeforeCursor.split(/[\s+\-*/%(),]/);
    const lastWord = words[words.length - 1];

    if (lastChar === '{') {
      setSuggestionTrigger({ type: 'variable', index: cursorIndex - 1 });
      updateSuggestions('variable', '');
      setTimeout(() => updateSuggestionPos(cursorIndex), 0);
    } else if (suggestionTrigger?.type === 'variable') {
      const match = textBeforeCursor.substring(suggestionTrigger.index + 1);
      if (match.includes('}') || match.includes('\n')) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      } else {
        updateSuggestions('variable', match);
        setTimeout(() => updateSuggestionPos(suggestionTrigger.index + 1), 0);
      }
    } else if (/^[A-Za-z]$/.test(lastChar) && (words.length === 1 || /[\s+\-*/%(),]/.test(newVal[cursorIndex - 2]))) {
      setSuggestionTrigger({ type: 'function', index: cursorIndex - lastWord.length });
      updateSuggestions('universal', lastWord);
      setTimeout(() => updateSuggestionPos(cursorIndex - lastWord.length), 0);
    } else if (suggestionTrigger?.type === 'function') {
      if (/[\s+\-*/%(),]/.test(lastChar) || lastChar === undefined) {
        setShowSuggestions(false);
        setSuggestionTrigger(null);
      } else {
        updateSuggestions('universal', lastWord);
        setTimeout(() => updateSuggestionPos(suggestionTrigger.index), 0);
      }
    } else {
      setShowSuggestions(false);
      setSuggestionTrigger(null);
    }
  };

  const updateSuggestions = (type: 'variable' | 'function' | 'universal', query: string) => {
    const q = query.toLowerCase();
    let matches: any[] = [];

    const availableVariables = dataFields.map(f => {
      const hasSlug = !!f.name;
      return {
        label: f.name || f.label || f.id,
        value: hasSlug ? `{${f.name}}` : `{{${f.id}}}`,
        type: 'variable' as const,
        description: `${f.label} (${String(f.type || 'text').toUpperCase()})`
      };
    });

    const availableFunctions = COMMON_FUNCTIONS.map(f => ({
      label: f.name.split('(')[0],
      value: f.template,
      type: 'function' as const,
      description: f.desc
    }));

    if (type === 'variable') {
      matches = availableVariables.filter(v => v.label.toLowerCase().includes(q));
    } else if (type === 'function') {
      matches = availableFunctions.filter(f => f.label.toLowerCase().includes(q));
    } else {
      const vMatches = availableVariables.filter(v => v.label.toLowerCase().includes(q));
      const fMatches = availableFunctions.filter(f => f.label.toLowerCase().includes(q));
      matches = [...vMatches, ...fMatches];
    }

    setSuggestions(matches);
    setShowSuggestions(matches.length > 0);
    setSelectedIndex(0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        applySuggestion(suggestions[selectedIndex]);
        return;
      }
      if (e.key === 'Escape') {
        setShowSuggestions(false);
        return;
      }
    }
  };

  const updateSuggestionPos = (index: number) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const mirror = document.createElement('div');
    const style = window.getComputedStyle(textarea);

    mirror.style.position = 'absolute';
    mirror.style.visibility = 'hidden';
    mirror.style.whiteSpace = 'pre-wrap';
    mirror.style.wordWrap = 'break-word';
    mirror.style.width = style.width;
    mirror.style.padding = style.padding;
    mirror.style.lineHeight = style.lineHeight;
    mirror.style.fontSize = style.fontSize;
    mirror.style.fontFamily = style.fontFamily;
    mirror.style.fontWeight = style.fontWeight;

    textarea.parentElement?.appendChild(mirror);

    const textBefore = textarea.value.substring(0, index);
    const span = document.createElement('span');
    span.textContent = textBefore;
    mirror.appendChild(span);

    const caret = document.createElement('span');
    caret.textContent = '|';
    mirror.appendChild(caret);

    const rect = caret.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    textarea.parentElement?.removeChild(mirror);

    setSuggestionPos({
      top: rect.top - textareaRect.top + textarea.scrollTop + 22,
      left: rect.left - textareaRect.left + textarea.scrollLeft
    });
  };

  // Run single rule sandbox evaluation
  const runSandboxTest = () => {
    try {
      const evalData = buildSandboxEvalData();
      const result = evaluateRuleExpression(expression, evalData, fields, globalListData);
      setSandboxResult({ success: result });
      setBatchResults(null);
    } catch (err: any) {
      setSandboxResult({ success: false, error: err.message || 'Expression evaluation error' });
    }
  };

  // Run all active rules against current sandbox data
  const runAllRulesTest = () => {
    const evalData = buildSandboxEvalData();
    const activeRules = validationRules.filter(r => r.isActive);
    const results = activeRules.map(rule => {
      let passed = true;
      const expr =
        rule.mode === 'visual' && rule.conditionTree
          ? compileConditionTreeToExpression(rule.conditionTree, dataFields) || rule.expression
          : rule.expression;
      try {
        passed = evaluateRuleExpression(expr, evalData, fields, globalListData);
      } catch {
        passed = false;
      }
      return {
        id: rule.id,
        name: rule.name,
        severity: rule.severity || 'error',
        passed,
        errorMessage: rule.errorMessage
      };
    });
    setBatchResults(results);
    setSandboxResult(null);
  };

  const handleSaveTestCase = () => {
    if (!selectedRule || !newTestCaseName.trim()) return;
    const tc: ValidationTestCase = {
      id: `tc_${Date.now()}`,
      name: newTestCaseName.trim(),
      data: { ...sandboxData },
      expectedValid: newTestCaseExpected
    };
    const nextCases = [...(selectedRule.testCases || []), tc];
    updateCurrentRule({ testCases: nextCases });
    setNewTestCaseName('');
    toast.success('Test case saved');
  };

  const handleRunSavedTestCases = () => {
    if (!selectedRule?.testCases?.length) return;
    const nextResults: Record<string, { passed: boolean; matchedExpected: boolean }> = {};
    selectedRule.testCases.forEach(tc => {
      const evalData = buildSandboxEvalData(tc.data);
      let actualValid = true;
      try {
        actualValid = evaluateRuleExpression(expression, evalData, fields, globalListData);
      } catch {
        actualValid = false;
      }
      nextResults[tc.id] = {
        passed: actualValid,
        matchedExpected: actualValid === tc.expectedValid
      };
    });
    setTestCaseResults(nextResults);
  };

  const handleDeleteTestCase = (tcId: string) => {
    if (!selectedRule) return;
    updateCurrentRule({
      testCases: (selectedRule.testCases || []).filter(tc => tc.id !== tcId)
    });
  };

  // Inline insert field token helper
  const handleInsertToken = (token: string) => {
    if (mode !== 'expression') {
      toast.info('Switch to Expression mode to insert formula tokens.');
      return;
    }
    const textarea = textareaRef.current;
    if (!textarea) {
      const next = expression + token;
      setExpression(next);
      updateCurrentRule({ expression: next });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const before = text.substring(0, start);
    const after = text.substring(end, text.length);

    const newVal = before + token + after;
    setExpression(newVal);
    updateCurrentRule({ expression: newVal });

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + token.length, start + token.length);
    }, 50);
  };

  // AI expression generation handler
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) return;
    setIsGenerating(true);
    try {
      const generated = await generateExpression(aiPrompt, fields, []);
      if (generated && !generated.startsWith('//')) {
        setMode('expression');
        setExpression(generated);
        const nextName = name || aiPrompt.substring(0, 40) + (aiPrompt.length > 45 ? '...' : '');
        const nextError = errorMessage || `Validation failed: ${aiPrompt.toLowerCase()}`;
        if (!name) setName(nextName);
        if (!errorMessage) setErrorMessage(nextError);
        updateCurrentRule({
          mode: 'expression',
          expression: generated,
          name: nextName,
          errorMessage: nextError
        });
        toast.success('Expression generated');
      } else {
        throw new Error(generated || 'No expression returned');
      }
    } catch (err) {
      console.error(err);
      toast.error('AI generation failed. Please try a simpler description.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCreateRule = (preset?: 'required' | 'numeric' | 'date_range' | 'email') => {
    const newId = `rule-${Date.now()}`;
    const firstField = dataFields[0];
    const numField = dataFields.find(f => ['number', 'currency', 'calculation'].includes(f.type)) || firstField;
    const dateField = dataFields.find(f => ['date', 'datetime'].includes(f.type)) || firstField;
    const emailField = dataFields.find(f => f.type === 'email') || firstField;

    let tree = createDefaultConditionGroup(dataFields);
    let ruleName = 'New Validation Rule';
    let ruleErr = 'Validation error: check your input.';
    let targetIds: string[] = [];

    if (preset === 'required' && firstField) {
      ruleName = `${firstField.label || 'Field'} is Required`;
      ruleErr = `Please provide a value for ${firstField.label || 'this field'}.`;
      targetIds = [firstField.id];
      tree = {
        id: `grp_${Date.now()}`,
        type: 'group',
        logicalOperator: 'AND',
        rules: [{ id: `c_${Date.now()}`, type: 'rule', fieldId: firstField.id, operator: 'not_empty', valueType: 'literal', value: '' }]
      };
    } else if (preset === 'numeric' && numField) {
      ruleName = `${numField.label || 'Amount'} Minimum Check`;
      ruleErr = `${numField.label || 'Amount'} must be greater than 0.`;
      targetIds = [numField.id];
      tree = {
        id: `grp_${Date.now()}`,
        type: 'group',
        logicalOperator: 'AND',
        rules: [{ id: `c_${Date.now()}`, type: 'rule', fieldId: numField.id, operator: 'greater_than', valueType: 'literal', value: 0 }]
      };
    } else if (preset === 'date_range' && dateField) {
      ruleName = `${dateField.label || 'Date'} Must Be Today or Later`;
      ruleErr = `${dateField.label || 'Date'} cannot be in the past.`;
      targetIds = [dateField.id];
      tree = {
        id: `grp_${Date.now()}`,
        type: 'group',
        logicalOperator: 'AND',
        rules: [{ id: `c_${Date.now()}`, type: 'rule', fieldId: dateField.id, operator: 'on_or_after', valueType: 'variable', value: '{{today}}' }]
      };
    } else if (preset === 'email' && emailField) {
      ruleName = `Valid ${emailField.label || 'Email'} Format`;
      ruleErr = `Please enter a valid email address.`;
      targetIds = [emailField.id];
      tree = {
        id: `grp_${Date.now()}`,
        type: 'group',
        logicalOperator: 'AND',
        rules: [{ id: `c_${Date.now()}`, type: 'rule', fieldId: emailField.id, operator: 'matches_regex', valueType: 'literal', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }]
      };
    }

    const compiled = compileConditionTreeToExpression(tree, dataFields);
    const newRule: ValidationRule = {
      id: newId,
      name: ruleName,
      mode: 'visual',
      conditionTree: tree,
      expression: compiled,
      errorMessage: ruleErr,
      severity: 'error',
      enforcement: 'block',
      isActive: true,
      showBanner: true,
      showInline: true,
      showToast: true,
      bypassMode: 'none',
      triggerOn: 'always',
      targetFieldIds: targetIds
    };
    setValidationRules(prev => [...prev, newRule]);
    setSelectedRuleId(newId);
    setSandboxResult(null);
    setBatchResults(null);
  };

  const handleDuplicateRule = (e: React.MouseEvent, rule: ValidationRule) => {
    e.stopPropagation();
    const newId = `rule-${Date.now()}`;
    const copy: ValidationRule = {
      ...rule,
      id: newId,
      name: `${rule.name} (Copy)`
    };
    setValidationRules(prev => [...prev, copy]);
    setSelectedRuleId(newId);
  };

  // Sidebar list filters
  const filteredRules = validationRules.filter(r =>
    r.name.toLowerCase().includes(ruleSearchQuery.toLowerCase()) ||
    r.expression.toLowerCase().includes(ruleSearchQuery.toLowerCase())
  );

  const filteredFields = dataFields.filter(f =>
    (f.label || '').toLowerCase().includes(refSearchQuery.toLowerCase()) ||
    (f.name || '').toLowerCase().includes(refSearchQuery.toLowerCase())
  );

  const filteredFunctions = COMMON_FUNCTIONS.filter(func =>
    func.name.toLowerCase().includes(refSearchQuery.toLowerCase()) ||
    func.desc.toLowerCase().includes(refSearchQuery.toLowerCase())
  );

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'number': return { label: 'NUM', color: 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/60' };
      case 'currency': return { label: 'CUR', color: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60' };
      case 'text':
      case 'longText': return { label: 'TXT', color: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60' };
      case 'calculation': return { label: 'CALC', color: 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/60' };
      case 'lookup': return { label: 'REL', color: 'bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/60' };
      default: return { label: 'VAR', color: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700' };
    }
  };

  return (
    <div className="flex h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden relative">

      {/* 1. Left Rules Sidebar (Collapsible & Resizable) */}
      <AnimatePresence initial={false}>
        {!isLeftCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: leftWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={resizingSide === 'left' ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="relative flex-shrink-0 bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
          {/* Header */}
          <div className="h-11 px-3 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Rules</span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-medium text-zinc-500">
                {validationRules.length}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleCreateRule()}
                className="h-7 px-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus size={12} />
                <span>New</span>
              </button>
              <button
                onClick={() => setIsLeftCollapsed(true)}
                className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer"
                title="Collapse Rules panel"
              >
                <ChevronLeft size={14} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-2.5 border-b border-zinc-100 dark:border-zinc-800/80">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={ruleSearchQuery}
                onChange={(e) => setRuleSearchQuery(e.target.value)}
                placeholder="Search rules..."
                className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500 transition-colors dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Dense Flat Rules List */}
          <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
            {filteredRules.map(rule => {
              const isSelected = selectedRuleId === rule.id;
              const isVisual = rule.mode === 'visual' || !!rule.conditionTree;
              const previewText = isVisual && rule.conditionTree
                ? summarizeConditionTree(rule.conditionTree, dataFields)
                : (rule.expression || 'No condition');
              return (
                <div
                  key={rule.id}
                  onClick={() => {
                    setSelectedRuleId(rule.id);
                    setSandboxResult(null);
                  }}
                  className={cn(
                    "w-full flex flex-col gap-1 px-2.5 py-2 rounded-lg text-left transition-colors border cursor-pointer group",
                    isSelected
                      ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60"
                      : "bg-transparent border-transparent hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                  )}
                >
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full shrink-0",
                          !rule.isActive
                            ? "bg-zinc-300 dark:bg-zinc-700"
                            : rule.severity === 'warning'
                              ? "bg-amber-500"
                              : rule.severity === 'info'
                                ? "bg-blue-500"
                                : "bg-rose-500"
                        )}
                      />
                      <span className={cn(
                        "text-xs font-medium truncate",
                        isSelected ? "text-indigo-700 dark:text-indigo-300" : "text-zinc-800 dark:text-zinc-200",
                        !rule.isActive && "opacity-60"
                      )}>
                        {rule.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button
                        type="button"
                        onClick={(e) => handleDuplicateRule(e, rule)}
                        className="p-1 text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors cursor-pointer"
                        title="Duplicate rule"
                      >
                        <Copy size={11} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setValidationRules(prev => prev.filter(r => r.id !== rule.id));
                          if (selectedRuleId === rule.id) setSelectedRuleId(null);
                        }}
                        className="p-1 text-zinc-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                        title="Delete rule"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pl-3">
                    <p className={cn("text-[11px] truncate flex-1 text-zinc-500 dark:text-zinc-400", !isVisual && "font-mono")}>
                      {previewText}
                    </p>
                    <span className={cn(
                      "text-[10px] font-medium shrink-0",
                      !rule.isActive
                        ? "text-zinc-400"
                        : rule.severity === 'warning'
                          ? "text-amber-600 dark:text-amber-400"
                          : rule.severity === 'info'
                            ? "text-blue-600 dark:text-blue-400"
                            : "text-rose-600 dark:text-rose-400"
                    )}>
                      {rule.isActive ? (rule.severity === 'warning' ? 'Warn' : rule.severity === 'info' ? 'Info' : 'Error') : 'Off'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredRules.length === 0 && (
              <div className="text-center py-8 px-3">
                <p className="text-xs text-zinc-400">No rules defined</p>
              </div>
            )}
          </div>

          {/* Resize Handle */}
          <div
            onMouseDown={() => startResize('left')}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/40 transition-colors z-10"
          />
          </motion.aside>
        )}
      </AnimatePresence>

      {/* 2. Center Main Editor */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden bg-zinc-50/70 dark:bg-zinc-950">
        {/* Inline Center Top Bar (aligned with Left & Right h-11 headers) */}
        <div className="h-11 px-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {isLeftCollapsed && (
              <>
                <button
                  type="button"
                  onClick={() => setIsLeftCollapsed(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Expand Rules panel"
                >
                  <ChevronRight size={14} />
                  <span className="hidden sm:inline">Rules</span>
                </button>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
              </>
            )}
            {selectedRule ? (
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                  {name || 'Untitled Rule'}
                </span>
                <span className={cn(
                  "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase shrink-0",
                  severity === 'info'
                    ? "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400"
                    : severity === 'warning'
                      ? "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400"
                      : "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400"
                )}>
                  {severity}
                </span>
              </div>
            ) : (
              <span className="text-xs text-zinc-400 truncate">Rule Configuration</span>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {(selectedRuleId !== null || name) && (
              <label className="h-7 flex items-center gap-1.5 px-2.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => {
                    setIsActive(e.target.checked);
                    updateCurrentRule({ isActive: e.target.checked });
                  }}
                  className="w-3.5 h-3.5 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Active</span>
              </label>
            )}
            {isRightCollapsed && (
              <>
                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-800 shrink-0" />
                <button
                  type="button"
                  onClick={() => setIsRightCollapsed(false)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  title="Expand Test & Reference panel"
                >
                  <ChevronLeft size={14} />
                  <span className="hidden sm:inline">Test</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto p-5 custom-scrollbar">
        {selectedRuleId !== null || name ? (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Config Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-5">
              {/* Name, Severity & Trigger Scope */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-5 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Rule Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      updateCurrentRule({ name: e.target.value });
                    }}
                    placeholder="e.g. Budget Cap Checker"
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:outline-none transition-colors rounded-lg px-3 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="md:col-span-4 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Severity</label>
                  <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg h-9">
                    <button
                      type="button"
                      onClick={() => {
                        setSeverity('error');
                        setEnforcement('block');
                        updateCurrentRule({ severity: 'error', enforcement: 'block', bypassMode: 'none' });
                      }}
                      className={cn(
                        "rounded-md text-xs font-medium transition-colors cursor-pointer",
                        severity === 'error'
                          ? "bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Error
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeverity('warning');
                        const nextEnf = enforcement === 'block' ? 'confirm' : enforcement;
                        setEnforcement(nextEnf);
                        updateCurrentRule({
                          severity: 'warning',
                          enforcement: nextEnf,
                          bypassMode: nextEnf === 'confirm' ? 'confirm' : 'none'
                        });
                      }}
                      className={cn(
                        "rounded-md text-xs font-medium transition-colors cursor-pointer",
                        severity === 'warning'
                          ? "bg-white dark:bg-zinc-800 text-amber-600 dark:text-amber-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Warning
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSeverity('info');
                        setEnforcement('allow');
                        updateCurrentRule({ severity: 'info', enforcement: 'allow', bypassMode: 'none' });
                      }}
                      className={cn(
                        "rounded-md text-xs font-medium transition-colors cursor-pointer",
                        severity === 'info'
                          ? "bg-white dark:bg-zinc-800 text-blue-600 dark:text-blue-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      Info
                    </button>
                  </div>
                </div>

                <div className="md:col-span-3 space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Run When</label>
                  <select
                    value={triggerOn}
                    onChange={(e) => {
                      const next = e.target.value as 'always' | 'create' | 'update';
                      setTriggerOn(next);
                      updateCurrentRule({ triggerOn: next });
                    }}
                    className="w-full h-9 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:outline-none rounded-lg px-2.5 text-xs text-zinc-900 dark:text-zinc-100"
                  >
                    <option value="always">Always (Save)</option>
                    <option value="create">On Create only</option>
                    <option value="update">On Edit only</option>
                  </select>
                </div>
              </div>

              {/* Side-by-Side Condition (Left) & Outcome (Right) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
                {/* Dual-Mode Rule Builder Switcher */}
                <div className="xl:col-span-7 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Validation Condition
                  </label>
                  <div className="inline-flex p-0.5 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('visual')}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer",
                        mode === 'visual'
                          ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      <SlidersHorizontal size={12} />
                      <span>Visual Builder</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleModeSwitch('expression')}
                      className={cn(
                        "px-2.5 py-1 text-xs font-medium rounded-md flex items-center gap-1.5 transition-colors cursor-pointer",
                        mode === 'expression'
                          ? "bg-white dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 shadow-xs"
                          : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                      )}
                    >
                      <Code size={12} />
                      <span>Expression</span>
                    </button>
                  </div>
                </div>

                {mode === 'visual' ? (
                  <div className="space-y-2">
                    <VisualRuleBuilder
                      conditionTree={conditionTree}
                      onChange={handleConditionTreeChange}
                      fields={dataFields}
                    />
                    {expression && (
                      <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/80 dark:border-zinc-800 rounded-lg">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-medium text-zinc-400 shrink-0">Formula:</span>
                          <code className="text-[11px] font-mono text-zinc-600 dark:text-zinc-300 truncate">
                            {expression}
                          </code>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleModeSwitch('expression')}
                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                        >
                          Edit as formula
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-zinc-400">
                        Type <code className="px-1 py-0.5 bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">{'{'}</code> for fields · Evaluates to <span className="font-medium text-emerald-600 dark:text-emerald-400">TRUE</span> when valid
                      </span>
                    </div>

                    <div className="flex bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 focus-within:border-indigo-500 transition-colors rounded-xl overflow-hidden relative h-44">
                      {/* Line numbers gutter */}
                      <div className="w-9 bg-zinc-100/70 dark:bg-zinc-900/50 border-r border-zinc-200 dark:border-zinc-800 flex flex-col pt-3 text-right pr-2 select-none pointer-events-none overflow-hidden">
                        {expression.split('\n').map((_, i) => (
                          <div key={i} className="text-[11px] font-mono leading-[22px] text-zinc-400 dark:text-zinc-600 h-[22px]">
                            {i + 1}
                          </div>
                        ))}
                      </div>

                      <div className="flex-1 relative overflow-hidden">
                        {/* Highlighting overlay */}
                        <div
                          aria-hidden="true"
                          className="absolute inset-0 p-3 text-xs font-mono leading-[22px] pointer-events-none whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
                          style={{ color: 'transparent' }}
                        >
                          {expression.split(/(\/\*[\s\S]*?\*\/|\/\/.*|\{[^{}]+\}|[A-Z_]+(?=\()|[()[\],]|"[^"]*"|'[^']*'|\b\d+(?:\.\d+)?\b|[+\-*/%=<>!&|]+|\b[a-zA-Z_][a-zA-Z0-9_]*\b)/g).map((part, i) => {
                            let colorClass = "text-zinc-500 dark:text-zinc-400";
                            if (/^\{[^}]+\}$/.test(part)) colorClass = "text-indigo-600 dark:text-indigo-400 font-semibold";
                            else if (/^[A-Z_]+$/.test(part)) colorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                            else if (/^[()[\],]$/.test(part)) colorClass = "text-emerald-600 dark:text-emerald-400 font-semibold";
                            else if (/^\d+(?:\.\d+)?$/.test(part)) colorClass = "text-amber-600 dark:text-amber-400";
                            else if (/^'[^']*'$/.test(part) || /^"[^"]*"$/.test(part)) colorClass = "text-rose-600 dark:text-rose-400";
                            else if (/^[+\-*/%=<>!&|]+$/.test(part)) colorClass = "text-zinc-900 dark:text-zinc-200 font-semibold";
                            else if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(part)) colorClass = "text-zinc-900 dark:text-zinc-100";
                            return <span key={i} className={colorClass}>{part}</span>;
                          })}
                        </div>

                        {/* Editor Textarea */}
                        <textarea
                          ref={textareaRef}
                          value={expression}
                          onChange={handleTextChange}
                          onKeyDown={handleKeyDown}
                          onClick={handleCursorMove}
                          onKeyUp={handleCursorMove}
                          onScroll={(e) => {
                            const overlay = e.currentTarget.previousElementSibling;
                            const gutter = e.currentTarget.parentElement?.previousElementSibling;
                            if (overlay) {
                              overlay.scrollTop = e.currentTarget.scrollTop;
                              overlay.scrollLeft = e.currentTarget.scrollLeft;
                            }
                            if (gutter) gutter.scrollTop = e.currentTarget.scrollTop;
                            if (showSuggestions) setShowSuggestions(false);
                          }}
                          placeholder="e.g. {price} * {quantity} <= {budget}"
                          spellCheck={false}
                          className="absolute inset-0 w-full h-full bg-transparent p-3 text-xs font-mono text-transparent caret-zinc-900 dark:caret-white placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none resize-none leading-[22px] whitespace-pre overflow-x-auto overflow-y-auto custom-scrollbar"
                        />

                        {/* IntelliSense Dropdown */}
                        <AnimatePresence>
                          {showSuggestions && (
                            <motion.div
                              ref={suggestionsRef}
                              initial={{ opacity: 0, y: 4, scale: 0.98 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.98 }}
                              style={{ top: suggestionPos.top, left: suggestionPos.left }}
                              className="absolute z-[2000] w-72 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden"
                            >
                              <div className="p-1 space-y-0.5 max-h-52 overflow-y-auto custom-scrollbar">
                                {suggestions.map((s, i) => (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => applySuggestion(s)}
                                    onMouseEnter={() => setSelectedIndex(i)}
                                    className={cn(
                                      "w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left transition-colors",
                                      i === selectedIndex
                                        ? "bg-indigo-600 text-white"
                                        : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                                    )}
                                  >
                                    <div className={cn(
                                      "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                                      i === selectedIndex ? "bg-white/20" : "bg-zinc-100 dark:bg-zinc-800"
                                    )}>
                                      {s.type === 'variable' ? <Hash size={12} /> : <FunctionSquare size={12} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="text-xs font-medium truncate">{s.label}</p>
                                        <span className="text-[9px] font-semibold uppercase px-1 py-0.5 rounded border border-current/20 shrink-0">
                                          {s.type === 'variable' ? 'VAR' : 'FUNC'}
                                        </span>
                                      </div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Live Syntax & Reference Diagnostics */}
                    {(diagnostics.errors.length > 0 || diagnostics.warnings.length > 0) && (
                      <div className="space-y-1 pt-1">
                        {diagnostics.errors.map((err, idx) => (
                          <div key={`err-${idx}`} className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400">
                            <AlertCircle size={12} className="shrink-0" />
                            <span>{err}</span>
                          </div>
                        ))}
                        {diagnostics.warnings.map((warn, idx) => (
                          <div key={`warn-${idx}`} className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400">
                            <AlertTriangle size={12} className="shrink-0" />
                            <span>{warn}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                </div>

                {/* Right Column: Outcome, Display, Roles & Preview */}
                <div className="xl:col-span-5 space-y-4">
                  {/* When Validation Fails (Action & Behavior) */}
                  <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                    When Validation Fails
                  </span>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Choose how the record save behaves and where the message appears.
                  </span>
                </div>

                {/* Save Behavior */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'block', label: 'Block Save', desc: 'Must fix before saving' },
                    { id: 'confirm', label: 'Confirm to Bypass', desc: 'Prompt user to proceed' },
                    { id: 'allow', label: 'Allow Save (Notice)', desc: 'Dismissible, non-blocking' }
                  ].map(opt => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        const nextEnf = opt.id as 'block' | 'confirm' | 'allow';
                        setEnforcement(nextEnf);
                        updateCurrentRule({
                          enforcement: nextEnf,
                          bypassMode: nextEnf === 'confirm' ? 'confirm' : 'none'
                        });
                      }}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-left transition-colors cursor-pointer",
                        enforcement === opt.id
                          ? "bg-white dark:bg-zinc-900 border-indigo-500 ring-1 ring-indigo-500/20"
                          : "bg-white/60 dark:bg-zinc-900/40 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
                      )}
                    >
                      <p className={cn(
                        "text-xs font-medium",
                        enforcement === opt.id ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-800 dark:text-zinc-200"
                      )}>
                        {opt.label}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>

                {/* Message & Display Locations */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Message</label>
                  <input
                    type="text"
                    value={errorMessage}
                    onChange={(e) => {
                      setErrorMessage(e.target.value);
                      updateCurrentRule({ errorMessage: e.target.value });
                    }}
                    placeholder="e.g. Total cost cannot exceed allowed budget!"
                    className="w-full h-9 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 focus:border-indigo-500 focus:outline-none transition-colors rounded-lg px-3 text-xs text-zinc-900 dark:text-zinc-100"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-0.5">
                  <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400">Show in:</span>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showBanner}
                      onChange={(e) => {
                        setShowBanner(e.target.checked);
                        updateCurrentRule({ showBanner: e.target.checked });
                      }}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Record Banner (Multi-field / Cross-module)</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showInline}
                      onChange={(e) => {
                        setShowInline(e.target.checked);
                        updateCurrentRule({ showInline: e.target.checked });
                      }}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Inline on Fields</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-zinc-700 dark:text-zinc-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showToast}
                      onChange={(e) => {
                        setShowToast(e.target.checked);
                        updateCurrentRule({ showToast: e.target.checked });
                      }}
                      className="w-3.5 h-3.5 text-indigo-600 rounded border-zinc-300 dark:border-zinc-700 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>Toast Alert</span>
                  </label>
                </div>

                {/* Multi-Field Inline Highlighting Picker */}
                {showInline && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                        Highlight Fields Inline ({targetFieldIds.length === 0 ? 'Record-level only' : `${targetFieldIds.length} selected`})
                      </label>
                      <select
                        value=""
                        onChange={(e) => {
                          const fid = e.target.value;
                          if (fid && !targetFieldIds.includes(fid)) {
                            const next = [...targetFieldIds, fid];
                            setTargetFieldIds(next);
                            updateCurrentRule({ targetFieldIds: next });
                          }
                        }}
                        className="h-7 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-[11px] text-zinc-700 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="">+ Add field to highlight...</option>
                        {dataFields
                          .filter(f => !targetFieldIds.includes(f.id))
                          .map(f => (
                            <option key={f.id} value={f.id}>
                              {f.label || f.name || f.id}
                            </option>
                          ))}
                      </select>
                    </div>
                    {targetFieldIds.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {targetFieldIds.map(fid => {
                          const matched = dataFields.find(f => f.id === fid || f.name === fid);
                          return (
                            <span
                              key={fid}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-md text-[11px] font-medium text-zinc-700 dark:text-zinc-200"
                            >
                              <span>{matched?.label || matched?.name || fid}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = targetFieldIds.filter(id => id !== fid);
                                  setTargetFieldIds(next);
                                  updateCurrentRule({ targetFieldIds: next });
                                }}
                                className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Role Exemptions */}
              <div className="px-3.5 py-2.5 bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 rounded-lg space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400">
                    Exempt Roles (Bypass Rule):
                  </span>
                  <div className="flex items-center gap-1.5">
                    {['TENANT_ADMIN', 'Admin', 'Manager'].map(presetRole => {
                      const active = exemptRoles.includes(presetRole);
                      return (
                        <button
                          key={presetRole}
                          type="button"
                          onClick={() => {
                            const next = active
                              ? exemptRoles.filter(r => r !== presetRole)
                              : [...exemptRoles, presetRole];
                            setExemptRoles(next);
                            updateCurrentRule({ exemptRoles: next });
                          }}
                          className={cn(
                            "px-2 py-0.5 text-[10px] font-medium rounded border transition-colors cursor-pointer",
                            active
                              ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60"
                              : "bg-white dark:bg-zinc-900 text-zinc-500 border-zinc-200 dark:border-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200"
                          )}
                        >
                          {presetRole}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newRoleInput}
                    onChange={(e) => setNewRoleInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newRoleInput.trim()) {
                        e.preventDefault();
                        const role = newRoleInput.trim();
                        if (!exemptRoles.includes(role)) {
                          const next = [...exemptRoles, role];
                          setExemptRoles(next);
                          updateCurrentRule({ exemptRoles: next });
                        }
                        setNewRoleInput('');
                      }
                    }}
                    placeholder="Add custom role & press Enter..."
                    className="h-7 flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 text-[11px] text-zinc-800 dark:text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                  {exemptRoles.filter(r => !['TENANT_ADMIN', 'Admin', 'Manager'].includes(r)).map(customRole => (
                    <span
                      key={customRole}
                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/60 rounded text-[10px] font-medium"
                    >
                      {customRole}
                      <button
                        type="button"
                        onClick={() => {
                          const next = exemptRoles.filter(r => r !== customRole);
                          setExemptRoles(next);
                          updateCurrentRule({ exemptRoles: next });
                        }}
                        className="hover:text-rose-500 cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Live End-User Error Preview */}
              {errorMessage && (
                <div className={cn(
                  "px-3 py-2 rounded-lg border flex items-center gap-2 text-xs",
                  severity === 'warning'
                    ? "bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50 text-amber-800 dark:text-amber-300"
                    : severity === 'info'
                      ? "bg-blue-50/70 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800/50 text-blue-800 dark:text-blue-300"
                      : "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/50 text-rose-800 dark:text-rose-300"
                )}>
                  {severity === 'info' ? <Info size={13} className="shrink-0" /> : <AlertTriangle size={13} className="shrink-0" />}
                  <span className="text-[11px] font-medium opacity-75 shrink-0">User preview:</span>
                  <span className="truncate">{errorMessage}</span>
                </div>
              )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="max-w-md text-center space-y-4">
              <div className="w-12 h-12 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center mx-auto text-zinc-400">
                <ShieldCheck size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No-Code &amp; Formula Rules</h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Start from a quick template or click <strong>+ New</strong> to build a rule visually or with an expression.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCreateRule('required')}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wand2 size={12} className="text-indigo-500" />
                  <span>Required Field</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateRule('numeric')}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wand2 size={12} className="text-amber-500" />
                  <span>Numeric Limit</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateRule('date_range')}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wand2 size={12} className="text-emerald-500" />
                  <span>Date Check</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCreateRule('email')}
                  className="px-3 py-1.5 text-xs font-medium bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 hover:border-indigo-400 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Wand2 size={12} className="text-purple-500" />
                  <span>Format / Regex</span>
                </button>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>

      {/* 3. Right Sidebar (Test & Runs + Reference + Optional AI, Collapsible & Resizable) */}
      <AnimatePresence initial={false}>
        {!isRightCollapsed && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: rightWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={resizingSide === 'right' ? { duration: 0 } : { duration: 0.2, ease: 'easeOut' }}
            className="relative flex-shrink-0 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
          >
          {/* Resize Handle */}
          <div
            onMouseDown={() => startResize('right')}
            className="absolute top-0 left-0 w-1 h-full cursor-col-resize hover:bg-indigo-500/40 transition-colors z-10"
          />

          {/* Header / Tabs */}
          <div className="h-11 px-2 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-1 shrink-0">
            <div className="flex items-center gap-1 flex-1 min-w-0">
              <button
                onClick={() => setRightTab('sandbox')}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                  rightTab === 'sandbox'
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Play size={12} />
                <span>Test</span>
              </button>
              <button
                onClick={() => setRightTab('reference')}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                  rightTab === 'reference'
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                )}
              >
                <Code size={12} />
                <span>Reference</span>
              </button>
              {showAiAssist && (
                <button
                  onClick={() => setRightTab('ai')}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer",
                    rightTab === 'ai'
                      ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <Sparkles size={12} />
                  <span>AI</span>
                </button>
              )}
            </div>
            <button
              onClick={() => setIsRightCollapsed(true)}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-md transition-colors cursor-pointer shrink-0"
              title="Collapse panel"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          {rightTab === 'sandbox' ? (
            <div className="flex flex-col flex-1 min-h-0 p-3.5 gap-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Test Sandbox</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Mock record values to test rule logic.</p>
              </div>

              {/* Dynamic Mock Inputs */}
              <div className="space-y-2.5 flex-1 overflow-y-auto custom-scrollbar pr-1">
                {Object.keys(sandboxData).map(key => {
                  const matchedField = fields.find(f => f.name === key || f.id === key || f.label === key);
                  return (
                    <div key={key} className="space-y-1">
                      <label className="text-[11px] font-medium text-zinc-600 dark:text-zinc-400 flex items-center justify-between gap-2">
                        <span className="truncate">{matchedField?.label || key}</span>
                        <span className="text-[10px] font-mono text-zinc-400 shrink-0">{"{" + key + "}"}</span>
                      </label>
                      {['checkbox', 'boolean', 'toggle'].includes(matchedField?.type) ? (
                        <label className="flex items-center gap-2 px-2.5 h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!sandboxData[key]}
                            onChange={(e) => setSandboxData(prev => ({ ...prev, [key]: e.target.checked }))}
                            className="w-3.5 h-3.5 text-indigo-600 rounded border-zinc-300 focus:ring-indigo-500 cursor-pointer"
                          />
                          <span className="text-xs text-zinc-600 dark:text-zinc-300 font-medium">{sandboxData[key] ? 'TRUE' : 'FALSE'}</span>
                        </label>
                      ) : (
                        <input
                          type={matchedField?.type === 'number' || matchedField?.type === 'currency' ? 'number' : matchedField?.type === 'date' ? 'date' : 'text'}
                          value={sandboxData[key] ?? ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSandboxData(prev => ({
                              ...prev,
                              [key]: (matchedField?.type === 'number' || matchedField?.type === 'currency') ? (val === '' ? '' : Number(val)) : val
                            }));
                          }}
                          className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                        />
                      )}
                    </div>
                  );
                })}
                {Object.keys(sandboxData).length === 0 && (
                  <p className="text-xs text-zinc-400 text-center py-6">
                    No variables referenced in the current rule yet.
                  </p>
                )}
              </div>

              {/* Test Actions */}
              <div className="space-y-2.5 pt-3 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={runSandboxTest}
                    disabled={!selectedRule}
                    className="h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Play size={11} />
                    <span>Test Rule</span>
                  </button>
                  <button
                    type="button"
                    onClick={runAllRulesTest}
                    disabled={validationRules.filter(r => r.isActive).length === 0}
                    className="h-8 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-50 text-zinc-700 dark:text-zinc-200 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ListChecks size={12} />
                    <span>Run All</span>
                  </button>
                </div>

                {/* Single Rule Test Output */}
                {sandboxResult && (
                  <div className={cn(
                    "p-3 rounded-lg border flex items-start gap-2.5",
                    sandboxResult.success
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-400"
                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800/60 text-rose-700 dark:text-rose-400"
                  )}>
                    {sandboxResult.success ? (
                      <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    )}
                    <div className="space-y-0.5 text-xs min-w-0">
                      <p className="font-semibold">{sandboxResult.success ? 'Passed (Valid)' : 'Failed (Invalid)'}</p>
                      <p className="text-[11px] opacity-90 leading-relaxed break-words">
                        {sandboxResult.success
                          ? 'Condition evaluated to true.'
                          : sandboxResult.error || errorMessage || 'Validation constraint violated.'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Batch Run All Output */}
                {batchResults && (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar">
                    {batchResults.map(res => (
                      <div
                        key={res.id}
                        onClick={() => setSelectedRuleId(res.id)}
                        className={cn(
                          "px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-xs cursor-pointer",
                          res.passed
                            ? "bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400"
                            : "bg-rose-50/70 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-800/40 text-rose-700 dark:text-rose-400"
                        )}
                      >
                        <span className="truncate font-medium">{res.name}</span>
                        {res.passed ? <CheckCircle2 size={13} className="shrink-0" /> : <XCircle size={13} className="shrink-0" />}
                      </div>
                    ))}
                  </div>
                )}

                {/* Saved Regression Test Cases */}
                {selectedRule && (
                  <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-zinc-700 dark:text-zinc-300">
                        Saved Test Cases ({selectedRule.testCases?.length || 0})
                      </span>
                      {(selectedRule.testCases?.length || 0) > 0 && (
                        <button
                          type="button"
                          onClick={handleRunSavedTestCases}
                          className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                        >
                          Run Suite
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={newTestCaseName}
                        onChange={(e) => setNewTestCaseName(e.target.value)}
                        placeholder="Case name..."
                        className="h-7 flex-1 min-w-0 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 text-[11px] dark:text-zinc-100 focus:outline-none focus:border-indigo-500"
                      />
                      <select
                        value={newTestCaseExpected ? 'pass' : 'fail'}
                        onChange={(e) => setNewTestCaseExpected(e.target.value === 'pass')}
                        className="h-7 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-1.5 text-[11px] text-zinc-700 dark:text-zinc-200"
                      >
                        <option value="pass">Expect Pass</option>
                        <option value="fail">Expect Fail</option>
                      </select>
                      <button
                        type="button"
                        onClick={handleSaveTestCase}
                        disabled={!newTestCaseName.trim()}
                        className="h-7 px-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 disabled:opacity-40 rounded-md text-[11px] font-medium cursor-pointer shrink-0"
                      >
                        Save
                      </button>
                    </div>

                    {(selectedRule.testCases?.length || 0) > 0 && (
                      <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
                        {selectedRule.testCases!.map(tc => {
                          const res = testCaseResults[tc.id];
                          return (
                            <div
                              key={tc.id}
                              onClick={() => setSandboxData(tc.data)}
                              className="px-2 py-1.5 rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 flex items-center justify-between gap-2 text-[11px] cursor-pointer hover:border-indigo-400"
                              title="Click to load values into Sandbox"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                {res ? (
                                  res.matchedExpected ? (
                                    <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                                  ) : (
                                    <XCircle size={12} className="text-rose-500 shrink-0" />
                                  )
                                ) : null}
                                <span className="truncate font-medium text-zinc-800 dark:text-zinc-200">{tc.name}</span>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={cn(
                                  "text-[10px] font-medium",
                                  tc.expectedValid ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"
                                )}>
                                  {tc.expectedValid ? 'Pass' : 'Fail'}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteTestCase(tc.id);
                                  }}
                                  className="text-zinc-400 hover:text-rose-500 cursor-pointer"
                                >
                                  <Trash2 size={11} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : rightTab === 'reference' ? (
            <div className="flex flex-col flex-1 min-h-0 p-3 gap-2.5">
              {/* Sub-tabs: Fields | Functions */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg shrink-0">
                <button
                  onClick={() => { setRefTab('fields'); setRefSearchQuery(''); }}
                  className={cn(
                    "py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                    refTab === 'fields'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <Hash size={12} />
                  <span>Fields</span>
                </button>
                <button
                  onClick={() => { setRefTab('functions'); setRefSearchQuery(''); }}
                  className={cn(
                    "py-1 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer",
                    refTab === 'functions'
                      ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs"
                      : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
                  )}
                >
                  <Code size={12} />
                  <span>Functions</span>
                </button>
              </div>

              <div className="relative shrink-0">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={refSearchQuery}
                  onChange={(e) => setRefSearchQuery(e.target.value)}
                  placeholder={refTab === 'fields' ? 'Search fields...' : 'Search functions...'}
                  className="w-full h-8 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg pl-8 pr-3 text-xs focus:outline-none focus:border-indigo-500 dark:text-zinc-100"
                />
              </div>

              {/* Dense Flat Click-to-Insert List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-1 pr-0.5">
                {refTab === 'fields' ? (
                  filteredFields.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleInsertToken(f.name ? `{${f.name}}` : `{{${f.id}}}`)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors flex items-center gap-2.5 group cursor-pointer"
                    >
                      <Hash size={12} className="text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1.5">
                          <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate">{f.label}</p>
                          <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold border uppercase shrink-0", getTypeBadge(f.type).color)}>
                            {getTypeBadge(f.type).label}
                          </span>
                        </div>
                        {f.name && (
                          <p className="text-[10px] font-mono text-zinc-400 truncate">{`{${f.name}}`}</p>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  filteredFunctions.map((func, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleInsertToken(func.template)}
                      className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800/70 transition-colors flex flex-col gap-0.5 group cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <Code size={12} className="text-zinc-400 group-hover:text-indigo-500 shrink-0" />
                        <span className="text-xs font-mono font-semibold text-zinc-800 dark:text-zinc-100 truncate">
                          {func.name.split('(')[0]}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400 pl-5 leading-snug">{func.desc}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col flex-1 min-h-0 p-3.5 gap-3">
              <div>
                <h3 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">AI Rule Assistant</h3>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Describe the constraint in plain English to generate an expression.
                </p>
              </div>

              <div className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl space-y-3">
                <textarea
                  rows={4}
                  placeholder="e.g. End date must be after start date..."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-2.5 text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none focus:border-indigo-500 resize-none leading-relaxed"
                />

                <button
                  type="button"
                  onClick={handleGenerateAI}
                  disabled={isGenerating || !aiPrompt.trim()}
                  className="w-full h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isGenerating ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  <span>{isGenerating ? 'Generating...' : 'Generate Expression'}</span>
                </button>
              </div>
            </div>
          )}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  );
};

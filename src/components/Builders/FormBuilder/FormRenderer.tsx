import React, { useState, useEffect, useMemo } from 'react';
import { ModuleField, Tab } from '../../../types/platform';
import { FieldInput } from '../../FieldInput';
import { Button } from '../../UI/Primitives';
import { CollapsibleFieldGroup } from '../../UI/CollapsibleFieldGroup';
import { RepeatableGroupBlock } from '../../Platform/RepeatableGroupBlock';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Save,
  Copy,
  Check,
  Sparkles,
  HelpCircle,
  Info,
  AlertTriangle,
  XCircle,
  Lock,
  UserCheck,
  CreditCard,
  FileText,
  Printer,
  Edit3,
  Clock,
} from 'lucide-react';
import { cn, isFieldVisible, flattenFields } from '../../../lib/utils';
import { evaluateCalculations } from '../../../services/aiService';
import {
  CanonicalFormDefinition,
  FormFieldPlacement,
  getSystemMetaFields,
  getUnifiedFieldDefinition,
  resolveContainerChildFields,
  normalizeFormSchema,
  resolveFormInitialValues,
  widthToGridClass,
} from '../../../lib/formFieldUtils';
import { API_BASE_URL } from '../../../config';
import { toast } from 'sonner';

export interface FormRendererContext {
  user?: {
    id?: string;
    userId?: string;
    name?: string;
    fullName?: string;
    displayName?: string;
    email?: string;
    phone?: string;
    partyId?: string;
    organisationId?: string;
    role?: string;
  } | null;
  parentRecord?: Record<string, any> | null;
  parentRecordId?: string;
  siteId?: string;
  source?: string;
}

export interface FormRendererDesignMode {
  enabled: boolean;
  activeStepId?: string;
  renderHeader?: () => React.ReactNode;
  renderSubmitBar?: () => React.ReactNode;
  renderEmptyCanvas?: () => React.ReactNode;
  wrapGrid?: (gridNode: React.ReactNode) => React.ReactNode;
  wrapField?: (fObj: FormFieldPlacement, renderedBody: React.ReactNode) => React.ReactNode;
}

export interface FormRendererProps {
  formId?: string;
  form?: any;
  moduleLayout?: any[];
  workflow?: any;
  title?: string;
  subtitle?: string;
  fields?: ModuleField[];
  tabs?: Tab[];
  onSubmit?: (values: Record<string, any>, serverResponse?: any) => Promise<void> | void;
  submitButtonText?: string;
  className?: string;
  readOnly?: boolean;
  initialValues?: Record<string, any>;
  context?: FormRendererContext;
  isPreviewMode?: boolean;
  disableAutoBackendSubmit?: boolean;
  viewport?: 'desktop' | 'tablet' | 'mobile';
  designMode?: FormRendererDesignMode;
}

export const FormRenderer: React.FC<FormRendererProps> = ({
  formId,
  form: propForm,
  moduleLayout: propModuleLayout,
  workflow: propWorkflow,
  title,
  subtitle,
  fields: legacyFields,
  tabs = [],
  onSubmit,
  submitButtonText,
  className,
  readOnly = false,
  initialValues = {},
  context,
  isPreviewMode = false,
  disableAutoBackendSubmit = false,
  viewport = 'desktop',
  designMode,
}) => {
  const isDesignMode = Boolean(designMode?.enabled);
  const [remoteForm, setRemoteForm] = useState<any | null>(null);
  const [remoteModule, setRemoteModule] = useState<any | null>(null);
  const [loadingForm, setLoadingForm] = useState<boolean>(Boolean(formId && !propForm));

  // Fetch remote form if only formId was passed
  useEffect(() => {
    if (!formId || propForm) return;
    let cancelled = false;
    setLoadingForm(true);
    fetch(`${API_BASE_URL}/api/public/forms/${encodeURIComponent(formId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Failed to load form');
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setRemoteForm(data.form);
        setRemoteModule(data.module);
      })
      .catch((err) => {
        console.warn('[FormRenderer] Remote form fetch warning:', err);
      })
      .finally(() => {
        if (!cancelled) setLoadingForm(false);
      });

    return () => {
      cancelled = true;
    };
  }, [formId, propForm]);

  const resolvedLayout = useMemo(() => {
    if (propModuleLayout && propModuleLayout.length > 0) return propModuleLayout;
    if (remoteModule?.layout && remoteModule.layout.length > 0) return remoteModule.layout;
    return [];
  }, [propModuleLayout, remoteModule]);

  const resolvedWorkflow = useMemo(() => {
    return propWorkflow || remoteModule?.workflow || undefined;
  }, [propWorkflow, remoteModule]);

  const canonicalForm: CanonicalFormDefinition = useMemo(() => {
    if (propForm) {
      return normalizeFormSchema(propForm);
    }
    if (remoteForm) {
      return normalizeFormSchema(remoteForm);
    }
    return normalizeFormSchema({
      id: formId || 'inline-form',
      name: title || '',
      description: subtitle || '',
      layout: legacyFields || [],
      settings: {
        submitLabel: submitButtonText || 'Submit',
      },
    });
  }, [propForm, remoteForm, formId, title, subtitle, legacyFields, submitButtonText]);

  const allResolvedFields = useMemo(() => {
    const flatLayout = flattenFields(resolvedLayout);
    const meta = getSystemMetaFields(resolvedWorkflow);
    const custom = canonicalForm.customFields || [];
    const map = new Map<string, any>();
    [...flatLayout, ...meta, ...custom].forEach((f) => {
      if (f && f.id && !map.has(f.id)) {
        map.set(f.id, f);
      }
    });
    return Array.from(map.values());
  }, [resolvedLayout, resolvedWorkflow, canonicalForm.customFields]);

  const computedInitialValues = useMemo(() => {
    return resolveFormInitialValues(canonicalForm, resolvedLayout, resolvedWorkflow, {
      user: context?.user,
      parentRecord: context?.parentRecord || undefined,
      initialData: initialValues,
    });
  }, [canonicalForm, resolvedLayout, resolvedWorkflow, context?.user, context?.parentRecord, initialValues]);

  const [formValues, setFormValues] = useState<Record<string, any>>(computedInitialValues);
  const [activeStepId, setActiveStepId] = useState<string>(
    canonicalForm.steps?.[0]?.id || 'step-1'
  );
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || 'default');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [submittedInvoiceNumber, setSubmittedInvoiceNumber] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReviewStep, setIsReviewStep] = useState(false);
  const [reviewDeclarationAccepted, setReviewDeclarationAccepted] = useState(false);

  // Draft Save & Resume State
  const [savingDraft, setSavingDraft] = useState(false);
  const [savedDraftInfo, setSavedDraftInfo] = useState<{ token: string; url: string; savedAt: string } | null>(null);
  const [copiedDraftUrl, setCopiedDraftUrl] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'INVOICE'>('CARD');

  const paymentConfig = canonicalForm.settings?.payment;
  const isPayableForm = Boolean(paymentConfig?.enabled);
  const payableAmount = useMemo(() => {
    if (!isPayableForm) return 0;
    if (paymentConfig?.amountMode === 'field' && paymentConfig.amountFieldId) {
      const raw = formValues[paymentConfig.amountFieldId];
      const num = Number(String(raw ?? '0').replace(/[^0-9.-]+/g, ''));
      return isNaN(num) ? 0 : num;
    }
    return Number(paymentConfig?.fixedAmount || 0);
  }, [isPayableForm, paymentConfig, formValues]);
  const paymentCurrency = paymentConfig?.currency || 'AUD';

  // Sync initial values when canonical form or context changes
  useEffect(() => {
    setFormValues((prev) => ({
      ...computedInitialValues,
      ...prev,
    }));
  }, [computedInitialValues]);

  // Keep activeStepId valid when steps change
  useEffect(() => {
    if (canonicalForm.isMultistep && canonicalForm.steps.length > 0) {
      const exists = canonicalForm.steps.some((s) => s.id === activeStepId);
      if (!exists) {
        setActiveStepId(canonicalForm.steps[0].id);
      }
    }
  }, [canonicalForm.isMultistep, canonicalForm.steps, activeStepId]);

  // Load draft from URL token (?draft=DRF-...) or localStorage auto-recovery
  useEffect(() => {
    if (isPreviewMode || !canonicalForm.settings?.allowSaveDraft) return;
    const params = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
    const draftToken = params?.get('draft');

    if (draftToken && canonicalForm.id && !canonicalForm.id.startsWith('inline-')) {
      fetch(`${API_BASE_URL}/api/public/forms/${encodeURIComponent(canonicalForm.id)}/drafts/${encodeURIComponent(draftToken)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((draft) => {
          if (draft && draft.data) {
            setFormValues((prev) => ({ ...prev, ...draft.data }));
            if (draft.stepId) setActiveStepId(draft.stepId);
            toast.info('Restored your saved form draft.');
          }
        })
        .catch(() => {});
      return;
    }

    // Check local storage draft fallback
    if (typeof window !== 'undefined' && canonicalForm.id) {
      try {
        const localRaw = localStorage.getItem(`aurora_form_draft_${canonicalForm.id}`);
        if (localRaw) {
          const parsed = JSON.parse(localRaw);
          if (parsed?.data && typeof parsed.data === 'object') {
            setFormValues((prev) => ({ ...prev, ...parsed.data }));
            if (parsed.stepId) setActiveStepId(parsed.stepId);
          }
        }
      } catch {}
    }
  }, [canonicalForm.id, canonicalForm.settings?.allowSaveDraft, isPreviewMode]);

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormValues((prev) => {
      const next = { ...prev, [fieldId]: value };
      return evaluateCalculations(next, allResolvedFields);
    });
    if (fieldErrors[fieldId]) {
      setFieldErrors((prev) => {
        const copy = { ...prev };
        delete copy[fieldId];
        return copy;
      });
    }
  };

  const visibleSteps = useMemo(() => {
    if (!canonicalForm.isMultistep || isDesignMode) return canonicalForm.steps;
    return canonicalForm.steps.filter((s) => isFieldVisible(s, formValues));
  }, [canonicalForm.isMultistep, canonicalForm.steps, formValues, isDesignMode]);

  const effectiveActiveStepId = isDesignMode && designMode?.activeStepId ? designMode.activeStepId : activeStepId;

  const currentStepIndex = useMemo(() => {
    const idx = visibleSteps.findIndex((s) => s.id === effectiveActiveStepId);
    return idx >= 0 ? idx : 0;
  }, [visibleSteps, effectiveActiveStepId]);

  const currentStep = visibleSteps[currentStepIndex] || canonicalForm.steps[0];

  const activePlacements: FormFieldPlacement[] = useMemo(() => {
    if (canonicalForm.isMultistep) {
      return currentStep?.fields || [];
    }
    return canonicalForm.fields || [];
  }, [canonicalForm.isMultistep, currentStep, canonicalForm.fields]);

  const validatePlacements = (placements: FormFieldPlacement[]): boolean => {
    const errors: Record<string, string> = {};
    placements.forEach((fObj) => {
      if (String(fObj.id || '').startsWith('visual-')) return;
      if (fObj.hidden) return;
      if (!isFieldVisible(fObj, formValues)) return;

      const fieldDef = getUnifiedFieldDefinition(
        fObj.id,
        resolvedLayout,
        resolvedWorkflow,
        canonicalForm.customFields
      );
      const effectiveType = fieldDef?.type || fObj.type || 'text';
      const label = fObj.labelOverride || fieldDef?.label || fObj.id;
      const isRequired = Boolean(fObj.required || fieldDef?.required);
      const val = formValues[fObj.id];

      if (effectiveType === 'repeatableGroup') {
        const rows = Array.isArray(val) ? val : [];
        const minReq = fObj.minRows && fObj.minRows > 0 ? fObj.minRows : isRequired ? 1 : 0;
        if (minReq > 0 && rows.length < minReq) {
          errors[fObj.id] = `${label} requires at least ${minReq} ${minReq === 1 ? 'item' : 'items'}`;
          return;
        }
        if (fObj.maxRows && fObj.maxRows > 0 && rows.length > fObj.maxRows) {
          errors[fObj.id] = `${label} allows at most ${fObj.maxRows} items`;
          return;
        }
        return;
      }

      if (['fieldGroup', 'group', 'card', 'accordion'].includes(effectiveType)) {
        const activeChildren = resolveContainerChildFields(
          fObj,
          fieldDef,
          resolvedLayout,
          resolvedWorkflow,
          canonicalForm.customFields
        );
        activeChildren.forEach((child: any) => {
          if (!isFieldVisible(child, formValues)) return;
          const childVal = formValues[child.id];
          if (
            child.required &&
            (childVal === undefined ||
              childVal === null ||
              childVal === '' ||
              (Array.isArray(childVal) && childVal.length === 0))
          ) {
            errors[child.id] = `${child.label || child.id} is required`;
          }
        });
        return;
      }

      if (
        isRequired &&
        (val === undefined ||
          val === null ||
          val === '' ||
          (Array.isArray(val) && val.length === 0))
      ) {
        errors[fObj.id] = `${label} is required`;
        return;
      }

      if (val !== undefined && val !== null && val !== '' && fObj.validation) {
        if (fObj.validation.pattern) {
          try {
            const regex = new RegExp(fObj.validation.pattern);
            if (!regex.test(String(val))) {
              errors[fObj.id] = fObj.validation.errorMessage || `${label} format is invalid`;
            }
          } catch {}
        }
        if (fObj.validation.min !== undefined && Number(val) < fObj.validation.min) {
          errors[fObj.id] = fObj.validation.errorMessage || `${label} must be at least ${fObj.validation.min}`;
        }
        if (fObj.validation.max !== undefined && Number(val) > fObj.validation.max) {
          errors[fObj.id] = fObj.validation.errorMessage || `${label} must be at most ${fObj.validation.max}`;
        }
      }
    });

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      toast.error('Please check the highlighted fields before continuing.');
      return false;
    }
    return true;
  };

  const handleSaveDraft = async () => {
    setSavingDraft(true);
    try {
      const savedAt = new Date().toISOString();
      if (typeof window !== 'undefined' && canonicalForm.id) {
        localStorage.setItem(
          `aurora_form_draft_${canonicalForm.id}`,
          JSON.stringify({ data: formValues, stepId: activeStepId, savedAt })
        );
      }

      let token = `DRF-${Date.now().toString(36).toUpperCase()}`;
      if (canonicalForm.id && !canonicalForm.id.startsWith('inline-')) {
        const res = await fetch(
          `${API_BASE_URL}/api/public/forms/${encodeURIComponent(canonicalForm.id)}/drafts`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: formValues,
              stepId: activeStepId,
              token: savedDraftInfo?.token,
              email: formValues.email || context?.user?.email,
            }),
          }
        );
        if (res.ok) {
          const json = await res.json();
          if (json.token) token = json.token;
        }
      }

      const baseUrl =
        typeof window !== 'undefined'
          ? `${window.location.origin}${window.location.pathname}`
          : 'https://app.aurora.io';
      const searchParams =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search)
          : new URLSearchParams();
      searchParams.set('draft', token);
      const resumeUrl = `${baseUrl}?${searchParams.toString()}`;

      setSavedDraftInfo({ token, url: resumeUrl, savedAt });
      toast.success('Progress saved! You can resume anytime with your link.');
    } catch (err: any) {
      toast.error('Saved draft locally');
    } finally {
      setSavingDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (readOnly) return;

    // If not currently in the Review Step, validate active placements first
    if (!isReviewStep) {
      if (!validatePlacements(activePlacements)) {
        return;
      }

      // If multi-step and not on final step, advance to next visible step
      if (canonicalForm.isMultistep && currentStepIndex < visibleSteps.length - 1) {
        setActiveStepId(visibleSteps[currentStepIndex + 1].id);
        return;
      }

      // If Review & Confirm Step is enabled, enter the Review Step before final submission
      if (canonicalForm.settings?.enableReviewStep) {
        const allPlacements = canonicalForm.isMultistep
          ? visibleSteps.flatMap((s) => s.fields || [])
          : canonicalForm.fields || [];
        if (!validatePlacements(allPlacements)) {
          return;
        }
        setIsReviewStep(true);
        return;
      }
    } else if (
      canonicalForm.settings?.reviewDeclarationText &&
      !reviewDeclarationAccepted
    ) {
      toast.error('Please accept the declaration checkbox before submitting.');
      return;
    }

    // Final submission validation across all visible steps
    const allPlacements = canonicalForm.isMultistep
      ? visibleSteps.flatMap((s) => s.fields || [])
      : canonicalForm.fields || [];
    if (!validatePlacements(allPlacements)) {
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const evaluated = evaluateCalculations(formValues, allResolvedFields);
      const finalValues = isPayableForm
        ? {
            ...evaluated,
            _paymentStatus: paymentMethod === 'CARD' ? 'PAID' : 'INVOICED',
            _paymentMethod: paymentMethod,
            _paymentAmount: payableAmount,
            _paymentCurrency: paymentCurrency,
            _paidAt: new Date().toISOString(),
          }
        : evaluated;
      let serverResponse: any = null;

      const canCallBackend =
        !disableAutoBackendSubmit &&
        !isPreviewMode &&
        Boolean(
          (canonicalForm.id && !canonicalForm.id.startsWith('inline-') && !canonicalForm.id.startsWith('form_')) ||
            canonicalForm.moduleId
        );

      if (canCallBackend) {
        const res = await fetch(
          `${API_BASE_URL}/api/public/forms/${encodeURIComponent(canonicalForm.id)}/submit`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: finalValues,
              context: {
                user: context?.user || undefined,
                parentRecordId: context?.parentRecordId || context?.parentRecord?.id,
                siteId: context?.siteId,
                source: context?.source || (canonicalForm.usage === 'portal_site' ? 'Portal Site' : 'Form Submission'),
              },
            }),
          }
        );

        if (res.ok) {
          serverResponse = await res.json();
          setSubmittedRef(serverResponse.customerRef || serverResponse.id || null);
          if (serverResponse.invoiceNumber) {
            setSubmittedInvoiceNumber(serverResponse.invoiceNumber);
          }
        } else {
          const errJson = await res.json().catch(() => ({}));
          if (errJson.error) {
            throw new Error(errJson.error);
          }
        }
      }

      if (onSubmit) {
        await onSubmit(finalValues, serverResponse);
      }

      if (typeof window !== 'undefined' && canonicalForm.id) {
        localStorage.removeItem(`aurora_form_draft_${canonicalForm.id}`);
      }

      if (canonicalForm.settings?.redirectUrl && !isPreviewMode) {
        window.location.href = canonicalForm.settings.redirectUrl;
        return;
      }

      if (!submittedRef && !serverResponse) {
        const prefix = canonicalForm.settings?.customerRefPrefix || 'REF';
        setSubmittedRef(`${prefix}-${Math.floor(10000 + Math.random() * 90000)}`);
      }
      if (isPayableForm && payableAmount > 0 && !serverResponse?.invoiceNumber) {
        setSubmittedInvoiceNumber(`INV-${Math.floor(10000 + Math.random() * 90000)}`);
      }
      setSubmitted(true);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit form.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadReceipt = () => {
    if (typeof window === 'undefined') return;
    const allPlacements = canonicalForm.isMultistep
      ? visibleSteps.flatMap((s) => s.fields || [])
      : canonicalForm.fields || [];
    const rowsHtml = allPlacements
      .filter((p) => !String(p.id || '').startsWith('visual-') && !p.hidden && isFieldVisible(p, formValues))
      .map((p) => {
        const def = getUnifiedFieldDefinition(p.id, resolvedLayout, resolvedWorkflow, canonicalForm.customFields);
        const label = p.labelOverride || def?.label || p.id;
        const val = formValues[p.id];
        const displayVal =
          val === undefined || val === null || val === ''
            ? '—'
            : Array.isArray(val)
            ? `${val.length} item(s)`
            : typeof val === 'object'
            ? JSON.stringify(val)
            : String(val);
        return `<tr><td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;font-weight:600;color:#3f3f46;width:40%;">${label}</td><td style="padding:10px 12px;border-bottom:1px solid #e4e4e7;color:#18181b;">${displayVal}</td></tr>`;
      })
      .join('');

    const win = window.open('', '_blank', 'width=820,height=900');
    if (!win) {
      toast.info('Allow popups to print/save your PDF lodgement receipt.');
      return;
    }
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Lodgement Receipt — ${submittedRef || canonicalForm.name}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #18181b; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; }
            .badge { display: inline-block; background: #eef2ff; color: #4f46e5; padding: 6px 12px; border-radius: 8px; font-family: monospace; font-weight: 700; font-size: 13px; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 style="margin:0 0 6px 0;font-size:22px;">${canonicalForm.name || title || 'Form Lodgement Receipt'}</h1>
              <p style="margin:0;color:#71717a;font-size:12px;">Official Lodgement Summary • Submitted ${new Date().toLocaleString()}</p>
            </div>
            <div style="text-align:right;">
              <div class="badge">Ref: ${submittedRef || 'N/A'}</div>
              ${submittedInvoiceNumber ? `<div style="margin-top:6px;font-size:12px;font-weight:700;color:#059669;">Invoice: ${submittedInvoiceNumber} (${paymentCurrency} $${payableAmount.toFixed(2)})</div>` : ''}
            </div>
          </div>
          <table>${rowsHtml}</table>
          <script>window.onload = () => { window.print(); };</script>
        </body>
      </html>
    `);
    win.document.close();
  };

  // Governance Open / Close Window Enforcement (when not in preview mode)
  const governanceBlock = useMemo(() => {
    if (isPreviewMode) return null;
    const gov = canonicalForm.settings?.governance;
    if (!gov) return null;
    const now = Date.now();
    if (gov.openAt) {
      const openTs = new Date(gov.openAt).getTime();
      if (!isNaN(openTs) && now < openTs) {
        return {
          title: 'Form Not Yet Open',
          message:
            gov.closedMessage ||
            `This form will open for submissions on ${new Date(gov.openAt).toLocaleString()}.`,
        };
      }
    }
    if (gov.closeAt) {
      const closeTs = new Date(gov.closeAt).getTime();
      if (!isNaN(closeTs) && now > closeTs) {
        return {
          title: 'Submissions Closed',
          message:
            gov.closedMessage ||
            `Submissions for this form closed on ${new Date(gov.closeAt).toLocaleString()}.`,
        };
      }
    }
    return null;
  }, [canonicalForm.settings?.governance, isPreviewMode]);

  if (loadingForm) {
    return (
      <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-xs font-semibold text-zinc-500">Loading form configuration...</p>
      </div>
    );
  }

  if (governanceBlock) {
    return (
      <div className="p-8 text-center bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-3xl space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-amber-500">
          <Clock size={24} />
        </div>
        <h3 className="text-base font-bold text-zinc-900 dark:text-white">{governanceBlock.title}</h3>
        <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
          {governanceBlock.message}
        </p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="p-8 text-center bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-3xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto text-emerald-500">
          <CheckCircle2 size={28} />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
            {canonicalForm.settings?.successMessage || 'Submission Received!'}
          </h3>
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            Thank you. Your response for <span className="font-semibold">{canonicalForm.name || title || 'this form'}</span> has been recorded.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2">
          {submittedRef && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-emerald-500/30 text-xs">
              <span className="text-zinc-500 font-medium">Reference Number:</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{submittedRef}</span>
            </div>
          )}
          {submittedInvoiceNumber && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-zinc-900 border border-indigo-500/30 text-xs">
              <span className="text-zinc-500 font-medium">Invoice:</span>
              <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">
                {submittedInvoiceNumber} ({paymentCurrency} ${payableAmount.toFixed(2)})
              </span>
            </div>
          )}
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={handleDownloadReceipt}
            className="text-xs flex items-center gap-1.5 border-indigo-500/30 text-indigo-600 dark:text-indigo-400"
          >
            <Printer size={13} />
            <span>Download Official Lodgement Receipt (PDF)</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSubmitted(false);
              setSubmittedRef(null);
              setSubmittedInvoiceNumber(null);
              setIsReviewStep(false);
              setReviewDeclarationAccepted(false);
              setFormValues(computedInitialValues);
              if (canonicalForm.isMultistep && canonicalForm.steps.length > 0) {
                setActiveStepId(canonicalForm.steps[0].id);
              }
            }}
            className="text-xs"
          >
            Submit Another Response
          </Button>
        </div>
      </div>
    );
  }

  const displayTitle = title ?? canonicalForm.name;
  const displaySubtitle = subtitle ?? (canonicalForm.description || canonicalForm.settings?.description);
  const hideHeader = Boolean(canonicalForm.settings?.theme?.hideHeader);
  const progressPct =
    canonicalForm.isMultistep && visibleSteps.length > 0
      ? Math.round(((currentStepIndex + 1) / visibleSteps.length) * 100)
      : 100;

  const renderFieldsGrid = () => {
    if (isDesignMode && activePlacements.length === 0 && designMode?.renderEmptyCanvas) {
      return (
        <div className="grid grid-cols-12 gap-4">
          {designMode.renderEmptyCanvas()}
        </div>
      );
    }

    const gridNode = (
      <div className={cn('grid grid-cols-12', isDesignMode ? 'gap-4' : 'gap-x-5 gap-y-4')}>
        {activePlacements.map((fObj) => {
          const isVisual =
            String(fObj.id || '').startsWith('visual-') ||
            ['heading', 'divider', 'spacer', 'html-text', 'alert'].includes(fObj.type || '');

          if (!isDesignMode && fObj.hidden && !isPreviewMode) {
            return null;
          }

          if (!isDesignMode && !isFieldVisible(fObj, formValues)) {
            return null;
          }

          const baseField = isVisual
            ? null
            : getUnifiedFieldDefinition(
                fObj.id,
                resolvedLayout,
                resolvedWorkflow,
                canonicalForm.customFields
              );

          const fieldForInput = baseField
            ? {
                ...baseField,
                label: fObj.labelOverride || baseField.label,
                placeholder: fObj.placeholderOverride || baseField.placeholder,
                helperText: fObj.helperTextOverride || baseField.helperText,
                required: Boolean(fObj.required || baseField.required),
                calculationLogic: fObj.calculationLogic || baseField.calculationLogic,
              }
            : {
                id: fObj.id,
                label: fObj.labelOverride || fObj.id,
                type: (fObj.type || 'text') as any,
                placeholder: fObj.placeholderOverride,
                helperText: fObj.helperTextOverride,
                required: Boolean(fObj.required),
                calculationLogic: fObj.calculationLogic,
              };

          const colClass =
            viewport === 'mobile'
              ? 'col-span-12'
              : viewport === 'tablet'
              ? fObj.width === 'one-quarter' ||
                fObj.width === '3' ||
                fObj.width === 3 ||
                fObj.width === 'one-third' ||
                fObj.width === '4' ||
                fObj.width === 4
                ? 'col-span-12 sm:col-span-6'
                : widthToGridClass(fObj.width)
              : widthToGridClass(fObj.width);

          if (isVisual) {
            const visualBody = (
              <>
                {fObj.type === 'heading' && (
                  <h4 className="font-bold text-zinc-900 dark:text-white text-sm pt-2 pb-1 border-b border-zinc-100 dark:border-zinc-800/80 mb-1">
                    {fObj.labelOverride || 'Section Heading'}
                  </h4>
                )}
                {fObj.type === 'divider' && (
                  <div className="w-full h-px bg-zinc-200 dark:bg-zinc-800 my-2" />
                )}
                {fObj.type === 'spacer' && (
                  <div
                    className={cn(
                      isDesignMode &&
                        'flex items-center justify-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg text-[9px] font-mono text-zinc-400 uppercase'
                    )}
                    style={{
                      height:
                        fObj.height === 'sm'
                          ? 16
                          : fObj.height === 'lg'
                          ? 40
                          : fObj.height === 'xl'
                          ? 64
                          : 24,
                    }}
                  >
                    {isDesignMode ? `Vertical Spacer (${fObj.height || 'md'})` : null}
                  </div>
                )}
                {(fObj.type === 'html-text' || fObj.type === 'html') && (
                  <div className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed bg-zinc-50/70 dark:bg-zinc-800/40 p-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800">
                    {fObj.labelOverride || 'Instructions or information text...'}
                  </div>
                )}
                {fObj.type === 'alert' && (
                  <div
                    className={cn(
                      'p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold',
                      fObj.alertStyle === 'error'
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                        : fObj.alertStyle === 'warning'
                        ? 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400'
                        : fObj.alertStyle === 'success'
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                        : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                    )}
                  >
                    {fObj.alertStyle === 'error' ? (
                      <XCircle size={16} />
                    ) : fObj.alertStyle === 'warning' ? (
                      <AlertTriangle size={16} />
                    ) : fObj.alertStyle === 'success' ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Info size={16} />
                    )}
                    <span>{fObj.labelOverride || 'Important notice'}</span>
                  </div>
                )}
              </>
            );
            if (isDesignMode && designMode?.wrapField) {
              return <React.Fragment key={fObj.id}>{designMode.wrapField(fObj, visualBody)}</React.Fragment>;
            }
            return (
              <div key={fObj.id} className={cn('flex flex-col', colClass)}>
                {visualBody}
              </div>
            );
          }

          const isRequired = Boolean(fObj.required || fieldForInput.required);
          const isFieldReadOnly = Boolean(readOnly || fObj.readOnly);
          const err = fieldErrors[fObj.id];
          const effectiveType = fieldForInput.type || fObj.type || 'text';

          // 1. Repeatable Sub-Table (1:N)
          if (effectiveType === 'repeatableGroup') {
            if (isDesignMode && designMode?.wrapField) {
              return <React.Fragment key={fObj.id}>{designMode.wrapField(fObj, null)}</React.Fragment>;
            }
            const activeSubFields = resolveContainerChildFields(
              fObj,
              fieldForInput,
              resolvedLayout,
              resolvedWorkflow,
              canonicalForm.customFields
            );
            const currentRows: Record<string, any>[] = Array.isArray(formValues[fObj.id])
              ? formValues[fObj.id]
              : [];

            const repeaterFieldConfig: ModuleField = {
              ...(fieldForInput as ModuleField),
              type: 'repeatableGroup',
              collapsible: fObj.collapsible ?? true,
              defaultCollapsed: fObj.defaultCollapsed ?? false,
              fields: activeSubFields,
            };

            return (
              <div key={fObj.id} className={cn('flex flex-col space-y-1.5', colClass)}>
                <CollapsibleFieldGroup field={repeaterFieldConfig} count={currentRows.length}>
                  <RepeatableGroupBlock
                    field={repeaterFieldConfig}
                    value={currentRows}
                    onChange={(nextRows) => {
                      if (fObj.maxRows && fObj.maxRows > 0 && nextRows.length > fObj.maxRows) {
                        toast.warning(
                          `Maximum of ${fObj.maxRows} rows allowed for ${repeaterFieldConfig.label}`
                        );
                        return;
                      }
                      handleFieldChange(fObj.id, nextRows);
                    }}
                    readOnly={isFieldReadOnly}
                    hideHeader
                  />
                </CollapsibleFieldGroup>
                {err ? (
                  <p className="text-[10px] font-semibold text-rose-500">{err}</p>
                ) : fieldForInput.helperText ? (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {fieldForInput.helperText}
                  </p>
                ) : null}
              </div>
            );
          }

          // 2. Collapsible Field Group Section
          if (['fieldGroup', 'group', 'card', 'accordion'].includes(effectiveType)) {
            if (isDesignMode && designMode?.wrapField) {
              return <React.Fragment key={fObj.id}>{designMode.wrapField(fObj, null)}</React.Fragment>;
            }
            const activeChildFields = resolveContainerChildFields(
              fObj,
              fieldForInput,
              resolvedLayout,
              resolvedWorkflow,
              canonicalForm.customFields
            );

            const groupFieldConfig: ModuleField = {
              ...(fieldForInput as ModuleField),
              type: 'fieldGroup',
              collapsible: fObj.collapsible ?? true,
              defaultCollapsed: fObj.defaultCollapsed ?? false,
              fields: activeChildFields,
            };

            return (
              <div key={fObj.id} className={cn('flex flex-col space-y-1.5', colClass)}>
                <CollapsibleFieldGroup field={groupFieldConfig}>
                  <div className="grid grid-cols-12 gap-4">
                    {activeChildFields.map((childField: any) => {
                      if (!isFieldVisible(childField, formValues)) return null;
                      const childErr = fieldErrors[childField.id];
                      const childColClass =
                        childField.colSpan === 6
                          ? 'col-span-12 sm:col-span-6'
                          : childField.colSpan === 4
                          ? 'col-span-12 sm:col-span-4'
                          : childField.colSpan === 3
                          ? 'col-span-12 sm:col-span-3'
                          : 'col-span-12';
                      return (
                        <div
                          key={childField.id}
                          className={cn('flex flex-col space-y-1.5', childColClass)}
                        >
                          <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                            <span>{childField.label}</span>
                            {childField.required && (
                              <span className="text-rose-500 font-bold">*</span>
                            )}
                          </label>
                          <FieldInput
                            field={childField}
                            value={formValues[childField.id]}
                            onChange={(val) => handleFieldChange(childField.id, val)}
                            readonly={Boolean(isFieldReadOnly || childField.readonly)}
                            recordData={formValues}
                            allFields={allResolvedFields}
                            error={Boolean(childErr)}
                          />
                          {childErr && (
                            <p className="text-[10px] font-semibold text-rose-500">{childErr}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CollapsibleFieldGroup>
              </div>
            );
          }

          if (isDesignMode && designMode?.wrapField) {
            const designLeafInput = (
              <div className="pointer-events-none select-none space-y-1">
                <FieldInput
                  field={fieldForInput}
                  value={formValues[fObj.id]}
                  onChange={() => {}}
                  readonly={false}
                  recordData={formValues}
                  allFields={allResolvedFields}
                  error={false}
                />
                {fieldForInput.helperText && (
                  <p className="text-[10px] text-zinc-400 dark:text-zinc-500">
                    {fieldForInput.helperText}
                  </p>
                )}
              </div>
            );
            return <React.Fragment key={fObj.id}>{designMode.wrapField(fObj, designLeafInput)}</React.Fragment>;
          }

          return (
            <div
              key={fObj.id}
              className={cn(
                'flex flex-col space-y-1.5',
                colClass,
                fObj.hidden && isPreviewMode && 'opacity-50 border border-dashed border-amber-500/40 p-2 rounded-xl'
              )}
            >
              <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5">
                  <span>{fieldForInput.label}</span>
                  {isRequired && <span className="text-rose-500 font-bold">*</span>}
                  {fObj.hidden && isPreviewMode && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">
                      Hidden at Runtime
                    </span>
                  )}
                  {fObj.readOnly && (
                    <Lock size={10} className="text-zinc-400" title="Read-only field" />
                  )}
                </span>
                {fieldForInput.tooltip && (
                  <span title={fieldForInput.tooltip} className="text-zinc-400 hover:text-indigo-500 cursor-help">
                    <HelpCircle size={12} />
                  </span>
                )}
              </label>

              <FieldInput
                field={fieldForInput}
                value={formValues[fObj.id]}
                onChange={(val) => handleFieldChange(fObj.id, val)}
                readonly={isFieldReadOnly}
                recordData={formValues}
                allFields={allResolvedFields}
                error={Boolean(err)}
              />

              {err ? (
                <p className="text-[10px] font-semibold text-rose-500">{err}</p>
              ) : fieldForInput.helperText ? (
                <p className="text-[10px] text-zinc-400 dark:text-zinc-500">{fieldForInput.helperText}</p>
              ) : null}
            </div>
          );
        })}
      </div>
    );

    return isDesignMode && designMode?.wrapGrid ? designMode.wrapGrid(gridNode) : gridNode;
  };

  return (
    <form
      onSubmit={(e) => {
        if (isDesignMode) {
          e.preventDefault();
          return;
        }
        handleSubmit(e);
      }}
      className={cn(
        'space-y-6 bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-3xl border border-zinc-200 dark:border-zinc-800 shadow-sm',
        className
      )}
    >
      {/* Context Banner when running in Portal Site mode with Logged-In User */}
      {!isDesignMode &&
        (canonicalForm.usage === 'portal_site' || canonicalForm.settings?.contextBindings?.captureLoggedInUser) &&
        context?.user && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-700 dark:text-purple-300 text-xs">
            <div className="flex items-center gap-2">
              <UserCheck size={14} className="text-purple-500 shrink-0" />
              <span>
                Authenticated Context:{' '}
                <strong>{context.user.name || context.user.displayName || context.user.email}</strong>
              </span>
            </div>
            {context.parentRecordId && (
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-purple-500/10">
                Linked Object: {context.parentRecordId}
              </span>
            )}
          </div>
        )}

      {/* Header */}
      {isDesignMode && designMode?.renderHeader ? (
        designMode.renderHeader()
      ) : (
        !hideHeader && (displayTitle || displaySubtitle) && (
          <div className="border-b border-zinc-100 dark:border-zinc-800/80 pb-5">
            {displayTitle && (
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white tracking-tight">
                {displayTitle}
              </h2>
            )}
            {displaySubtitle && (
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                {displaySubtitle}
              </p>
            )}
          </div>
        )
      )}

      {/* Multi-step Wizard Progress & Step Bar */}
      {!isDesignMode && canonicalForm.isMultistep && visibleSteps.length > 0 && (
        <div className="space-y-3 pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
          {canonicalForm.settings?.theme?.showProgressBar !== false && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                <span>
                  Step {currentStepIndex + 1} of {visibleSteps.length}: {currentStep?.title}
                </span>
                <span className="text-indigo-600 dark:text-indigo-400">{progressPct}% Complete</span>
              </div>
              <div className="w-full h-1.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-1">
            {visibleSteps.map((step, idx) => {
              const isActive = step.id === currentStep?.id;
              const isCompleted = idx < currentStepIndex;
              return (
                <div key={step.id} className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      if (isCompleted || isPreviewMode) {
                        setActiveStepId(step.id);
                      }
                    }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                      isActive
                        ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 cursor-pointer'
                        : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-400 dark:text-zinc-500 border border-transparent'
                    )}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold',
                        isActive
                          ? 'bg-indigo-600 text-white'
                          : isCompleted
                          ? 'bg-emerald-500 text-white'
                          : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300'
                      )}
                    >
                      {isCompleted ? <Check size={10} strokeWidth={3} /> : idx + 1}
                    </span>
                    <span>{step.title}</span>
                  </button>
                  {idx < visibleSteps.length - 1 && (
                    <div className="w-4 h-px bg-zinc-200 dark:bg-zinc-800" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Legacy Tabs if provided */}
      {!canonicalForm.isMultistep && tabs.length > 1 && (
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTabId(tab.id)}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-t-lg transition-colors border-b-2 whitespace-nowrap',
                activeTabId === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-950/30'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Saved Draft Banner */}
      {savedDraftInfo && (
        <div className="p-4 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
              <Sparkles size={14} className="text-indigo-500" />
              <span>Draft Saved — Resume Token: {savedDraftInfo.token}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(savedDraftInfo.url);
                setCopiedDraftUrl(true);
                toast.success('Resume link copied to clipboard!');
                setTimeout(() => setCopiedDraftUrl(false), 2000);
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-semibold transition-all cursor-pointer"
            >
              {copiedDraftUrl ? <Check size={12} /> : <Copy size={12} />}
              <span>{copiedDraftUrl ? 'Copied Link' : 'Copy Resume Link'}</span>
            </button>
          </div>
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono truncate">
            {savedDraftInfo.url}
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-center gap-2 text-xs text-red-600 dark:text-red-400">
          <AlertCircle size={16} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Review & Confirm Summary Step */}
      {isReviewStep ? (
        <div className="space-y-5">
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <FileText size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-zinc-900 dark:text-white">
                  Review & Confirm Your Details
                </h4>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  Please verify your responses below before final submission. Click "Edit" on any section to make changes.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {(canonicalForm.isMultistep
              ? visibleSteps
              : [{ id: 'step-1', title: canonicalForm.name || 'Summary', fields: canonicalForm.fields }]
            ).map((step, sIdx) => {
              const stepFields = (step.fields || []).filter(
                (p) =>
                  !String(p.id || '').startsWith('visual-') &&
                  !p.hidden &&
                  isFieldVisible(p, formValues)
              );
              if (stepFields.length === 0) return null;

              return (
                <div
                  key={step.id}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 overflow-hidden"
                >
                  <div className="px-4 py-2.5 bg-zinc-100/80 dark:bg-zinc-800/70 border-b border-zinc-200/80 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                      {canonicalForm.isMultistep ? `Step ${sIdx + 1}: ${step.title}` : 'Form Responses'}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveStepId(step.id);
                        setIsReviewStep(false);
                      }}
                      className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 size={11} />
                      <span>Edit</span>
                    </button>
                  </div>

                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {stepFields.map((p) => {
                      const def = getUnifiedFieldDefinition(
                        p.id,
                        resolvedLayout,
                        resolvedWorkflow,
                        canonicalForm.customFields
                      );
                      const label = p.labelOverride || def?.label || p.id;
                      const val = formValues[p.id];
                      const formattedVal =
                        val === undefined || val === null || val === ''
                          ? '—'
                          : typeof val === 'boolean'
                          ? val
                            ? 'Yes'
                            : 'No'
                          : Array.isArray(val)
                          ? `${val.length} row(s) / item(s)`
                          : typeof val === 'object'
                          ? JSON.stringify(val)
                          : String(val);

                      return (
                        <div key={p.id} className="space-y-0.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                            {label}
                          </span>
                          <span className="text-xs font-semibold text-zinc-900 dark:text-white break-words block">
                            {formattedVal}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {canonicalForm.settings?.reviewDeclarationText && (
            <label className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-500/25 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={reviewDeclarationAccepted}
                onChange={(e) => setReviewDeclarationAccepted(e.target.checked)}
                className="mt-0.5 rounded border-amber-400 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 leading-relaxed">
                {canonicalForm.settings.reviewDeclarationText}
              </span>
            </label>
          )}
        </div>
      ) : (
        /* 12-Column Responsive Grid */
        renderFieldsGrid()
      )}

      {/* Payable Form Checkout Summary (on final step or single-page form) */}
      {!isDesignMode && isPayableForm &&
        (isReviewStep || !canonicalForm.isMultistep || currentStepIndex === visibleSteps.length - 1) && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-500/25 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-600 dark:text-emerald-400" />
                <div>
                  <p className="text-xs font-bold text-zinc-900 dark:text-white">
                    {paymentConfig?.itemTitle || `${canonicalForm.name} Lodgement Fee`}
                  </p>
                  <p className="text-[10px] text-zinc-500">
                    {paymentConfig?.amountMode === 'field'
                      ? `Calculated from field (${paymentConfig.amountFieldId})`
                      : 'Standard Application / Service Fee'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-base font-black text-emerald-600 dark:text-emerald-400 font-mono">
                  {paymentCurrency} ${payableAmount.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              {(['CARD', 'INVOICE'] as const).map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={cn(
                    'flex-1 py-1.5 px-3 rounded-xl text-[11px] font-bold border transition-all cursor-pointer',
                    paymentMethod === pm
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs'
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                  )}
                >
                  {pm === 'CARD' ? 'Pay Now (Card / Instant)' : 'Request Tax Invoice'}
                </button>
              ))}
            </div>
          </div>
        )}

      {/* Footer Actions */}
      {isDesignMode && designMode?.renderSubmitBar ? (
        designMode.renderSubmitBar()
      ) : !readOnly && (
        <div className="pt-5 border-t border-zinc-100 dark:border-zinc-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {isReviewStep ? (
              <Button
                type="button"
                variant="secondary"
                onClick={() => setIsReviewStep(false)}
                className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl"
              >
                <ChevronLeft size={14} />
                <span>Back to Edit</span>
              </Button>
            ) : (
              canonicalForm.isMultistep &&
              currentStepIndex > 0 && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveStepId(visibleSteps[currentStepIndex - 1].id)}
                  className="flex items-center gap-1.5 text-xs px-4 py-2 rounded-xl"
                >
                  <ChevronLeft size={14} />
                  <span>Previous</span>
                </Button>
              )
            )}

            {canonicalForm.settings?.allowSaveDraft && (
              <Button
                type="button"
                variant="secondary"
                loading={savingDraft}
                onClick={handleSaveDraft}
                className="flex items-center gap-1.5 text-xs px-3.5 py-2 rounded-xl text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
              >
                <Save size={13} />
                <span>Save & Resume Later</span>
              </Button>
            )}
          </div>

          <Button
            type="submit"
            loading={submitting}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer ml-auto"
          >
            {!isReviewStep && canonicalForm.isMultistep && currentStepIndex < visibleSteps.length - 1 ? (
              <>
                <span>Continue</span>
                <ChevronRight size={14} />
              </>
            ) : !isReviewStep && canonicalForm.settings?.enableReviewStep ? (
              <>
                <FileText size={14} />
                <span>Review & Confirm</span>
              </>
            ) : (
              <>
                <Send size={14} />
                <span>
                  {submitButtonText ||
                    canonicalForm.settings?.submitLabel ||
                    (canonicalForm.usage === 'workspace_create' ? 'Create Record' : 'Submit')}
                </span>
              </>
            )}
          </Button>
        </div>
      )}
    </form>
  );
};

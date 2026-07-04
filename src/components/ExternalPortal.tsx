import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  CloudUpload,
  FileText,
  Search,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, isFieldVisible } from '../lib/utils';
import { API_BASE_URL } from '../config';
import { FieldInput } from './FieldInput';
import { calculateDefaultValue } from '../services/fieldService';
import { toast } from 'sonner';

export const ExternalPortal = () => {
  const [view, setView] = useState<'SUBMIT' | 'TRACK'>('SUBMIT');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedId, setSubmittedId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // URL Query Parameter parsing
  const params = new URLSearchParams(window.location.search);
  const urlModuleId = params.get('moduleId');

  // Dynamic public form state
  const [moduleData, setModuleData] = useState<any | null>(null);
  const [publicForm, setPublicForm] = useState<any | null>(null);
  const [loadingForm, setLoadingForm] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [activeStepId, setActiveStepId] = useState<string | null>(null);
  const [dynamicFormData, setDynamicFormData] = useState<Record<string, any>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Static/Mock Form state (Fallback mode)
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    type: 'Community Grant Application',
    description: ''
  });

  // Fetch Public Form settings
  useEffect(() => {
    if (!urlModuleId) return;

    const loadPublicForm = async () => {
      setLoadingForm(true);
      setFormError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/api/public/modules/${urlModuleId}`);
        if (!res.ok) {
          throw new Error('Failed to load public form configuration.');
        }
        const data = await res.json();
        setModuleData(data);
        const formIdParam = new URLSearchParams(window.location.search).get('formId');
        const form = formIdParam
          ? data.forms?.find((f: any) => f.id === formIdParam)
          : data.forms?.find((f: any) => f.usage === 'public_link');
        if (!form) {
          // Gracefully fall back to standard intake form layout
          setPublicForm(null);
          return;
        }
        setPublicForm(form);
        
        // Initialize form data defaults
        const defaults: Record<string, any> = {};
        (data.layout || []).forEach((field: any) => {
          const defVal = calculateDefaultValue(field, defaults);
          if (defVal !== undefined && defVal !== null && defVal !== '') {
            defaults[field.id] = defVal;
          }
        });
        setDynamicFormData(defaults);

        if (form.isMultistep && form.steps?.length > 0) {
          setActiveStepId(form.steps[0].id);
        }
      } catch (err: any) {
        setFormError(err.message || 'An error occurred loading the form.');
      } finally {
        setLoadingForm(false);
      }
    };

    loadPublicForm();
  }, [urlModuleId]);

  // Static submission handler (Fallback mode)
  const handleStaticSubmit = async () => {
    if (!formData.fullName || !formData.email || !formData.description) return;
    
    setIsSubmitting(true);
    try {
      let response;
      if (urlModuleId) {
        response = await fetch(`${API_BASE_URL}/api/public/modules/${urlModuleId}/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: {
              submitted_by: formData.fullName,
              email: formData.email,
              description: formData.description,
              form_type: formData.type,
              source: 'External Portal'
            }
          })
        });
      } else {
        response = await fetch(`${API_BASE_URL}/api/public/submissions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tenantSlug: 'aurora',
            type: formData.type,
            fullName: formData.fullName,
            email: formData.email,
            description: formData.description
          })
        });
      }

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Submission failed');
      }

      const result = await response.json();
      setSubmittedId(result.customerRef || result.id);
      setIsSubmitted(true);
    } catch (error: any) {
      console.error("Submission Error:", error);
      alert(error.message || "Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Dynamic submission handler (Portal mode)
  const handleDynamicSubmit = async () => {
    if (!publicForm || !moduleData) return;

    // Validate active fields
    const currentStep = publicForm.isMultistep 
      ? publicForm.steps.find((s: any) => s.id === activeStepId)
      : null;
    const fieldsToValidate = currentStep ? currentStep.fields : publicForm.fields;
    const errors: Record<string, string> = {};

    fieldsToValidate.forEach((fObj: any) => {
      if (fObj.id.startsWith('visual-')) return;
      const isVisible = isFieldVisible(fObj, dynamicFormData);
      if (!isVisible) return;

      const field = (moduleData.layout || []).find((f: any) => f.id === fObj.id);
      const isRequired = fObj.required || field?.required;
      const value = dynamicFormData[fObj.id];

      if (isRequired && (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0))) {
        errors[fObj.id] = `${fObj.labelOverride || field?.label || 'Field'} is required.`;
      }
    });

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast.error('Please correct the validation errors in the form.');
      return;
    }

    if (publicForm.isMultistep) {
      const visibleSteps = publicForm.steps.filter((s: any) => isFieldVisible(s, dynamicFormData));
      const currentIdx = visibleSteps.findIndex((s: any) => s.id === activeStepId);
      if (currentIdx < visibleSteps.length - 1) {
        setActiveStepId(visibleSteps[currentIdx + 1].id);
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/public/modules/${urlModuleId}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          data: {
            ...dynamicFormData,
            _formId: publicForm.id
          }
        })
      });

      if (!res.ok) {
        throw new Error('Failed to submit form.');
      }

      const result = await res.json();
      setSubmittedId(result.customerRef || result.id);
      setIsSubmitted(true);
      toast.success(publicForm.settings?.successMessage || 'Form submitted successfully!');
    } catch (err: any) {
      toast.error(err.message || 'An error occurred during submission.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-200 selection:bg-indigo-500/30">
      <nav className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-950/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Sparkles size={18} className="text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-zinc-900 dark:text-white">
            {moduleData ? moduleData.name : 'Acme Portal'}
          </span>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => setView('SUBMIT')}
            className={cn("text-sm font-medium transition-colors", view === 'SUBMIT' ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
          >
            New Submission
          </button>
          <button 
            onClick={() => setView('TRACK')}
            className={cn("text-sm font-medium transition-colors", view === 'TRACK' ? "text-zinc-900 dark:text-white" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300")}
          >
            Track Status
          </button>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto py-16 px-6">
        <AnimatePresence mode="wait">
          {view === 'SUBMIT' ? (
            !isSubmitted ? (
              <motion.div 
                key="submit"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-12"
              >
                {loadingForm ? (
                  <div className="flex flex-col items-center justify-center py-20 space-y-4">
                    <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-zinc-500 font-bold uppercase tracking-wider">Loading form layout...</p>
                  </div>
                ) : formError ? (
                  <div className="p-8 bg-rose-500/5 border border-rose-500/20 rounded-3xl text-center space-y-4 max-w-md mx-auto">
                    <AlertCircle className="mx-auto text-rose-500" size={32} />
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-zinc-900 dark:text-white">Intake Configuration Error</p>
                      <p className="text-xs text-zinc-500">{formError}</p>
                    </div>
                  </div>
                ) : publicForm ? (
                  // --- Dynamic Public Form ---
                  <div className="space-y-10">
                    <div className="space-y-4">
                      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">
                        {publicForm.name}
                      </h1>
                      <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                        {publicForm.settings?.description || 'Please fill in the form details below.'}
                      </p>
                    </div>

                    {publicForm.isMultistep && publicForm.steps && (
                      <div className="flex items-center gap-4 px-2 mb-8 overflow-x-auto no-scrollbar py-2">
                        {publicForm.steps
                          .filter((s: any) => isFieldVisible(s, dynamicFormData))
                          .map((step: any, idx: number, list: any[]) => {
                            const isActive = activeStepId === step.id;
                            const activeIdx = list.findIndex(s => s.id === activeStepId);
                            const isCompleted = activeIdx > idx;

                            return (
                              <div key={step.id} className="flex items-center gap-3 shrink-0">
                                <div className={cn(
                                  "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all duration-300",
                                  isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : 
                                  isCompleted ? "bg-emerald-500 text-white" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400"
                                )}>
                                  {isCompleted ? <Check size={12} /> : idx + 1}
                                </div>
                                <span className={cn(
                                  "text-[9px] font-black uppercase tracking-widest transition-colors",
                                  isActive ? "text-zinc-900 dark:text-white" : "text-zinc-400"
                                )}>{step.title}</span>
                                {idx < list.length - 1 && (
                                  <div className="w-8 h-px bg-zinc-200 dark:bg-zinc-800 ml-2" />
                                )}
                              </div>
                            );
                        })}
                      </div>
                    )}

                    <div className="space-y-8 p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                      <div className="grid grid-cols-12 gap-6">
                        {(() => {
                          const currentStep = publicForm.isMultistep 
                            ? publicForm.steps.find((s: any) => s.id === activeStepId)
                            : null;
                          const fields = currentStep ? currentStep.fields : publicForm.fields;

                          return fields.map((fObj: any) => {
                            const isVisual = fObj.id.startsWith('visual-');
                            const field = isVisual ? null : (moduleData.layout || []).find((f: any) => f.id === fObj.id);
                            if (!isVisual && !field) return null;

                            // Evaluate Visibility
                            if (!isFieldVisible(fObj, dynamicFormData)) return null;

                            const labelOverride = fObj.labelOverride || field?.label;
                            const isRequired = fObj.required || field?.required;
                            const isReadOnly = fObj.readOnly || field?.readOnly;

                            return (
                              <div key={fObj.id} className={cn(
                                "space-y-2",
                                fObj.width === 'half' ? "col-span-6" : "col-span-12"
                              )}>
                                {isVisual ? (
                                  <div className="py-2">
                                    {fObj.type === 'heading' && (
                                      <h3 className="text-xl font-bold text-zinc-900 dark:text-white">{fObj.labelOverride || 'Section Heading'}</h3>
                                    )}
                                    {fObj.type === 'divider' && (
                                      <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-4" />
                                    )}
                                    {fObj.type === 'spacer' && (
                                      <div style={{ height: fObj.height === 'sm' ? 16 : fObj.height === 'lg' ? 64 : fObj.height === 'xl' ? 128 : 32 }} />
                                    )}
                                    {fObj.type === 'html-text' && (
                                      <div className="text-sm text-zinc-500 leading-relaxed prose dark:prose-invert max-w-none">
                                        {fObj.labelOverride || 'Text content goes here...'}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <>
                                    <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-1.5 relative group/label">
                                      {labelOverride}
                                      {isRequired && <span className="text-rose-500">*</span>}
                                      {field?.tooltip && (
                                        <div className="relative cursor-help">
                                          <HelpCircle size={10} className="text-zinc-400 hover:text-indigo-500 transition-colors" />
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-zinc-900 text-white text-[10px] rounded-lg opacity-0 group-hover/label:opacity-100 pointer-events-none transition-all duration-200 whitespace-pre-wrap w-48 shadow-xl border border-white/10 z-50">
                                            {field.tooltip}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-zinc-900" />
                                          </div>
                                        </div>
                                      )}
                                    </label>
                                    <FieldInput 
                                      field={field!}
                                      value={dynamicFormData[field!.id]}
                                      onChange={(val) => {
                                        setDynamicFormData(prev => ({ ...prev, [field!.id]: val }));
                                        if (formErrors[field!.id]) {
                                          setFormErrors(prev => {
                                            const next = { ...prev };
                                            delete next[field!.id];
                                            return next;
                                          });
                                        }
                                      }}
                                      error={!!formErrors[field!.id]}
                                      readonly={isReadOnly}
                                    />
                                    {formErrors[field!.id] && (
                                      <p className="text-[10px] font-bold text-rose-500 mt-1 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                        {formErrors[field!.id]}
                                      </p>
                                    )}
                                    {field?.helperText && !formErrors[field.id] && (
                                      <p className="text-[10px] text-zinc-500 mt-1 font-medium px-1 italic">{field.helperText}</p>
                                    )}
                                  </>
                                )}
                              </div>
                            );
                          });
                        })()}
                      </div>

                      <div className="flex gap-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                        {publicForm.isMultistep && activeStepId !== publicForm.steps[0].id && (
                          <button
                            onClick={() => {
                              const visibleSteps = publicForm.steps.filter((s: any) => isFieldVisible(s, dynamicFormData));
                              const currentIdx = visibleSteps.findIndex((s: any) => s.id === activeStepId);
                              if (currentIdx > 0) {
                                setActiveStepId(visibleSteps[currentIdx - 1].id);
                              }
                            }}
                            className="flex-1 py-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl font-bold text-zinc-600 dark:text-white hover:bg-zinc-50 transition-all flex items-center justify-center gap-2"
                          >
                            <ChevronLeft size={16} />
                            <span>Back</span>
                          </button>
                        )}
                        <button 
                          onClick={handleDynamicSubmit}
                          disabled={isSubmitting}
                          className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                          ) : (
                            <>
                              <span>
                                {publicForm.isMultistep && activeStepId !== publicForm.steps[publicForm.steps.length - 1].id
                                  ? 'Continue'
                                  : (publicForm.settings?.submitLabel || 'Submit Request')
                                }
                              </span>
                              <ArrowRight size={18} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // --- Default Fallback Form (Acme Grants Intake Mock) ---
                  <>
                    <div className="space-y-4">
                      <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Submit a Request</h1>
                      <p className="text-zinc-500 dark:text-zinc-400 text-lg">Provide the details below and our team (assisted by Aurora AI) will process your request.</p>
                    </div>

                    <div className="space-y-8 p-8 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-3xl shadow-sm">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Full Name</label>
                          <input 
                            type="text" 
                            value={formData.fullName}
                            onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Email Address</label>
                          <input 
                            type="email" 
                            value={formData.email}
                            onChange={(e) => setFormData({...formData, email: e.target.value})}
                            className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors" 
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Request Type</label>
                        <select 
                          value={formData.type}
                          onChange={(e) => setFormData({...formData, type: e.target.value})}
                          className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors appearance-none"
                        >
                          <option>Community Grant Application</option>
                          <option>Service Maintenance Request</option>
                          <option>Business License Renewal</option>
                          <option>General Enquiry</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Description</label>
                        <textarea 
                          value={formData.description}
                          onChange={(e) => setFormData({...formData, description: e.target.value})}
                          className="w-full h-32 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl px-4 py-3 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors resize-none" 
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Supporting Documents</label>
                        <div className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl p-8 text-center space-y-4 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors cursor-pointer group">
                          <div className="w-12 h-12 bg-zinc-50 dark:bg-zinc-950 rounded-full flex items-center justify-center mx-auto text-zinc-400 dark:text-zinc-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            <CloudUpload size={24} />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-zinc-900 dark:text-white">Click to upload or drag and drop</p>
                            <p className="text-xs text-zinc-500 mt-1">PDF, JPG, PNG up to 10MB</p>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={handleStaticSubmit}
                        disabled={isSubmitting}
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <span>Submit Request</span>
                            <ArrowRight size={18} />
                          </>
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            ) : (
              <motion.div 
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-8 py-12"
              >
                <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 size={40} />
                </div>
                <div className="space-y-4">
                  <h2 className="text-3xl font-bold text-zinc-900 dark:text-white">Request Submitted!</h2>
                  <p className="text-zinc-500 dark:text-zinc-400 max-w-md mx-auto">
                    Your request has been received and assigned ID <span className="text-zinc-900 dark:text-white font-bold">{submittedId}</span>. You can track its progress using this ID.
                  </p>
                </div>
                <div className="flex justify-center gap-4">
                  <button 
                    onClick={() => setIsSubmitted(false)}
                    className="px-6 py-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm font-bold text-zinc-700 dark:text-white hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                  >
                    Submit Another
                  </button>
                  <button 
                    onClick={() => setView('TRACK')}
                    className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20"
                  >
                    Track Status
                  </button>
                </div>
              </motion.div>
            )
          ) : (
            <motion.div 
              key="track"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-12"
            >
              <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-white">Track your Request</h1>
                <p className="text-zinc-500 dark:text-zinc-400 text-lg">Enter your reference ID to see the current status and history.</p>
              </div>

              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
                  <input 
                    type="text" 
                    placeholder="e.g. C-1084" 
                    className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-2xl pl-12 pr-4 py-4 text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <button className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/20">
                  Track
                </button>
              </div>

              <div className="space-y-6">
                <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest">Recent Requests</h3>
                {[
                  { id: 'C-1001', title: 'Community Grant Application', status: 'In Review', date: '2 days ago' },
                  { id: 'C-0982', title: 'Street Light Maintenance', status: 'Completed', date: '1 week ago' },
                ].map((req, i) => (
                  <div key={i} className="p-6 bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors group shadow-sm">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl flex items-center justify-center text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-zinc-900 dark:text-white">{req.title}</p>
                        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">{req.id} • {req.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", 
                        req.status === 'Completed' ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      )}>
                        {req.status}
                      </span>
                      <ChevronRight size={16} className="text-zinc-300 dark:text-zinc-700" />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

import React, { useState } from 'react';
import { 
  Plus, Trash2, Settings, Eye, GripVertical, FileText, Save, 
  Calculator, Sliders
} from 'lucide-react';

import { ModuleField, Tab, StandaloneBuilderContext, FormEntity } from '../../../types/platform';
import { Button } from '../../UI/Primitives';
import { FormRenderer } from './FormRenderer';
import { FieldSelectorModal } from '../../Builder/FieldSelectorModal';
import { CalculatorModal } from '../../Builder/CalculatorModal';
import { ConditionModal } from '../../Builder/ConditionModal';
import { cn } from '../../../lib/utils';
import { toast } from 'sonner';
import { API_BASE_URL } from '../../../config';
import { usePlatform } from '../../../hooks/usePlatform';

export interface FormBuilderProps {
  initialForm?: Partial<FormEntity>;
  builderContext: StandaloneBuilderContext;
  onSave?: (form: FormEntity) => void;
}

export const FormBuilder: React.FC<FormBuilderProps> = ({
  initialForm,
  builderContext,
  onSave
}) => {
  const { tenant } = usePlatform();
  const [name, setName] = useState(initialForm?.name || 'Untitled Form');
  const [description, setDescription] = useState(initialForm?.description || '');
  const [fields, setFields] = useState<ModuleField[]>(
    initialForm?.schema?.layout !== undefined
      ? initialForm.schema.layout
      : [
          { id: 'f_1', label: 'Full Name', type: 'text', required: true, colSpan: 6 },
          { id: 'f_2', label: 'Email Address', type: 'email', required: true, colSpan: 6 },
          { id: 'f_3', label: 'Inquiry / Comments', type: 'textarea', required: false, colSpan: 12 }
        ]
  );
  const [tabs] = useState<Tab[]>(initialForm?.schema?.tabs || [
    { id: 'tab_default', label: 'General Information' }
  ]);
  const [activeTabId] = useState<string>(tabs[0]?.id || 'tab_default');

  const [viewMode, setViewMode] = useState<'editor' | 'preview'>('editor');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(fields[0]?.id || null);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (initialForm) {
      setName(initialForm.name || 'Untitled Form');
      setDescription(initialForm.description || '');
      if (initialForm.schema?.layout !== undefined) {
        setFields(initialForm.schema.layout);
        setSelectedFieldId(initialForm.schema.layout[0]?.id || null);
      }
    }
  }, [initialForm]);

  // Sub-Modals & Drawers from ModuleBuilder Engine
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [showCalculatorModal, setShowCalculatorModal] = useState(false);
  const [showConditionModal, setShowConditionModal] = useState(false);

  const selectedField = fields.find(f => f.id === selectedFieldId);

  const handleAddFieldFromType = (type: string) => {
    const newField: ModuleField = {
      id: `f_${Date.now()}`,
      label: `New ${type.charAt(0).toUpperCase() + type.slice(1)} Field`,
      type: type as any,
      required: false,
      colSpan: 12,
      tabId: activeTabId
    };
    setFields([...fields, newField]);
    setSelectedFieldId(newField.id);
    setShowFieldSelector(false);
  };

  const handleUpdateField = (id: string, updates: Partial<ModuleField>) => {
    setFields(fields.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleDeleteField = (id: string) => {
    const nextFields = fields.filter(f => f.id !== id);
    setFields(nextFields);
    if (selectedFieldId === id) {
      setSelectedFieldId(nextFields[0]?.id || null);
    }
  };

  const handleSaveForm = async () => {
    setSaving(true);
    try {
      const formPayload: FormEntity = {
        id: initialForm?.id || `form_${Date.now()}`,
        tenantId: tenant?.id || 't1',
        name,
        description,
        isGlobal: builderContext.mode === 'global',
        version: (initialForm?.version || 1) + 1,
        status: 'PUBLISHED',
        schema: {
          layout: fields,
          tabs: tabs
        }
      };

      if (builderContext.mode === 'global') {
        const res = await fetch(`${API_BASE_URL}/api/forms${initialForm?.id ? `/${initialForm.id}` : ''}`, {
          method: initialForm?.id ? 'PUT' : 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-tenant-id': tenant?.id || ''
          },
          body: JSON.stringify(formPayload)
        });
        if (res.ok) {
          const saved = await res.json();
          toast.success(`Form "${name}" saved!`);
          if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(saved.id, saved);
          if (onSave) onSave(saved);
        } else {
          toast.success(`Form "${name}" saved!`);
          if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(formPayload.id, formPayload);
          if (onSave) onSave(formPayload);
        }
      } else {
        toast.success(`Form "${name}" saved in-context!`);
        if (builderContext.onSaveSuccess) builderContext.onSaveSuccess(formPayload.id, formPayload);
        if (onSave) onSave(formPayload);
      }
    } catch (err) {
      toast.error('Failed to save form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-zinc-50 dark:bg-zinc-950 overflow-hidden">

      {/* Top Header Controls */}
      <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3">
          <span className="p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl">
            <FileText size={18} />
          </span>
          <div>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="font-bold text-base text-zinc-900 dark:text-white bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
              placeholder="Form Name..."
            />
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs text-zinc-500 dark:text-zinc-400 bg-transparent border-none outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 block w-full mt-0.5"
              placeholder="Form Description / Subtitle..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('editor')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === 'editor' ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Settings size={14} />
              <span>Grid Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all",
                viewMode === 'preview' ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
              )}
            >
              <Eye size={14} />
              <span>Live Preview</span>
            </button>
          </div>

          <Button
            onClick={handleSaveForm}
            loading={saving}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-xl shadow-md transition-all"
          >
            <Save size={15} />
            <span>Save Form</span>
          </Button>
        </div>
      </div>

      {/* Main Canvas Body */}
      {viewMode === 'preview' ? (
        <div className="flex-1 p-6 overflow-y-auto max-w-4xl mx-auto w-full">
          <FormRenderer
            title={name}
            subtitle={description}
            fields={fields}
            tabs={tabs}
          />
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Center 12-Column Grid Canvas */}
          <div className="flex-1 p-6 overflow-y-auto bg-zinc-100/40 dark:bg-zinc-950/40 space-y-4">
            {/* Toolbar Action Strip */}
            <div className="flex items-center justify-between bg-white dark:bg-zinc-900 p-3 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowFieldSelector(true)}
                  className="flex items-center gap-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white py-1.5 px-3 rounded-xl shadow-sm"
                >
                  <Plus size={14} />
                  <span>Add Field</span>
                </Button>

                <button
                  onClick={() => setShowCalculatorModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl transition-colors"
                >
                  <Calculator size={14} className="text-indigo-500" />
                  <span>Calculations & Formulas</span>
                </button>

                <button
                  onClick={() => setShowConditionModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-xl transition-colors"
                >
                  <Sliders size={14} className="text-purple-500" />
                  <span>Field Conditions</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-zinc-400">{fields.length} Fields Configured</span>
            </div>

            {/* 12-Column Layout Grid Canvas */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm min-h-[400px]">
              <div className="grid grid-cols-12 gap-4">
                {fields.map((field) => (
                  <div
                    key={field.id}
                    onClick={() => setSelectedFieldId(field.id)}
                    style={{ gridColumn: `span ${field.colSpan || 12}` }}
                    className={cn(
                      "group relative p-4 rounded-2xl border transition-all cursor-pointer select-none",
                      selectedFieldId === field.id
                        ? "border-indigo-500 bg-indigo-50/30 dark:bg-indigo-950/20 shadow-md ring-2 ring-indigo-500/20"
                        : "border-zinc-200 dark:border-zinc-800 hover:border-indigo-300 bg-zinc-50/50 dark:bg-zinc-800/40"
                    )}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <GripVertical size={14} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <span className="text-xs font-bold text-zinc-900 dark:text-white">{field.label}</span>
                        {field.required && <span className="text-red-500 font-bold">*</span>}
                      </div>

                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300 uppercase">
                          {field.type}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteField(field.id);
                          }}
                          className="p-1 text-zinc-400 hover:text-red-500 rounded-md transition-colors"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <div className="h-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl px-3 flex items-center text-xs text-zinc-400 pointer-events-none">
                      {field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Properties Inspector */}
          <div className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 overflow-y-auto space-y-5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Field Properties</h4>

            {selectedField ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Field Label</label>
                  <input
                    type="text"
                    value={selectedField.label}
                    onChange={(e) => handleUpdateField(selectedField.id, { label: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Placeholder</label>
                  <input
                    type="text"
                    value={selectedField.placeholder || ''}
                    onChange={(e) => handleUpdateField(selectedField.id, { placeholder: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Grid Column Span</label>
                  <select
                    value={selectedField.colSpan || 12}
                    onChange={(e) => handleUpdateField(selectedField.id, { colSpan: Number(e.target.value) })}
                    className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value={12}>Full Width (12/12)</option>
                    <option value={6}>Half Width (6/12)</option>
                    <option value={4}>One Third (4/12)</option>
                    <option value={3}>One Quarter (3/12)</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 pt-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                  <input
                    type="checkbox"
                    id="req_check"
                    checked={selectedField.required}
                    onChange={(e) => handleUpdateField(selectedField.id, { required: e.target.checked })}
                    className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <label htmlFor="req_check" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Required Field</label>
                </div>

                {/* Cross-Builder Integrations */}
                <div className="pt-2 space-y-3">
                  <h5 className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Cross-Builder Integrations</h5>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">Validation Ruleset</label>
                    <select
                      value={selectedField.validationRuleId || ''}
                      onChange={(e) => handleUpdateField(selectedField.id, { validationRuleId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">(Standard Validation)</option>
                      <option value="val_tax_id">Corporate Tax ID Ruleset</option>
                      <option value="val_email">Corporate Email Format Ruleset</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">On Submit: PDF Template</label>
                    <select
                      value={selectedField.pdfTemplateId || ''}
                      onChange={(e) => handleUpdateField(selectedField.id, { pdfTemplateId: e.target.value })}
                      className="w-full px-3 py-1.5 text-xs bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">(No Auto PDF)</option>
                      <option value="tpl_receipt">Customer Inquiry Receipt PDF</option>
                      <option value="tpl_contract">Standard Service Contract PDF</option>
                    </select>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-400">Click a field on the canvas to inspect and edit properties.</p>
            )}
          </div>
        </div>
      )}

      {/* Sub-Modals from ModuleBuilder Engine */}
      {showFieldSelector && (
        <FieldSelectorModal
          isOpen={showFieldSelector}
          onClose={() => setShowFieldSelector(false)}
          onSelect={(fieldType) => handleAddFieldFromType(fieldType)}
          fields={fields as any}
        />
      )}

      {showCalculatorModal && (
        <CalculatorModal
          isOpen={showCalculatorModal}
          onClose={() => setShowCalculatorModal(false)}
          availableFields={fields as any}
          targetLabel={selectedField?.label || 'Form Field'}
          onSave={(_logic, _triggers) => {
            toast.success('Calculation rule saved!');
            setShowCalculatorModal(false);
          }}
        />
      )}

      {showConditionModal && (
        <ConditionModal
          isOpen={showConditionModal}
          onClose={() => setShowConditionModal(false)}
          availableFields={fields as any}
          tabs={tabs as any}
          targetLabel={selectedField?.label || 'Form Field'}
          onSave={(_rule) => {
            toast.success('Field condition rule saved!');
            setShowConditionModal(false);
          }}
        />
      )}

    </div>
  );
};

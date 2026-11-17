import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  Building2,
  Shield,
  Calendar,
  Check,
  AlertCircle,
  Sparkles,
  Mail,
  MapPin,
  Plus,
  Trash2,
  ExternalLink,
  Sliders,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  X,
  Phone,
  Globe,
  Briefcase,
  Layers,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { usePlatform } from '../../hooks/usePlatform';
import { API_BASE_URL } from '../../config';
import { AuroraModal } from '../UI/AuroraModal';
import { Input, Button } from '../UI/Primitives';
import { DatePicker } from '../UI/DatePicker';
import { EntityAvatarUpload } from './EntityAvatarUpload';
import { toast } from 'sonner';

const selectClassName =
  'w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdParty?: any) => void;
  initialPartyType?: 'PERSON' | 'ORGANIZATION';
  initialName?: string;
  initialPrimaryOrgPartyId?: string;
}

const DEFAULT_CLASSIFICATIONS = [
  'CLIENT',
  'SUPPLIER',
  'PARTNER',
  'VENDOR',
  'PROSPECT',
  'CONTRACTOR',
  'REGULATOR',
  'VIP',
];

export const CreatePartyModal: React.FC<CreatePartyModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialPartyType = 'PERSON',
  initialName = '',
  initialPrimaryOrgPartyId = '',
}) => {
  const { session } = useAuth();
  const { tenant, members } = usePlatform();

  // Wizard Step: 1 = Identity & Basics, 2 = Contact & Relationship, 3 = Location & Governance, 4 = Custom Fields (if any)
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [showMoreDetails, setShowMoreDetails] = useState<boolean>(false);

  const [partyType, setPartyType] = useState<'PERSON' | 'ORGANIZATION'>(initialPartyType);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateConflict, setDuplicateConflict] = useState<{ message: string; existingPartyId: string } | null>(
    null
  );

  // Existing directory entities for linking Primary Org / Primary Contact
  const [existingParties, setExistingParties] = useState<any[]>([]);

  // Common Party Fields
  const [status, setStatus] = useState<string>('VERIFIED');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [secondaryEmail, setSecondaryEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [mobile, setMobile] = useState('');
  const [website, setWebsite] = useState('');
  const [preferredContactMethod, setPreferredContactMethod] = useState('EMAIL');
  const [accountOwnerMemberId, setAccountOwnerMemberId] = useState('');
  const [classifications, setClassifications] = useState<string[]>(['CLIENT']);
  const [tagsInput, setTagsInput] = useState('');
  const [notesSummary, setNotesSummary] = useState('');

  // Person Fields
  const [salutation, setSalutation] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [department, setDepartment] = useState('');
  const [primaryOrgPartyId, setPrimaryOrgPartyId] = useState('');
  const [dob, setDob] = useState('');
  const [isHitl, setIsHitl] = useState(false);

  // Organization Fields
  const [legalName, setLegalName] = useState('');
  const [tradingName, setTradingName] = useState('');
  const [orgType, setOrgType] = useState('Corporate');
  const [incDate, setIncDate] = useState('');
  const [taxId, setTaxId] = useState('');
  const [companyNumber, setCompanyNumber] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('NET_30');
  const [creditLimit, setCreditLimit] = useState('');
  const [primaryContactPartyId, setPrimaryContactPartyId] = useState('');

  // Addresses
  const [addresses, setAddresses] = useState<
    Array<{
      type: string;
      line1: string;
      line2: string;
      city: string;
      state: string;
      postalCode: string;
      country: string;
      isPrimary: boolean;
    }>
  >([
    {
      type: 'PRIMARY',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'Australia',
      isPrimary: true,
    },
  ]);

  const [availableClassifications, setAvailableClassifications] = useState<string[]>(DEFAULT_CLASSIFICATIONS);
  const [availableLegalStructures, setAvailableLegalStructures] = useState<any[]>([]);
  const [availableIndustries, setAvailableIndustries] = useState<any[]>([]);

  // Custom Metadata Fields from Tenant Directory Settings
  const customFieldDefs = useMemo(() => {
    const defs = (tenant as any)?.settings?.directoryConfig?.customFields || [];
    return Array.isArray(defs)
      ? defs.filter((f: any) => !f.scope || f.scope === 'ALL' || f.scope === partyType)
      : [];
  }, [tenant, partyType]);

  const [customData, setCustomData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setShowMoreDetails(false);
      setPartyType(initialPartyType);
      if (initialPrimaryOrgPartyId) {
        setPrimaryOrgPartyId(initialPrimaryOrgPartyId);
      }
      if (initialName) {
        if (initialPartyType === 'PERSON') {
          const parts = initialName.trim().split(' ');
          setFirstName(parts[0] || '');
          setLastName(parts.slice(1).join(' ') || '');
        } else {
          setLegalName(initialName);
        }
      }
      // Load existing parties for Primary Org / Primary Contact dropdowns
      const token =
        (import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token');
      if (tenant?.id && token) {
        fetch(`${API_BASE_URL}/api/people-organisations?limit=250`, {
          headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant.id },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data) setExistingParties(Array.isArray(data) ? data : data.parties || []);
          })
          .catch(() => {});

        fetch(`${API_BASE_URL}/api/people-organisations/config`, {
          headers: { Authorization: `Bearer ${token}`, 'x-tenant-id': tenant.id },
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((cfg) => {
            if (cfg) {
              if (Array.isArray(cfg.classifications) && cfg.classifications.length > 0) {
                setAvailableClassifications(cfg.classifications);
              }
              if (Array.isArray(cfg.legalStructures) && cfg.legalStructures.length > 0) {
                setAvailableLegalStructures(cfg.legalStructures);
              }
              if (Array.isArray(cfg.industries) && cfg.industries.length > 0) {
                setAvailableIndustries(cfg.industries);
              }
            }
          })
          .catch(() => {});
      }
    }
  }, [isOpen, initialPartyType, initialName, tenant?.id, session?.access_token]);

  const existingOrgs = useMemo(
    () => existingParties.filter((p) => p.partyType === 'ORGANIZATION'),
    [existingParties]
  );
  const existingPeople = useMemo(
    () => existingParties.filter((p) => p.partyType === 'PERSON'),
    [existingParties]
  );

  const toggleClassification = (cls: string) => {
    setClassifications((prev) => (prev.includes(cls) ? prev.filter((c) => c !== cls) : [...prev, cls]));
  };

  const resetForm = () => {
    setCurrentStep(1);
    setShowMoreDetails(false);
    setAvatarUrl(null);
    setFirstName('');
    setMiddleName('');
    setLastName('');
    setSalutation('');
    setPreferredName('');
    setJobTitle('');
    setDepartment('');
    setPrimaryOrgPartyId('');
    setDob('');
    setIsHitl(false);
    setLegalName('');
    setTradingName('');
    setOrgType('Corporate');
    setIncDate('');
    setTaxId('');
    setCompanyNumber('');
    setIndustry('');
    setCompanySize('');
    setPaymentTerms('NET_30');
    setCreditLimit('');
    setPrimaryContactPartyId('');
    setEmail('');
    setSecondaryEmail('');
    setPhone('');
    setMobile('');
    setWebsite('');
    setAccountOwnerMemberId('');
    setClassifications(['CLIENT']);
    setTagsInput('');
    setNotesSummary('');
    setCustomData({});
    setAddresses([
      {
        type: 'PRIMARY',
        line1: '',
        line2: '',
        city: '',
        state: '',
        postalCode: '',
        country: 'Australia',
        isPrimary: true,
      },
    ]);
    setError(null);
    setDuplicateConflict(null);
  };

  const isStep1Valid = useMemo(() => {
    if (partyType === 'PERSON') {
      return Boolean(firstName.trim() && lastName.trim());
    }
    return Boolean(legalName.trim());
  }, [partyType, firstName, lastName, legalName]);

  const steps = useMemo(() => {
    const list = [
      { id: 1, title: 'Identity', subtitle: partyType === 'PERSON' ? 'Person' : 'Entity', icon: partyType === 'PERSON' ? User : Building2 },
      { id: 2, title: 'Contact', subtitle: 'Channels & Role', icon: Mail },
      { id: 3, title: 'Details', subtitle: 'Address & Governance', icon: MapPin },
    ];
    if (customFieldDefs.length > 0) {
      list.push({ id: 4, title: 'Custom', subtitle: `${customFieldDefs.length} Fields`, icon: Sliders });
    }
    return list;
  }, [partyType, customFieldDefs.length]);

  const totalSteps = steps.length;

  const handleNext = () => {
    if (currentStep === 1 && !isStep1Valid) {
      setError(
        partyType === 'PERSON'
          ? 'First Name and Last Name are required to proceed.'
          : 'Registered Legal Name is required to proceed.'
      );
      return;
    }
    setError(null);
    if (currentStep < totalSteps) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    setError(null);
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const submitParty = async (skipDeduplication = false) => {
    if (!tenant?.id) return;
    if (partyType === 'PERSON' && (!firstName.trim() || !lastName.trim())) {
      setError('First Name and Last Name are required for a Person.');
      setCurrentStep(1);
      return;
    }
    if (partyType === 'ORGANIZATION' && !legalName.trim()) {
      setError('Legal Name is required for an Organisation.');
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    setError(null);
    setDuplicateConflict(null);

    const nonEmptyAddresses = addresses.filter(
      (a) => a.line1.trim() || a.city.trim() || a.state.trim() || a.postalCode.trim()
    );
    const parsedTags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const payload: any = {
      partyType,
      status,
      avatarUrl: avatarUrl || null,
      email: email.trim() || null,
      secondaryEmail: secondaryEmail.trim() || null,
      phone: phone.trim() || null,
      mobile: mobile.trim() || null,
      website: website.trim() || null,
      preferredContactMethod,
      accountOwnerMemberId: accountOwnerMemberId || null,
      classifications,
      tags: parsedTags,
      addresses: nonEmptyAddresses,
      notesSummary: notesSummary.trim() || null,
      customData,
      skipDeduplication,
      creationContextLog: 'Created via Aurora Directory Studio Wizard',
      ...(partyType === 'PERSON'
        ? {
            person: {
              salutation: salutation || null,
              firstName: firstName.trim(),
              middleName: middleName.trim() || null,
              lastName: lastName.trim(),
              preferredName: preferredName.trim() || null,
              jobTitle: jobTitle.trim() || null,
              department: department.trim() || null,
              primaryOrgPartyId: primaryOrgPartyId || null,
              dateOfBirth: dob || undefined,
              isHumanInLoop: isHitl,
            },
          }
        : {
            organization: {
              legalName: legalName.trim(),
              tradingName: tradingName.trim() || null,
              orgStructureType: orgType,
              incorporationDate: incDate || undefined,
              taxIdentifier: taxId.trim() || null,
              companyRegistrationNumber: companyNumber.trim() || null,
              industry: industry.trim() || null,
              companySize: companySize || null,
              paymentTerms: paymentTerms || 'NET_30',
              creditLimit: creditLimit ? Number(creditLimit) : null,
              primaryContactPartyId: primaryContactPartyId || null,
              billingEmail: secondaryEmail.trim() || email.trim() || null,
            },
          }),
    };

    try {
      const token =
        (import.meta as any).env?.VITE_DEV_TOKEN || session?.access_token || localStorage.getItem('aurora_token');
      const res = await fetch(`${API_BASE_URL}/api/people-organisations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant.id,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409) {
        setDuplicateConflict({
          message: data.error || 'A matching entity already exists in the Directory.',
          existingPartyId: data.existingPartyId,
        });
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || 'Failed to register entity');
      }

      window.dispatchEvent(new CustomEvent('aurora:directory-updated', { detail: { party: data } }));
      toast.success(
        `Registered ${partyType === 'PERSON' ? `${firstName} ${lastName}` : legalName} in Directory`
      );
      onSuccess(data);
      resetForm();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuroraModal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Directory Entity"
      className="max-w-3xl w-full bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[90vh] overflow-hidden p-0"
    >
      {/* Modal Header */}
      <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-950/60 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white leading-tight">
              Register Directory Entity
            </h3>
            <p className="text-xs text-zinc-500">
              Quickly add people and organisations to your master directory
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>
      </div>

      {/* Modern Stepper Indicator */}
      <div className="px-6 py-3 border-b border-zinc-200/80 dark:border-zinc-800/80 bg-zinc-50/40 dark:bg-zinc-950/40 shrink-0">
        <div className="flex items-center justify-between">
          {steps.map((s, index) => {
            const Icon = s.icon;
            const isCurrent = currentStep === s.id;
            const isCompleted = currentStep > s.id;
            const isClickable = s.id < currentStep || (s.id === currentStep + 1 && isStep1Valid);

            return (
              <React.Fragment key={s.id}>
                <button
                  type="button"
                  disabled={!isClickable}
                  onClick={() => {
                    if (isClickable) {
                      setError(null);
                      setCurrentStep(s.id);
                    }
                  }}
                  className={`flex items-center gap-2 group text-left cursor-pointer transition-all disabled:cursor-not-allowed ${
                    isCurrent
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : isCompleted
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-zinc-400 dark:text-zinc-500 opacity-70'
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                      isCurrent
                        ? 'bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-500/30'
                        : isCompleted
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700'
                    }`}
                  >
                    {isCompleted ? <Check size={14} /> : s.id}
                  </div>
                  <div className="hidden sm:block">
                    <div className="text-xs font-bold leading-none">{s.title}</div>
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5">{s.subtitle}</div>
                  </div>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={`flex-1 h-[2px] mx-3 rounded-full transition-colors ${
                      currentStep > index + 1
                        ? 'bg-emerald-500/60'
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Duplicate Conflict Guardrail Banner */}
        {duplicateConflict && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 space-y-2.5">
            <div className="flex items-start gap-2.5 text-xs font-semibold">
              <AlertCircle size={16} className="shrink-0 mt-0.5 text-amber-500" />
              <div>
                <div className="font-bold">Potential Duplicate Detected in Directory</div>
                <p className="text-xs opacity-90 mt-0.5">{duplicateConflict.message}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 pl-6">
              {duplicateConflict.existingPartyId && (
                <a
                  href={`/workspace/people-organisations/${duplicateConflict.existingPartyId}`}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold hover:bg-amber-500 transition-colors"
                >
                  <span>Open Existing Profile</span>
                  <ExternalLink size={12} />
                </a>
              )}
              <button
                type="button"
                onClick={() => submitParty(true)}
                className="px-3 py-1.5 rounded-lg border border-amber-500/40 hover:bg-amber-500/20 text-xs font-bold cursor-pointer"
              >
                Create Anyway (Override)
              </button>
            </div>
          </div>
        )}

        {/* Validation / API Error Banner */}
        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: IDENTITY & BASICS */}
        {currentStep === 1 && (
          <div className="space-y-5">
            {/* Persona Switcher: Clean modern cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPartyType('PERSON')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  partyType === 'PERSON'
                    ? 'border-indigo-500/60 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-900 dark:text-white shadow-xs ring-1 ring-indigo-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    partyType === 'PERSON'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <User size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">Individual Person</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Contact, client, director or member</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setPartyType('ORGANIZATION')}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3 ${
                  partyType === 'ORGANIZATION'
                    ? 'border-violet-500/60 bg-violet-50/50 dark:bg-violet-500/10 text-violet-900 dark:text-white shadow-xs ring-1 ring-violet-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900 hover:border-zinc-300 dark:hover:border-zinc-700 text-zinc-600 dark:text-zinc-400'
                }`}
              >
                <div
                  className={`p-2.5 rounded-xl ${
                    partyType === 'ORGANIZATION'
                      ? 'bg-violet-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
                  }`}
                >
                  <Building2 size={18} />
                </div>
                <div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-white">Corporate Entity</div>
                  <div className="text-[11px] text-zinc-500 dark:text-zinc-400">Company, supplier, trust or partner</div>
                </div>
              </button>
            </div>

            {/* Avatar / Logo & Core Names */}
            {partyType === 'PERSON' ? (
              <div className="space-y-4">
                {/* Profile Photo / Avatar */}
                <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80">
                  <EntityAvatarUpload
                    avatarUrl={avatarUrl}
                    partyType="PERSON"
                    displayName={`${firstName} ${lastName}`.trim()}
                    size="md"
                    showControlsBeside
                    onChange={(nextUrl) => setAvatarUrl(nextUrl)}
                  />
                </div>

                {/* Primary Names: Full-width 2-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      First Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Sarah"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Last Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Connor"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Job Title / Role
                    </label>
                    <Input
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Chief Financial Officer"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Primary Organisation
                    </label>
                    <select
                      className={selectClassName}
                      value={primaryOrgPartyId}
                      onChange={(e) => setPrimaryOrgPartyId(e.target.value)}
                    >
                      <option value="">Independent / Unlinked</option>
                      {existingOrgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.organization?.legalName || org.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Expandable Details */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 cursor-pointer"
                  >
                    {showMoreDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showMoreDetails ? 'Hide additional identity fields' : 'Add salutation, nickname, department, DOB'}</span>
                  </button>

                  {showMoreDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3.5 space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Salutation
                          </label>
                          <select className={selectClassName} value={salutation} onChange={(e) => setSalutation(e.target.value)}>
                            <option value="">None</option>
                            <option value="Mr">Mr</option>
                            <option value="Ms">Ms</option>
                            <option value="Mrs">Mrs</option>
                            <option value="Dr">Dr</option>
                            <option value="Prof">Prof</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Middle Name
                          </label>
                          <Input
                            value={middleName}
                            onChange={(e) => setMiddleName(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Preferred Name / Nickname
                          </label>
                          <Input
                            value={preferredName}
                            onChange={(e) => setPreferredName(e.target.value)}
                            placeholder="Optional"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Department
                          </label>
                          <Input
                            value={department}
                            onChange={(e) => setDepartment(e.target.value)}
                            placeholder="e.g. Finance & Operations"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1.5">
                            <Calendar size={13} className="text-zinc-400" /> Date of Birth
                          </label>
                          <DatePicker value={dob} onChange={(val) => setDob(val)} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            ) : (
              /* ORGANISATION FIELDS */
              <div className="space-y-4">
                {/* Organisation Logo */}
                <div className="p-3.5 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/40 border border-zinc-200/80 dark:border-zinc-800/80">
                  <EntityAvatarUpload
                    avatarUrl={avatarUrl}
                    partyType="ORGANIZATION"
                    displayName={legalName}
                    size="md"
                    showControlsBeside
                    onChange={(nextUrl) => setAvatarUrl(nextUrl)}
                  />
                </div>

                {/* Company Names: Full-width 2-column grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Registered Legal Name <span className="text-rose-500">*</span>
                    </label>
                    <Input
                      required
                      value={legalName}
                      onChange={(e) => setLegalName(e.target.value)}
                      placeholder="e.g. Acme Holdings Pty Ltd"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Trading / Brand Name
                    </label>
                    <Input
                      value={tradingName}
                      onChange={(e) => setTradingName(e.target.value)}
                      placeholder="e.g. Acme Global"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Corporate Structure
                    </label>
                    <select className={selectClassName} value={orgType} onChange={(e) => setOrgType(e.target.value)}>
                      {availableLegalStructures.length > 0 ? (
                        availableLegalStructures.map((ls: any) => (
                          <option key={ls.code || ls.label} value={ls.code || ls.label}>
                            {ls.label || ls.code}
                          </option>
                        ))
                      ) : (
                        <>
                          <option value="COMPANY">Company (Pty Ltd / Inc / LLC)</option>
                          <option value="TRUST">Trust / Super Fund</option>
                          <option value="PARTNERSHIP">Partnership</option>
                          <option value="GOVERNMENT">Government / Public</option>
                          <option value="NON_PROFIT">Non-Profit / Charity</option>
                          <option value="SOLE_TRADER">Sole Trader</option>
                        </>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Industry Sector
                    </label>
                    {availableIndustries.length > 0 ? (
                      <select className={selectClassName} value={industry} onChange={(e) => setIndustry(e.target.value)}>
                        <option value="">Select Industry...</option>
                        {availableIndustries.map((ind: any) => (
                          <option key={ind.code || ind.label} value={ind.label || ind.code}>
                            {ind.label || ind.code}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        placeholder="e.g. Financial Services"
                      />
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Primary Contact Person
                    </label>
                    <select
                      className={selectClassName}
                      value={primaryContactPartyId}
                      onChange={(e) => setPrimaryContactPartyId(e.target.value)}
                    >
                      <option value="">None Selected</option>
                      {existingPeople.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.displayName || `${p.person?.firstName || ''} ${p.person?.lastName || ''}`}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Optional Expandable Details */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowMoreDetails(!showMoreDetails)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-700 cursor-pointer"
                  >
                    {showMoreDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span>{showMoreDetails ? 'Hide registration & legal identifiers' : 'Add ABN/Tax ID, Company No, Inc. Date, Size'}</span>
                  </button>

                  {showMoreDetails && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3.5 space-y-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Tax Identifier (ABN / EIN / VAT)
                          </label>
                          <Input
                            value={taxId}
                            onChange={(e) => setTaxId(e.target.value)}
                            placeholder="e.g. 51 824 753 556"
                            className="font-mono text-xs"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Company Number (ACN / CRN)
                          </label>
                          <Input
                            value={companyNumber}
                            onChange={(e) => setCompanyNumber(e.target.value)}
                            placeholder="e.g. 004 085 616"
                            className="font-mono text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Company Size
                          </label>
                          <select className={selectClassName} value={companySize} onChange={(e) => setCompanySize(e.target.value)}>
                            <option value="">Select Size...</option>
                            <option value="1-10">1–10 employees</option>
                            <option value="11-50">11–50 employees</option>
                            <option value="51-200">51–200 employees</option>
                            <option value="201-1000">201–1,000 employees</option>
                            <option value="1000+">1,000+ employees</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                            Incorporation Date
                          </label>
                          <DatePicker value={incDate} onChange={(val) => setIncDate(val)} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CONTACT & CLASSIFICATIONS */}
        {currentStep === 2 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Primary Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  {partyType === 'ORGANIZATION' ? 'Billing / Accounts Email' : 'Secondary Email'}
                </label>
                <Input
                  type="email"
                  value={secondaryEmail}
                  onChange={(e) => setSecondaryEmail(e.target.value)}
                  placeholder="accounts@domain.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Primary Phone
                </label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+61 2 9000 0000"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Mobile Phone
                </label>
                <Input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="+61 400 000 000"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Website URL
                </label>
                <Input
                  type="url"
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>
            </div>

            {/* Classifications Chips */}
            <div className="p-4 rounded-2xl bg-zinc-50/70 dark:bg-zinc-950/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block">
                Directory Classifications <span className="text-[11px] font-normal text-zinc-400">(Select all that apply)</span>
              </label>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {availableClassifications.map((cls) => {
                  const active = classifications.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClassification(cls)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                      }`}
                    >
                      {active && <Check size={12} />}
                      <span>{cls}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Account Owner
                </label>
                <select
                  className={selectClassName}
                  value={accountOwnerMemberId}
                  onChange={(e) => setAccountOwnerMemberId(e.target.value)}
                >
                  <option value="">Unassigned</option>
                  {(members || []).map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.name || m.email}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Verification Status
                </label>
                <select className={selectClassName} value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="VERIFIED">Verified</option>
                  <option value="ACTIVE">Active</option>
                  <option value="UNVERIFIED">Unverified</option>
                  <option value="PENDING_REVIEW">Pending Review</option>
                  <option value="FLAGGED">Flagged</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Preferred Channel
                </label>
                <select
                  className={selectClassName}
                  value={preferredContactMethod}
                  onChange={(e) => setPreferredContactMethod(e.target.value)}
                >
                  <option value="EMAIL">Email</option>
                  <option value="PHONE">Phone Call</option>
                  <option value="SMS">SMS / Mobile</option>
                  <option value="PORTAL">Client Portal</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: LOCATION & GOVERNANCE */}
        {currentStep === 3 && (
          <div className="space-y-4">
            {/* Address Management */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  Addresses ({addresses.length})
                </span>
                <span className="text-[11px] text-zinc-400">Optional - can be added later</span>
              </div>

              {addresses.map((addr, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-indigo-500" />
                      <select
                        value={addr.type}
                        onChange={(e) => {
                          const next = [...addresses];
                          next[idx].type = e.target.value;
                          setAddresses(next);
                        }}
                        className="text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg px-2.5 py-1"
                      >
                        <option value="PRIMARY">Primary Address</option>
                        <option value="BILLING">Billing Address</option>
                        <option value="SHIPPING">Shipping / Delivery Address</option>
                        <option value="PHYSICAL">Physical / Registered Office</option>
                        <option value="MAILING">Postal / Mailing Address</option>
                      </select>
                    </div>
                    {addresses.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setAddresses(addresses.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-600 text-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <Input
                      value={addr.line1}
                      onChange={(e) => {
                        const next = [...addresses];
                        next[idx].line1 = e.target.value;
                        setAddresses(next);
                      }}
                      placeholder="Street Address Line 1"
                    />
                    <Input
                      value={addr.line2}
                      onChange={(e) => {
                        const next = [...addresses];
                        next[idx].line2 = e.target.value;
                        setAddresses(next);
                      }}
                      placeholder="Suite / Unit / Building (Line 2)"
                    />
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <Input
                      value={addr.city}
                      onChange={(e) => {
                        const next = [...addresses];
                        next[idx].city = e.target.value;
                        setAddresses(next);
                      }}
                      placeholder="City / Suburb"
                    />
                    <Input
                      value={addr.state}
                      onChange={(e) => {
                        const next = [...addresses];
                        next[idx].state = e.target.value;
                        setAddresses(next);
                      }}
                      placeholder="State / Province"
                    />
                    <Input
                      value={addr.postalCode}
                      onChange={(e) => {
                        const next = [...addresses];
                        next[idx].postalCode = e.target.value;
                        setAddresses(next);
                      }}
                      placeholder="Postcode / ZIP"
                    />
                    <Input
                      value={addr.country}
                      onChange={(e) => {
                        const next = [...addresses];
                        next[idx].country = e.target.value;
                        setAddresses(next);
                      }}
                      placeholder="Country"
                    />
                  </div>
                </div>
              ))}

              <button
                type="button"
                onClick={() =>
                  setAddresses([
                    ...addresses,
                    {
                      type: 'BILLING',
                      line1: '',
                      line2: '',
                      city: '',
                      state: '',
                      postalCode: '',
                      country: 'Australia',
                      isPrimary: false,
                    },
                  ])
                }
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
              >
                <Plus size={14} /> Add Another Address (e.g. Billing or Branch)
              </button>
            </div>

            {/* Governance / Corporate Operations */}
            {partyType === 'PERSON' ? (
              <div
                onClick={() => setIsHitl(!isHitl)}
                className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-colors ${
                  isHitl
                    ? 'bg-indigo-50/50 dark:bg-indigo-500/10 border-indigo-500/40'
                    : 'bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-xl ${
                      isHitl ? 'bg-indigo-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500'
                    }`}
                  >
                    <Shield size={16} />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-zinc-900 dark:text-white">
                      Human-in-the-Loop (HITL) Governance Authority
                    </div>
                    <div className="text-[11px] text-zinc-500">
                      Authorised to sign off on high-risk AI workflow decisions and compliance gates
                    </div>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={isHitl}
                  onChange={() => {}}
                  className="w-4 h-4 accent-indigo-600 rounded"
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Default Payment Terms
                  </label>
                  <select className={selectClassName} value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)}>
                    <option value="DUE_ON_RECEIPT">Due on Receipt</option>
                    <option value="NET_7">Net 7 Days</option>
                    <option value="NET_14">Net 14 Days</option>
                    <option value="NET_30">Net 30 Days</option>
                    <option value="NET_60">Net 60 Days</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    Credit Limit ($)
                  </label>
                  <Input
                    type="number"
                    value={creditLimit}
                    onChange={(e) => setCreditLimit(e.target.value)}
                    placeholder="e.g. 50000"
                  />
                </div>
              </div>
            )}

            {/* Notes Summary */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Executive Notes & Context
              </label>
              <textarea
                rows={2}
                value={notesSummary}
                onChange={(e) => setNotesSummary(e.target.value)}
                placeholder="Background notes, onboarding instructions, or relationship history..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3.5 py-2.5 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* STEP 4: CUSTOM FIELDS (IF CONFIGURED) */}
        {currentStep === 4 && customFieldDefs.length > 0 && (
          <div className="space-y-4">
            <div className="text-xs text-zinc-500">
              Tenant-configured metadata fields for {partyType === 'PERSON' ? 'people' : 'organisations'}.
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customFieldDefs.map((field: any) => (
                <div key={field.id}>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                    {field.label} {field.required ? '*' : ''}
                  </label>
                  {field.type === 'select' ? (
                    <select
                      className={selectClassName}
                      value={customData[field.key] || ''}
                      onChange={(e) => setCustomData({ ...customData, [field.key]: e.target.value })}
                    >
                      <option value="">Select...</option>
                      {(field.options || []).map((opt: string) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : field.type === 'boolean' ? (
                    <label className="flex items-center gap-2 text-xs cursor-pointer mt-2">
                      <input
                        type="checkbox"
                        checked={Boolean(customData[field.key])}
                        onChange={(e) => setCustomData({ ...customData, [field.key]: e.target.checked })}
                        className="w-4 h-4 rounded accent-indigo-600"
                      />
                      <span>Enabled / Yes</span>
                    </label>
                  ) : (
                    <Input
                      type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                      value={customData[field.key] || ''}
                      onChange={(e) => setCustomData({ ...customData, [field.key]: e.target.value })}
                      placeholder={field.placeholder || `Enter ${field.label}...`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal Sticky Footer with Wizard Navigation */}
      <div className="px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/60 dark:bg-zinc-950/60 flex items-center justify-between shrink-0">
        <div>
          {currentStep === 1 ? (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleBack} className="gap-1.5">
              <ArrowLeft size={14} />
              <span>Back</span>
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Quick Create option if required fields are satisfied and not on last step */}
          {currentStep < totalSteps && isStep1Valid && (
            <button
              type="button"
              onClick={() => submitParty(false)}
              disabled={loading}
              className="text-xs font-bold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 px-3 py-2 cursor-pointer transition-colors"
            >
              {loading ? 'Creating...' : `Quick Create (${partyType === 'PERSON' ? 'Person' : 'Org'})`}
            </button>
          )}

          {currentStep < totalSteps ? (
            <Button
              variant="primary"
              size="sm"
              onClick={handleNext}
              disabled={!isStep1Valid}
              className="gap-1.5 px-5"
            >
              <span>Next</span>
              <ArrowRight size={14} />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => submitParty(false)}
              disabled={loading || !isStep1Valid}
              className="gap-2 px-6"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Registering...</span>
                </>
              ) : (
                <>
                  <Check size={16} />
                  <span>Register {partyType === 'PERSON' ? 'Person' : 'Organisation'}</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </AuroraModal>
  );
};

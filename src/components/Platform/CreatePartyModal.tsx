import React, { useState, useEffect, useMemo } from 'react';
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
  'w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500';

interface CreatePartyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (createdParty?: any) => void;
  initialPartyType?: 'PERSON' | 'ORGANIZATION';
  initialName?: string;
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
}) => {
  const { session } = useAuth();
  const { tenant, members } = usePlatform();

  const [partyType, setPartyType] = useState<'PERSON' | 'ORGANIZATION'>(initialPartyType);
  const [activeSection, setActiveSection] = useState<'identity' | 'contact' | 'address' | 'custom'>('identity');
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
      setPartyType(initialPartyType);
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
    setActiveSection('identity');
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

  const submitParty = async (skipDeduplication = false) => {
    if (!tenant?.id) return;
    if (partyType === 'PERSON' && (!firstName.trim() || !lastName.trim())) {
      setError('First Name and Last Name are required for a Person.');
      setActiveSection('identity');
      return;
    }
    if (partyType === 'ORGANIZATION' && !legalName.trim()) {
      setError('Legal Name is required for an Organisation.');
      setActiveSection('identity');
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
      creationContextLog: 'Created via Aurora Directory Studio',
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
      className="max-w-3xl w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 shadow-2xl border border-zinc-200 dark:border-zinc-800 max-h-[90vh] overflow-y-auto"
    >
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                Register Directory Entity
              </h3>
              <p className="text-xs text-zinc-500">
                Master People & Corporate Entity Registry
              </p>
            </div>
          </div>
        </div>
        {/* Persona Type Switcher */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-zinc-100 dark:bg-zinc-950 rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => setPartyType('PERSON')}
            className={`flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              partyType === 'PERSON'
                ? 'bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-sm border border-zinc-200/60 dark:border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <User size={16} />
            <span>Individual Person (Contact / Client / Director)</span>
          </button>
          <button
            type="button"
            onClick={() => setPartyType('ORGANIZATION')}
            className={`flex items-center justify-center gap-2.5 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              partyType === 'ORGANIZATION'
                ? 'bg-white dark:bg-zinc-900 text-violet-600 dark:text-violet-400 shadow-sm border border-zinc-200/60 dark:border-zinc-800'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Building2 size={16} />
            <span>Corporate Entity (Organisation / Supplier / Trust)</span>
          </button>
        </div>

        {/* Section Tabs */}
        <div className="flex items-center gap-1 border-b border-zinc-200 dark:border-zinc-800 text-xs font-bold">
          {[
            { id: 'identity', label: '1. Identity & Role', icon: partyType === 'PERSON' ? User : Building2 },
            { id: 'contact', label: '2. Contact & Classifications', icon: Mail },
            { id: 'address', label: `3. Addresses (${addresses.length})`, icon: MapPin },
            ...(customFieldDefs.length > 0
              ? [{ id: 'custom', label: `4. Custom Fields (${customFieldDefs.length})`, icon: Sliders }]
              : []),
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSection(tab.id as any)}
                className={`flex items-center gap-1.5 px-3.5 py-2.5 border-b-2 transition-colors cursor-pointer ${
                  activeSection === tab.id
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                }`}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

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

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-2.5 text-rose-600 dark:text-rose-400 text-xs font-semibold">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* SECTION 1: IDENTITY & ROLE */}
        {activeSection === 'identity' && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-950/60 border border-zinc-200/70 dark:border-zinc-800/70">
              <EntityAvatarUpload
                avatarUrl={avatarUrl}
                partyType={partyType}
                displayName={
                  partyType === 'PERSON' ? `${firstName} ${lastName}`.trim() : legalName
                }
                size="md"
                showControlsBeside
                onChange={(nextUrl) => setAvatarUrl(nextUrl)}
              />
            </div>

            {partyType === 'PERSON' ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      First Name *
                    </label>
                    <Input
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="e.g. Sarah"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Middle Name
                    </label>
                    <Input
                      value={middleName}
                      onChange={(e) => setMiddleName(e.target.value)}
                      placeholder="Optional"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Last Name *
                    </label>
                    <Input
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="e.g. Connor"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                      Department
                    </label>
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Finance & Legal"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Primary Organisation
                    </label>
                    <select className={selectClassName} value={primaryOrgPartyId} onChange={(e) => setPrimaryOrgPartyId(e.target.value)}>
                      <option value="">Independent / Unlinked</option>
                      {existingOrgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.organization?.legalName || org.displayName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1.5">
                      <Calendar size={13} className="text-zinc-400" /> Date of Birth
                    </label>
                    <DatePicker value={dob} onChange={(val) => setDob(val)} />
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

                <div
                  onClick={() => setIsHitl(!isHitl)}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between cursor-pointer hover:border-indigo-500/40 transition-colors"
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
              </>
            ) : (
              /* ORGANIZATION FIELDS */
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Registered Legal Name *
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
                      <option value="Corporate">Corporate (Pty Ltd / Inc / LLC)</option>
                      <option value="Trust">Trust / Superannuation Fund</option>
                      <option value="Partnership">Partnership</option>
                      <option value="Government">Government / Public Sector</option>
                      <option value="Non-Profit">Non-Profit / Charity</option>
                      <option value="Sole Trader">Sole Trader</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Tax Identifier (ABN / EIN / VAT)
                    </label>
                    <Input
                      value={taxId}
                      onChange={(e) => setTaxId(e.target.value)}
                      placeholder="e.g. 51 824 753 556"
                      className="font-mono"
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
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Industry Sector
                    </label>
                    <Input
                      value={industry}
                      onChange={(e) => setIndustry(e.target.value)}
                      placeholder="e.g. Financial Services, Construction"
                    />
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
                  <div>
                    <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                      Incorporation Date
                    </label>
                    <DatePicker value={incDate} onChange={(val) => setIncDate(val)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                </div>
              </>
            )}
          </div>
        )}

        {/* SECTION 2: CONTACT & CLASSIFICATIONS */}
        {activeSection === 'contact' && (
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
                  placeholder="contact@domain.com"
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

            {/* Classifications Multi-Select */}
            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Directory Classifications (Select all that apply)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {DEFAULT_CLASSIFICATIONS.map((cls) => {
                  const active = classifications.includes(cls);
                  return (
                    <button
                      key={cls}
                      type="button"
                      onClick={() => toggleClassification(cls)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                        active
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                          : 'bg-zinc-50 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300'
                      }`}
                    >
                      {cls}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                  Internal Account Owner
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

            <div>
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1.5">
                Executive Summary / Notes
              </label>
              <textarea
                rows={2}
                value={notesSummary}
                onChange={(e) => setNotesSummary(e.target.value)}
                placeholder="Background context, key relationship notes, or onboarding instructions..."
                className="w-full rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 px-3 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        )}

        {/* SECTION 3: ADDRESSES */}
        {activeSection === 'address' && (
          <div className="space-y-3">
            {addresses.map((addr, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 space-y-3"
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
              <Plus size={14} /> Add Another Address (e.g. Billing / Shipping)
            </button>
          </div>
        )}

        {/* SECTION 4: CUSTOM METADATA FIELDS */}
        {activeSection === 'custom' && (
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
        )}

        <div className="flex items-center justify-between w-full pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="text-xs text-zinc-400">
            All fields sync automatically across Modules, Inbox, Service Desk & Finance.
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => submitParty(false)}
              disabled={
                loading ||
                (partyType === 'PERSON' ? !firstName.trim() || !lastName.trim() : !legalName.trim())
              }
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
          </div>
        </div>
      </div>
    </AuroraModal>
  );
};

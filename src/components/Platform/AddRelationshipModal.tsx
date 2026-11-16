import React, { useState, useEffect } from 'react';
import {
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  User,
  Building2,
  Search,
  Star,
  Briefcase,
  Percent,
  Calendar,
  FileText,
} from 'lucide-react';
import { Modal } from '../UI/TabsAndModal';
import { Button, Input, Select } from '../UI/Primitives';
import { usePlatform } from '../../hooks/usePlatform';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../config';
import { toast } from 'sonner';

interface AddRelationshipModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourcePartyId: string;
  editingRelationship?: any | null;
}

const DEFAULT_REL_TYPES = [
  { label: 'Employee', value: 'EMPLOYEE' },
  { label: 'Director / Executive', value: 'DIRECTOR' },
  { label: 'Beneficial Owner / Shareholder', value: 'OWNER' },
  { label: 'Subsidiary', value: 'SUBSIDIARY' },
  { label: 'Parent Company', value: 'PARENT_COMPANY' },
  { label: 'Primary Contact', value: 'PRIMARY_CONTACT' },
  { label: 'Billing Contact', value: 'BILLING_CONTACT' },
  { label: 'Partner / Alliance', value: 'PARTNER' },
  { label: 'Contractor / Consultant', value: 'CONTRACTOR' },
  { label: 'Advisor / Legal Counsel', value: 'ADVISOR' },
  { label: 'Supplier / Vendor', value: 'SUPPLIER' },
  { label: 'Client / Customer', value: 'CLIENT' },
];

export const AddRelationshipModal = ({
  isOpen,
  onClose,
  onSuccess,
  sourcePartyId,
  editingRelationship = null,
}: AddRelationshipModalProps) => {
  const { tenant } = usePlatform();
  const { session } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parties, setParties] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [formData, setFormData] = useState({
    targetPartyId: '',
    relationshipType: 'EMPLOYEE',
    roleTitle: '',
    department: '',
    isPrimary: false,
    ownershipPercentage: '' as string | number,
    validFrom: new Date().toISOString().split('T')[0],
    validTo: '',
    notes: '',
  });

  const [relTypes, setRelTypes] = useState<{ label: string; value: string }[]>(DEFAULT_REL_TYPES);

  useEffect(() => {
    if (isOpen) {
      fetchParties();
      fetchRelTypes();
      if (editingRelationship) {
        const otherId =
          editingRelationship.sourcePartyId === sourcePartyId
            ? editingRelationship.targetPartyId
            : editingRelationship.sourcePartyId;
        setFormData({
          targetPartyId: otherId || '',
          relationshipType: editingRelationship.relationshipType || 'EMPLOYEE',
          roleTitle: editingRelationship.roleTitle || '',
          department: editingRelationship.department || '',
          isPrimary: Boolean(editingRelationship.isPrimary),
          ownershipPercentage:
            editingRelationship.ownershipPercentage !== null &&
            editingRelationship.ownershipPercentage !== undefined
              ? editingRelationship.ownershipPercentage
              : '',
          validFrom: editingRelationship.validFrom
            ? new Date(editingRelationship.validFrom).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          validTo: editingRelationship.validTo
            ? new Date(editingRelationship.validTo).toISOString().split('T')[0]
            : '',
          notes: editingRelationship.notes || '',
        });
      } else {
        setFormData({
          targetPartyId: '',
          relationshipType: 'EMPLOYEE',
          roleTitle: '',
          department: '',
          isPrimary: false,
          ownershipPercentage: '',
          validFrom: new Date().toISOString().split('T')[0],
          validTo: '',
          notes: '',
        });
      }
      setError(null);
    }
  }, [isOpen, editingRelationship, sourcePartyId]);

  const fetchRelTypes = async () => {
    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/taxonomies?category=RELATIONSHIP_TYPE`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '',
        },
      });
      const data = await res.json();
      if (res.ok && Array.isArray(data) && data.length > 0) {
        const customTypes = data.map((t: any) => ({ label: t.name, value: t.slug }));
        const mergedMap = new Map<string, { label: string; value: string }>();
        DEFAULT_REL_TYPES.forEach((t) => mergedMap.set(t.value, t));
        customTypes.forEach((t) => mergedMap.set(t.value, t));
        setRelTypes(Array.from(mergedMap.values()));
      } else {
        setRelTypes(DEFAULT_REL_TYPES);
      }
    } catch (err) {
      console.error('Failed to fetch rel types:', err);
    }
  };

  const fetchParties = async () => {
    try {
      setIsSearching(true);
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const res = await fetch(`${API_BASE_URL}/api/people-organisations?limit=300`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '',
        },
      });
      const data = await res.json();
      if (res.ok) {
        const list = Array.isArray(data) ? data : data.parties || [];
        setParties(list.filter((p: any) => p.id !== sourcePartyId));
      }
    } catch (err) {
      console.error('Failed to fetch parties:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRelationship && !formData.targetPartyId) {
      setError('Please select a target entity to connect.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const token = (import.meta as any).env.VITE_DEV_TOKEN || session?.access_token;
      const isEdit = Boolean(editingRelationship?.id);
      const url = isEdit
        ? `${API_BASE_URL}/api/people-organisations/${sourcePartyId}/relationships/${editingRelationship.id}`
        : `${API_BASE_URL}/api/people-organisations/${sourcePartyId}/relationships`;

      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-tenant-id': tenant?.id || '',
        },
        body: JSON.stringify({
          targetPartyId: formData.targetPartyId,
          relationshipType: formData.relationshipType,
          roleTitle: formData.roleTitle || null,
          department: formData.department || null,
          isPrimary: formData.isPrimary,
          ownershipPercentage:
            formData.ownershipPercentage !== '' && formData.ownershipPercentage !== null
              ? Number(formData.ownershipPercentage)
              : null,
          validFrom: formData.validFrom || null,
          validTo: formData.validTo || null,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save relationship');
      }

      toast.success(isEdit ? 'Relationship updated' : 'Relationship added successfully');
      window.dispatchEvent(new CustomEvent('aurora:directory-updated'));
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredParties = parties.filter((p) => {
    const name =
      p.displayName ||
      (p.partyType === 'PERSON'
        ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
        : p.organization?.legalName || '');
    const email = p.email || '';
    const code = p.partyCode || '';
    const q = searchQuery.toLowerCase();
    return (
      name.toLowerCase().includes(q) ||
      email.toLowerCase().includes(q) ||
      code.toLowerCase().includes(q)
    );
  });

  const showOwnership =
    formData.relationshipType === 'OWNER' ||
    formData.relationshipType === 'SUBSIDIARY' ||
    formData.relationshipType === 'PARENT_COMPANY' ||
    formData.relationshipType === 'PARTNER' ||
    Number(formData.ownershipPercentage) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editingRelationship ? 'Edit Entity Relationship' : 'Connect Directory Entity'}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5 py-2">
        {!editingRelationship && (
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Select Related Entity
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={15} />
              <input
                type="text"
                placeholder="Search by name, email, or party code..."
                className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="max-h-44 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/60 divide-y divide-zinc-100 dark:divide-zinc-800/60">
              {isSearching ? (
                <div className="p-4 text-center text-xs text-zinc-500">Loading directory entities...</div>
              ) : filteredParties.length === 0 ? (
                <div className="p-4 text-center text-xs text-zinc-500">No matching entities found</div>
              ) : (
                filteredParties.map((p) => {
                  const name =
                    p.displayName ||
                    (p.partyType === 'PERSON'
                      ? `${p.person?.firstName || ''} ${p.person?.lastName || ''}`.trim()
                      : p.organization?.legalName || 'Unnamed');
                  const sub =
                    p.partyType === 'PERSON'
                      ? p.person?.jobTitle || p.email || 'Individual'
                      : p.organization?.industry || p.organization?.orgStructureType || 'Organisation';
                  const isSelected = formData.targetPartyId === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, targetPartyId: p.id })}
                      className={`w-full flex items-center gap-3 p-2.5 text-left transition-colors ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-500/15'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'
                      }`}
                    >
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center border shrink-0 ${
                          p.partyType === 'PERSON'
                            ? 'bg-amber-500/10 border-amber-500/20 text-amber-600'
                            : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-600'
                        }`}
                      >
                        {p.partyType === 'PERSON' ? <User size={14} /> : <Building2 size={14} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {name}
                          </p>
                          {p.partyCode && (
                            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                              {p.partyCode}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-zinc-500 truncate">{sub}</p>
                      </div>
                      {isSelected && <CheckCircle2 size={16} className="ml-auto text-indigo-500 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Relationship Type"
            value={formData.relationshipType}
            onChange={(e) => setFormData({ ...formData, relationshipType: e.target.value })}
            options={relTypes}
          />
          <Input
            label="Specific Role / Title"
            placeholder="e.g. Chief Financial Officer, Account Lead"
            icon={<Briefcase size={14} />}
            value={formData.roleTitle}
            onChange={(e) => setFormData({ ...formData, roleTitle: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Department / Division"
            placeholder="e.g. Executive Board, Finance, Legal"
            value={formData.department}
            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
          />
          {showOwnership ? (
            <Input
              label="Ownership / Equity Share (%)"
              type="number"
              min="0"
              max="100"
              step="0.01"
              placeholder="e.g. 25.5"
              icon={<Percent size={14} />}
              value={formData.ownershipPercentage}
              onChange={(e) => setFormData({ ...formData, ownershipPercentage: e.target.value })}
            />
          ) : (
            <div className="flex items-end pb-1">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, ownershipPercentage: 25 })}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
              >
                <Percent size={13} />
                + Specify Equity / Ownership Percentage
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Effective From"
            type="date"
            icon={<Calendar size={14} />}
            value={formData.validFrom}
            onChange={(e) => setFormData({ ...formData, validFrom: e.target.value })}
          />
          <Input
            label="Effective Until (Optional)"
            type="date"
            icon={<Calendar size={14} />}
            value={formData.validTo}
            onChange={(e) => setFormData({ ...formData, validTo: e.target.value })}
          />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-2.5">
            <Star size={16} className={formData.isPrimary ? 'text-amber-500 fill-amber-500' : 'text-zinc-400'} />
            <div>
              <p className="text-xs font-bold text-zinc-900 dark:text-white">
                Primary Relationship / Key Contact
              </p>
              <p className="text-[10px] text-zinc-500">
                Marks this entity as the primary organisation or primary point of contact on hover cards.
              </p>
            </div>
          </div>
          <input
            type="checkbox"
            checked={formData.isPrimary}
            onChange={(e) => setFormData({ ...formData, isPrimary: e.target.checked })}
            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 flex items-center gap-1.5">
            <FileText size={12} /> Relationship Notes
          </label>
          <textarea
            rows={2}
            placeholder="Optional context (e.g. signatory authority, board voting rights, escalation scope)..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-3 text-xs text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>

        {error && (
          <div className="flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl">
            <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={16} />
            <p className="text-xs text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-zinc-100 dark:border-zinc-800">
          <Button variant="ghost" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={loading} className="gap-2">
            {editingRelationship ? 'Save Relationship' : 'Connect Entities'}
            <ArrowRight size={15} />
          </Button>
        </div>
      </form>
    </Modal>
  );
};

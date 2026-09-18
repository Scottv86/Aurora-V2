import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { 
  Palette, 
  Plus, 
  Search, 
  Trash2, 
  RefreshCw, 
  ArrowRight, 
  Star, 
  Globe
} from 'lucide-react';
import { PageHeader } from '../../components/UI/PageHeader';
import { Button } from '../../components/UI/Primitives';
import { EmptyState } from '../../components/UI/EmptyState';
import { LicenseGate, LicenseRestrictedPlaceholder } from '../../components/Auth/LicenseGate';
import { useBrandKits } from '../../hooks/useBrandKits';
import { BrandKit } from '../../services/brandKitService';
import { DeleteConfirmationModal } from '../../components/Common/DeleteConfirmationModal';
import { TrashService } from '../../services/trashService';
import { usePlatform } from '../../hooks/usePlatform';
import { toast } from 'sonner';

import { NewBrandModal } from '../../components/Modals/NewBrandModal';

export const BrandBuilderPage: React.FC = () => {
  const navigate = useNavigate();
  const { tenant } = usePlatform();
  const { 
    brandKits, 
    loading, 
    refetch, 
    deleteBrandKit
  } = useBrandKits();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Delete State
  const [brandToDelete, setBrandToDelete] = useState<BrandKit | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleOpenStudio = (brandId: string) => {
    navigate(`/workspace/settings/builder/brand/${brandId}`);
  };

  const handleDeleteClick = (e: React.MouseEvent, brand: BrandKit) => {
    e.stopPropagation();
    setBrandToDelete(brand);
  };

  const confirmDeleteBrand = async () => {
    if (!brandToDelete) return;
    const b = brandToDelete;
    setIsDeleting(true);
    try {
      if (tenant?.id) {
        await TrashService.softDelete({
          tenantId: tenant.id,
          itemType: 'BRAND_KIT',
          itemId: b.id,
          title: b.name,
          subtitle: b.description || `Brand Profile (${b.slug})`,
          payload: b
        });
      }
      await deleteBrandKit(b.id);
      toast.success(`Brand Profile "${b.name}" moved to Recycling Bin.`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete brand profile.');
    } finally {
      setIsDeleting(false);
      setBrandToDelete(null);
    }
  };

  // Filtering
  const filteredBrands = brandKits.filter(brand => {
    const matchesCategory = 
      activeTab === 'all' ||
      (activeTab === 'default' && brand.isDefault) ||
      (activeTab === 'custom' && !brand.isDefault);

    const matchesSearch = 
      searchQuery === '' ||
      brand.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (brand.description && brand.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      brand.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'default' && brand.isDefault) ||
      (statusFilter === 'secondary' && !brand.isDefault);

    return matchesCategory && matchesSearch && matchesStatus;
  });

  return (
    <LicenseGate fallback={<div className="p-10"><LicenseRestrictedPlaceholder /></div>}>
      <div className="flex flex-col w-full relative min-h-[calc(100vh-4rem)] bg-zinc-50/50 dark:bg-zinc-950/50">
        {/* Standard Page Header matching Sites / Modules / Forms */}
        <PageHeader 
          title="Brands"
          description="Build, customize, and manage tenant-wide brand profiles, design tokens, typography, letterheads, and AI voice guidelines."
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={refetch}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl transition-all cursor-pointer"
                title="Refresh Brand Profiles"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              </button>
              <Button
                onClick={() => setIsNewModalOpen(true)}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Create</span>
              </Button>
            </div>
          }
        />

        <div className="flex-1 px-6 lg:px-12 pt-8 pb-20 relative z-10 space-y-6">
          {/* Search & Filter Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400 dark:text-zinc-500" />
              <input
                type="text"
                placeholder="Search brand profiles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-zinc-900 dark:text-zinc-100 font-medium"
              />
            </div>

            <div className="flex items-center gap-3 overflow-x-auto no-scrollbar">
              {/* Category Pills */}
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-xl">
                {[
                  { id: 'all', label: 'All Brands' },
                  { id: 'default', label: 'Default' },
                  { id: 'custom', label: 'Custom' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg capitalize transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm'
                        : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/60 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-900 dark:text-white focus:outline-none cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="default">Default Brand</option>
                <option value="secondary">Secondary Profiles</option>
              </select>
            </div>
          </div>

          {/* Standard Glassmorphic 3-Column Grid matching SitesPage */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-64 rounded-3xl bg-zinc-100 dark:bg-zinc-900 animate-pulse border border-zinc-200 dark:border-zinc-800" />
              ))}
            </div>
          ) : filteredBrands.length === 0 ? (
            <EmptyState
              icon={Palette}
              title="No brand profiles created"
              description="Build, manage, and extend tenant-wide brand profiles, design tokens, typography, and AI voice guidelines."
              action={{
                label: "Create Brand Profile",
                onClick: () => setIsNewModalOpen(true)
              }}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBrands.map((brand, i) => {
                const colors = brand.colors || {
                  primary: '#4f46e5',
                  secondary: '#0ea5e9',
                  accent: '#6366f1',
                  chartPalette: ['#4f46e5', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6']
                };
                const assets = brand.assets || {};
                const connectedSitesCount = brand._count?.sites || brand.sites?.length || 0;

                return (
                  <motion.div
                    key={brand.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: i * 0.03, ease: 'easeOut' }}
                    onClick={() => handleOpenStudio(brand.id)}
                    className="group p-6 bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl border border-white/20 dark:border-white/5 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,box-shadow,background-color] duration-200 shadow-xl shadow-black/5 dark:shadow-none hover:shadow-indigo-500/10 cursor-pointer flex flex-col h-full relative overflow-hidden min-h-[240px]"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.1] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                    {brandKits.length > 1 && (
                      <button
                        onClick={(e) => handleDeleteClick(e, brand)}
                        className="absolute top-4 right-4 p-2 rounded-xl bg-zinc-100/80 hover:bg-red-500/10 text-zinc-500 hover:text-red-500 dark:bg-zinc-800/80 dark:hover:bg-red-500/20 transition-colors duration-150 opacity-0 group-hover:opacity-100 z-20"
                        title="Delete Brand Profile"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}

                    <div className="relative z-10 flex flex-col h-full justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-4">
                          <div className="p-3 rounded-2xl bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10 text-zinc-500 group-hover:text-indigo-500 group-hover:border-indigo-500/30 transition-colors duration-200">
                            {assets.logoLight || assets.logoDark ? (
                              <img src={assets.logoLight || assets.logoDark} alt={brand.name} className="w-5.5 h-5.5 object-contain" />
                            ) : (
                              <Palette size={22} />
                            )}
                          </div>
                          <div className={`flex items-center gap-2 ${brandKits.length > 1 ? 'pr-8' : ''}`}>
                            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border ${
                              brand.isDefault
                                ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 flex items-center gap-1'
                                : 'bg-zinc-100 dark:bg-white/5 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-white/10'
                            }`}>
                              {brand.isDefault && <Star size={10} className="fill-current" />}
                              {brand.isDefault ? 'Default' : 'Secondary'}
                            </span>
                          </div>
                        </div>

                        <h3 className="text-base font-bold text-zinc-900 dark:text-white group-hover:text-indigo-500 transition-colors duration-150">
                          {brand.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 line-clamp-2 leading-relaxed">
                          {brand.description || "Primary corporate identity and design tokens profile."}
                        </p>

                        <div className="mt-3 flex items-center gap-2">
                          <div className="flex items-center gap-1.5 p-1 px-2 rounded-lg bg-zinc-100/60 dark:bg-white/5 border border-zinc-200/50 dark:border-white/5">
                            <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: colors.primary || '#4f46e5' }} title={`Primary: ${colors.primary}`} />
                            <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: colors.secondary || '#0ea5e9' }} title={`Secondary: ${colors.secondary}`} />
                            <div className="h-3.5 w-3.5 rounded-full shadow-sm" style={{ backgroundColor: colors.accent || '#6366f1' }} title={`Accent: ${colors.accent}`} />
                          </div>
                          <div className="flex items-center gap-1 text-[11px] font-mono text-zinc-400 bg-zinc-100/60 dark:bg-white/5 px-2.5 py-1 rounded-lg w-fit">
                            <span>/{brand.slug}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-white/5 flex items-center justify-between">
                        <div className="text-xs text-zinc-400">
                          {connectedSitesCount} {connectedSitesCount === 1 ? 'Site' : 'Sites'}
                        </div>
                        <div className="flex items-center gap-1 text-xs font-bold text-indigo-500 group-hover:translate-x-1 transition-transform duration-150">
                          Launch Brand Studio <ArrowRight size={14} />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Interactive Dashed + Create Brand Card matching other builders */}
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: filteredBrands.length * 0.03, ease: 'easeOut' }}
                onClick={() => setIsNewModalOpen(true)}
                className="p-6 border-2 border-dashed border-zinc-200 dark:border-zinc-800 hover:border-indigo-500/50 dark:hover:border-indigo-500/50 rounded-3xl transition-[border-color,background-color] duration-200 cursor-pointer flex flex-col items-center justify-center text-center group min-h-[240px] bg-zinc-50/50 dark:bg-zinc-900/20"
              >
                <div className="w-12 h-12 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-indigo-500 group-hover:scale-110 transition-transform duration-200 mb-3">
                  <Plus size={24} />
                </div>
                <span className="text-xs font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-indigo-500 transition-colors duration-150">
                  Create Brand
                </span>
                <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px]">
                  Build custom themes, logos, and voice guidelines.
                </p>
              </motion.div>
            </div>
          )}
        </div>

        {/* New Brand Modal (Blank, Template, AI) */}
        <NewBrandModal
          isOpen={isNewModalOpen}
          onClose={() => setIsNewModalOpen(false)}
        />

        {/* Delete Confirmation Modal */}
        <DeleteConfirmationModal
          isOpen={!!brandToDelete}
          onClose={() => setBrandToDelete(null)}
          onConfirm={confirmDeleteBrand}
          isDeleting={isDeleting}
          title="Delete Brand Profile"
          itemName={brandToDelete?.name || 'Brand Profile'}
          description="Are you sure you want to delete this brand profile? It will be moved to the Recycling Bin and detached from connected sites."
        />
      </div>
    </LicenseGate>
  );
};

export default BrandBuilderPage;

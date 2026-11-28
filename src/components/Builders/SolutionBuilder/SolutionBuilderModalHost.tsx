import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useSolutionStudio } from '../../../context/SolutionStudioContext';
import { SolutionArtifact } from '../../../types/solutions';
import {
  getComponentMeta,
  normalizeArtifactType,
} from './solutionComponentCatalog';
import { InContextBuilderModal } from '../Common/InContextBuilderModal';
import { StandaloneBuilderContext } from '../../../types/platform';

// Wave 1: Core 7 Builders
import { ModuleEditor } from '../../ModuleEditor';
import { FormBuilder } from '../FormBuilder/FormBuilder';
import { WorkflowBuilder } from '../WorkflowBuilder/WorkflowBuilder';
import { ValidationBuilder } from '../ValidationBuilder/ValidationBuilder';
import { AutomationBuilder } from '../AutomationBuilder/AutomationBuilder';
import { RoleBuilderStudio } from '../RoleBuilder/RoleBuilderStudio';
import { PageBuilder } from '../../../pages/WorkspacePage/PageBuilder';

// Wave 2: Remaining 12 Build & Customize Builders (All 19 Wired In)
import { AgentBuilderStudio } from '../AgentBuilder/AgentBuilderStudio';
import { QueueBuilder } from '../QueueBuilder/QueueBuilder';
import { QueryBuilder } from '../QueryBuilder/QueryBuilder';
import { SearchBuilder } from '../SearchBuilder/SearchBuilder';
import { KpiBuilder } from '../KpiBuilder/KpiBuilder';
import { ConnectorBuilder } from '../ConnectorBuilder/ConnectorBuilder';
import {
  DraftMenuBuilder,
  DraftListBuilder,
  DraftBrandBuilder,
  DraftContentBuilder,
  DraftSiteBuilder,
  DraftReportBuilder,
} from './DraftWave2Builders';

/**
 * Unified contextual modal host for all 19 Aurora "Build & Customize" specialist builders.
 * Opens on top of Solution Studio inside a centered, near-full-screen InContextBuilderModal
 * with Sibling Switcher, Extension-Only Core protection, and live manual-edit sync.
 */
export const SolutionBuilderModalHost: React.FC = () => {
  const navigate = useNavigate();
  const {
    solutionId,
    artifacts,
    activeModalArtifactId,
    openInBuilderModal,
    closeBuilderModal,
    upsertArtifact,
    createSnapshot,
    appendChatMessage,
  } = useSolutionStudio();

  const activeArtifact = useMemo(
    () => artifacts.find((a) => a.id === activeModalArtifactId) || null,
    [artifacts, activeModalArtifactId]
  );

  const [isModalDirty, setIsModalDirty] = useState(false);

  // Controlled state for AutomationBuilder & ConnectorBuilder
  const [draftAutomations, setDraftAutomations] = useState<any[]>([]);
  const [draftConnectorMappings, setDraftConnectorMappings] = useState<
    Record<string, Record<string, string>>
  >({});

  useEffect(() => {
    if (!activeArtifact) {
      setIsModalDirty(false);
      return;
    }
    setIsModalDirty(false);
    const normType = normalizeArtifactType(activeArtifact.type);
    if (normType === 'AUTOMATION') {
      const content = activeArtifact.content || {};
      const list = Array.isArray(content.automations)
        ? content.automations
        : [
            {
              id: content.id || activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description || '',
              triggers: content.triggers || [],
              actions: content.actions || [],
              isActive: content.isActive ?? true,
            },
          ];
      setDraftAutomations(list);
    } else if (normType === 'INTEGRATION') {
      setDraftConnectorMappings(activeArtifact.content?.connectorMappings || {});
    }
  }, [activeArtifact?.id]);

  // Sibling components of the same type for instant switching in the modal header
  const siblings = useMemo(() => {
    if (!activeArtifact) return [];
    const targetType = normalizeArtifactType(activeArtifact.type);
    return artifacts
      .filter((a) => normalizeArtifactType(a.type) === targetType)
      .map((a) => ({
        id: a.id,
        name: a.name,
        badge: a.origin,
      }));
  }, [artifacts, activeArtifact]);

  // Draft module fields available to Forms, Workflows, Rules, Automations, and Connectors
  const draftModuleFields = useMemo(() => {
    const linked =
      artifacts.find((a) => a.id === activeArtifact?.linkedModuleId) ||
      artifacts.find((a) => normalizeArtifactType(a.type) === 'MODULE');
    if (!linked) return [];
    const c = linked.content || {};
    if (Array.isArray(c.layout)) return c.layout;
    if (Array.isArray(c.fields)) return c.fields;
    return [];
  }, [artifacts, activeArtifact?.linkedModuleId]);

  const draftModulesList = useMemo(
    () =>
      artifacts
        .filter((a) => normalizeArtifactType(a.type) === 'MODULE')
        .map((a) => ({
          id: a.id,
          name: a.name,
          slug: a.slug,
          layout: a.content?.layout || a.content?.fields || [],
        })),
    [artifacts]
  );

  if (!activeArtifact) return null;

  const meta = getComponentMeta(activeArtifact.type);
  const normType = normalizeArtifactType(activeArtifact.type);

  const builderContext: StandaloneBuilderContext = {
    mode: 'in_context',
    hostType: 'solution',
    hostId: solutionId,
    parentModuleId: activeArtifact.linkedModuleId,
  };

  const commitDraftUpdate = (updatedName: string, updatedContent: any, updatedDesc?: string) => {
    const updated: SolutionArtifact = {
      ...activeArtifact,
      name: updatedName || activeArtifact.name,
      description: updatedDesc !== undefined ? updatedDesc : activeArtifact.description,
      content: updatedContent,
    };
    createSnapshot(`Manual edit: ${updated.name}`, 'USER');
    upsertArtifact(updated, 'USER');
    setIsModalDirty(false);

    appendChatMessage({
      id: `msg_manual_${Date.now()}`,
      role: 'aurora',
      text: `Synced manual edit to **${updated.name}** (${meta.singularLabel}). Future AI updates will preserve your changes.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    });
  };

  const handleSaveAutomations = () => {
    const primary = draftAutomations[0];
    commitDraftUpdate(
      primary?.name || activeArtifact.name,
      {
        ...(activeArtifact.content || {}),
        triggers: primary?.triggers || [],
        actions: primary?.actions || [],
        automations: draftAutomations,
      },
      primary?.description
    );
    toast.success(`Automation "${primary?.name || activeArtifact.name}" saved to Solution draft.`);
    closeBuilderModal();
  };

  const handleSaveConnectors = () => {
    commitDraftUpdate(activeArtifact.name, {
      ...(activeArtifact.content || {}),
      connectorMappings: draftConnectorMappings,
    });
    toast.success(`Integration "${activeArtifact.name}" saved to Solution draft.`);
    closeBuilderModal();
  };

  const renderBuilderBody = () => {
    switch (normType) {
      // --- WAVE 1: CORE 7 BUILDERS ---
      case 'MODULE': {
        const coreLockedIds =
          activeArtifact.isSharedCore || activeArtifact.coreExtensionOnly
            ? (activeArtifact.content?.layout || activeArtifact.content?.fields || [])
                .map((f: any) => f.id)
                .filter(Boolean)
            : [];
        return (
          <ModuleEditor
            key={activeArtifact.id}
            draftMode
            coreExtensionOnly={Boolean(activeArtifact.isSharedCore || activeArtifact.coreExtensionOnly)}
            lockedFieldIds={coreLockedIds}
            initialDraftModule={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description,
            }}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(savedMod) => {
              commitDraftUpdate(savedMod.name || activeArtifact.name, savedMod, savedMod.description);
              closeBuilderModal();
            }}
          />
        );
      }

      case 'FORM':
        return (
          <FormBuilder
            key={activeArtifact.id}
            draftMode
            mode="in_context"
            builderContext={builderContext}
            initialForm={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              title: activeArtifact.name,
              description: activeArtifact.description,
            }}
            moduleLayout={draftModuleFields}
            onDirtyChange={setIsModalDirty}
            onSave={(savedForm) => {
              commitDraftUpdate(savedForm.name || activeArtifact.name, savedForm, savedForm.description);
              closeBuilderModal();
            }}
          />
        );

      case 'WORKFLOW':
        return (
          <WorkflowBuilder
            key={activeArtifact.id}
            draftMode
            builderContext={builderContext}
            initialWorkflow={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description,
            }}
            fields={draftModuleFields}
            onDirtyChange={setIsModalDirty}
            onSave={(savedWf) => {
              commitDraftUpdate(savedWf.name || activeArtifact.name, savedWf, savedWf.description);
              closeBuilderModal();
            }}
          />
        );

      case 'VALIDATION':
        return (
          <ValidationBuilder
            key={activeArtifact.id}
            draftMode
            builderContext={builderContext}
            initialRuleset={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description,
            }}
            fields={draftModuleFields}
            onDirtyChange={setIsModalDirty}
            onSave={(savedRuleset) => {
              commitDraftUpdate(
                savedRuleset.name || activeArtifact.name,
                savedRuleset,
                savedRuleset.description
              );
              closeBuilderModal();
            }}
          />
        );

      case 'PERMISSION':
        return (
          <RoleBuilderStudio
            key={activeArtifact.id}
            draftMode
            initialDraftRole={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description,
            }}
            draftModules={draftModulesList}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(savedRole) => {
              commitDraftUpdate(
                savedRole.name || activeArtifact.name,
                savedRole,
                savedRole.description || activeArtifact.description
              );
              closeBuilderModal();
            }}
          />
        );

      case 'AUTOMATION':
        return (
          <AutomationBuilder
            key={activeArtifact.id}
            builderContext={builderContext}
            moduleId={activeArtifact.linkedModuleId}
            fields={draftModuleFields}
            automations={draftAutomations}
            setAutomations={(updater) => {
              setIsModalDirty(true);
              setDraftAutomations(updater);
            }}
          />
        );

      case 'PAGE':
        return (
          <PageBuilder
            key={activeArtifact.id}
            draftMode
            initialDraftPage={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              title: activeArtifact.name,
            }}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(savedPage) => {
              commitDraftUpdate(savedPage.name || activeArtifact.name, savedPage);
              closeBuilderModal();
            }}
          />
        );

      // --- WAVE 2: REMAINING 12 BUILD & CUSTOMIZE BUILDERS ---
      case 'AGENT':
        return (
          <AgentBuilderStudio
            key={activeArtifact.id}
            draftMode
            initialAgent={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description || '',
            }}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(savedAgent) => {
              commitDraftUpdate(savedAgent.name || activeArtifact.name, savedAgent, savedAgent.description);
              closeBuilderModal();
            }}
            onClose={closeBuilderModal}
          />
        );

      case 'QUEUE':
        return (
          <QueueBuilder
            key={activeArtifact.id}
            initialQueue={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description || '',
            }}
            onDirtyChange={setIsModalDirty}
            onSave={(savedQueue) => {
              commitDraftUpdate(savedQueue.name || activeArtifact.name, savedQueue, savedQueue.description);
              toast.success(`Queue "${savedQueue.name}" updated in Solution draft.`);
              closeBuilderModal();
            }}
            onCancel={closeBuilderModal}
          />
        );

      case 'QUERY':
        return (
          <QueryBuilder
            key={activeArtifact.id}
            draftMode
            initialQuery={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description || '',
            }}
            onClose={closeBuilderModal}
            onSaveSuccess={(savedQuery) => {
              commitDraftUpdate(savedQuery.name || activeArtifact.name, savedQuery, savedQuery.description);
            }}
          />
        );

      case 'SEARCH':
        return (
          <SearchBuilder
            key={activeArtifact.id}
            draftMode
            initialSearch={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description || '',
            }}
            onClose={closeBuilderModal}
            onSaveSuccess={(savedSearch) => {
              commitDraftUpdate(savedSearch.name || activeArtifact.name, savedSearch, savedSearch.description);
            }}
          />
        );

      case 'KPI':
        return (
          <KpiBuilder
            key={activeArtifact.id}
            draftMode
            initialKpi={{
              ...(activeArtifact.content || {}),
              id: activeArtifact.id,
              name: activeArtifact.name,
              description: activeArtifact.description || '',
            }}
            onClose={closeBuilderModal}
            onSaveSuccess={(savedKpi) => {
              commitDraftUpdate(savedKpi.name || activeArtifact.name, savedKpi, savedKpi.description);
            }}
          />
        );

      case 'INTEGRATION':
        return (
          <ConnectorBuilder
            key={activeArtifact.id}
            builderContext={builderContext}
            layout={draftModuleFields}
            connectorMappings={draftConnectorMappings}
            setConnectorMappings={(updater) => {
              setIsModalDirty(true);
              setDraftConnectorMappings(updater);
            }}
          />
        );

      case 'REPORT':
        return (
          <DraftReportBuilder
            key={activeArtifact.id}
            artifact={activeArtifact}
            allArtifacts={artifacts}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(n, c) => {
              commitDraftUpdate(n, c);
              toast.success(`Report "${n}" saved to Solution draft.`);
              closeBuilderModal();
            }}
            onOpenStandalone={() => { closeBuilderModal(); navigate(meta.builderRoute); }}
          />
        );

      case 'BRAND':
        return (
          <DraftBrandBuilder
            key={activeArtifact.id}
            artifact={activeArtifact}
            allArtifacts={artifacts}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(n, c) => {
              commitDraftUpdate(n, c);
              toast.success(`Brand "${n}" saved to Solution draft.`);
              closeBuilderModal();
            }}
            onOpenStandalone={() => { closeBuilderModal(); navigate(meta.builderRoute); }}
          />
        );

      case 'GLOBAL_LIST':
        return (
          <DraftListBuilder
            key={activeArtifact.id}
            artifact={activeArtifact}
            allArtifacts={artifacts}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(n, c) => {
              commitDraftUpdate(n, c);
              toast.success(`List "${n}" saved to Solution draft.`);
              closeBuilderModal();
            }}
            onOpenStandalone={() => { closeBuilderModal(); navigate(meta.builderRoute); }}
          />
        );

      case 'NAVIGATION':
        return (
          <DraftMenuBuilder
            key={activeArtifact.id}
            artifact={activeArtifact}
            allArtifacts={artifacts}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(n, c) => {
              commitDraftUpdate(n, c);
              toast.success(`Menu "${n}" saved to Solution draft.`);
              closeBuilderModal();
            }}
            onOpenStandalone={() => { closeBuilderModal(); navigate(meta.builderRoute); }}
          />
        );

      case 'SITE':
        return (
          <DraftSiteBuilder
            key={activeArtifact.id}
            artifact={activeArtifact}
            allArtifacts={artifacts}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(n, c) => {
              commitDraftUpdate(n, c);
              toast.success(`Site "${n}" saved to Solution draft.`);
              closeBuilderModal();
            }}
            onOpenStandalone={() => { closeBuilderModal(); navigate(meta.builderRoute); }}
          />
        );

      case 'CONTENT':
      default:
        return (
          <DraftContentBuilder
            key={activeArtifact.id}
            artifact={activeArtifact}
            allArtifacts={artifacts}
            onDirtyChange={setIsModalDirty}
            onSaveDraft={(n, c) => {
              commitDraftUpdate(n, c);
              toast.success(`Content "${n}" saved to Solution draft.`);
              closeBuilderModal();
            }}
            onOpenStandalone={() => { closeBuilderModal(); navigate(meta.builderRoute); }}
          />
        );
    }
  };

  const modalHeaderSaveHandler =
    normType === 'AUTOMATION'
      ? handleSaveAutomations
      : normType === 'INTEGRATION'
      ? handleSaveConnectors
      : undefined;

  return (
    <InContextBuilderModal
      isOpen={Boolean(activeArtifact)}
      onClose={closeBuilderModal}
      title={activeArtifact.name}
      subtitle={meta.singularLabel}
      backLabel="Back to Solution"
      saveLabel="Save & Close"
      builderContext={builderContext}
      isDirty={isModalDirty}
      onSave={modalHeaderSaveHandler}
      siblings={siblings}
      activeSiblingId={activeArtifact.id}
      onSelectSibling={(sibId) => openInBuilderModal(sibId)}
      isCoreExtensionOnly={Boolean(activeArtifact.isSharedCore || activeArtifact.coreExtensionOnly)}
      onOpenCoreGlobal={() => {
        closeBuilderModal();
        navigate(meta.builderRoute);
      }}
    >
      {renderBuilderBody()}
    </InContextBuilderModal>
  );
};

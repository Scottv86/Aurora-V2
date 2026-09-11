import { SchemaChange } from '../components/Builder/SchemaDiffModal';

export interface GenerateReleaseNotesOptions {
  moduleName: string;
  fromVersion: string;
  toVersion: string;
  changes: SchemaChange[];
  riskLevel: 'safe' | 'warning' | 'critical';
  softDeleteDropped?: boolean;
  author?: string;
  forms?: any[];
  validationRules?: any[];
  connectorMappings?: Record<string, Record<string, string>>;
  dataPopulationRules?: any[];
  fieldSecurity?: Record<string, Record<string, any>>;
  tabs?: any[];
}

export const releaseNotesGenerator = {
  generate(options: GenerateReleaseNotesOptions): string {
    const {
      moduleName,
      fromVersion,
      toVersion,
      changes,
      riskLevel,
      softDeleteDropped = true,
      author = 'Developer / Admin',
      forms = [],
      validationRules = [],
      connectorMappings = {},
      dataPopulationRules = [],
      fieldSecurity = {},
      tabs = []
    } = options;

    const added = changes.filter(c => c.type === 'added');
    const modified = changes.filter(c => c.type === 'modified' || c.type === 'renamed');
    const removed = changes.filter(c => c.type === 'removed');

    const out: string[] = [];

    const targetTag = toVersion.startsWith('v') ? toVersion : 'v' + toVersion;
    const sourceTag = fromVersion.startsWith('v') ? fromVersion : 'v' + fromVersion;
    out.push('# Release ' + targetTag + ' — ' + moduleName);
    out.push('*Upgraded from ' + sourceTag + ' on ' + new Date().toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) + ' by ' + author + '*');
    out.push('');

    // Risk Classification Banner
    if (riskLevel === 'critical') {
      out.push('> ⚠️ **Risk Level: CRITICAL** — Contains breaking schema modifications or lossy type casts. Automated pre-flight snapshot created.');
    } else if (riskLevel === 'warning') {
      out.push('> ⚡ **Risk Level: WARNING** — Contains renamed identifiers or tightened column constraints.');
    } else {
      out.push('> ✅ **Risk Level: SAFE** — Non-breaking additive changes verified for live database execution.');
    }
    out.push('');

    // Executive Summary
    out.push('### 📋 Executive Summary');
    const summaryParts: string[] = [];
    if (added.length > 0) summaryParts.push(added.length + ' new field' + (added.length > 1 ? 's' : ''));
    if (modified.length > 0) summaryParts.push(modified.length + ' modified field' + (modified.length > 1 ? 's' : ''));
    if (removed.length > 0) summaryParts.push(removed.length + ' archived column' + (removed.length > 1 ? 's' : ''));
    if (forms.length > 0) summaryParts.push(forms.length + ' active form' + (forms.length > 1 ? 's' : ''));
    if (validationRules.length > 0) summaryParts.push(validationRules.length + ' validation rule' + (validationRules.length > 1 ? 's' : ''));
    const connectorKeys = Object.keys(connectorMappings).filter(k => Object.keys(connectorMappings[k] || {}).length > 0);
    if (connectorKeys.length > 0) summaryParts.push(connectorKeys.length + ' external integration' + (connectorKeys.length > 1 ? 's' : ''));

    if (summaryParts.length > 0) {
      out.push('This release packages **' + summaryParts.join(', ') + '** for the **' + moduleName + '** module.');
    } else {
      out.push('Routine deployment checkpoint. Database metadata and application layout are fully synchronized.');
    }
    out.push('');

    // 1. Schema & Fields
    if (added.length > 0) {
      out.push('### 🚀 New Fields & Capabilities');
      added.forEach(item => {
        const fieldType = item.newField?.type || 'text';
        const isRequired = item.newField?.required ? '*(Required)*' : '*(Optional)*';
        out.push('- **' + item.fieldLabel + '** (`' + item.fieldName + '` — ' + fieldType + ') ' + isRequired);
        if (item.newField?.placeholder) {
          out.push('  - *Placeholder:* "' + item.newField.placeholder + '"');
        }
        if (item.newField?.rollupConfig) {
          out.push('  - *Rollup Calculation:* `' + item.newField.rollupConfig.aggregation + '` across linked records');
        }
        if (item.newField?.relationshipConfig) {
          out.push('  - *Relationship:* `' + item.newField.relationshipConfig.cardinality + '` with Cascade `' + (item.newField.relationshipConfig.cascadeDelete ? 'DELETE' : 'RESTRICT') + '`');
        }
      });
      out.push('');
    }

    if (modified.length > 0) {
      out.push('### 🔄 Schema & Field Modifications');
      modified.forEach(item => {
        out.push('- **' + item.fieldLabel + '** (`' + item.fieldName + '`)');
        if (item.riskMessage) {
          out.push('  - *Change detail:* ' + item.riskMessage);
        }
        if (item.oldField?.type !== item.newField?.type && item.newField?.type) {
          out.push('  - *Type Conversion:* `' + (item.oldField?.type || 'unknown') + '` ➔ `' + item.newField.type + '`');
        }
      });
      out.push('');
    }

    if (removed.length > 0) {
      out.push('### 📦 Archived Columns & Soft Deletions');
      removed.forEach(item => {
        out.push('- **' + item.fieldLabel + '** (`' + item.fieldName + '`)');
        out.push(softDeleteDropped
          ? '  - *Policy:* Retained in database and archived with `_deprecated_*` prefix to prevent data loss.'
          : '  - *Policy:* Hard dropped from PostgreSQL table via CASCADE.'
        );
      });
      out.push('');
    }

    // 2. Forms & Public Intake
    if (forms && forms.length > 0) {
      out.push('### 📝 Intake & Public Forms');
      forms.forEach((f: any) => {
        const fieldsCount = Array.isArray(f.fields) ? f.fields.length : (f.fieldIds ? f.fieldIds.length : 'Standard');
        out.push('- **' + (f.name || 'Intake Form') + '** (' + fieldsCount + ' fields mapped)');
        if (f.isPublic || f.published) {
          out.push('  - *Access:* Enabled for external public intake & embed');
        }
      });
      out.push('');
    }

    // 3. Validation & Business Rules
    if (validationRules && validationRules.length > 0) {
      out.push('### ⚙️ Business & Validation Rules');
      validationRules.forEach((r: any) => {
        out.push('- **' + (r.name || r.title || 'Validation Rule') + '**' + (r.errorMessage ? ': *"' + r.errorMessage + '"*' : ''));
        if (r.fieldId) {
          out.push('  - *Target Field:* `' + r.fieldId + '`');
        }
      });
      out.push('');
    }

    // 4. Integrations & Connectors
    if (connectorKeys.length > 0) {
      out.push('### 🔌 External Integrations & Field Sync');
      connectorKeys.forEach(k => {
        const mappedFields = Object.keys(connectorMappings[k] || {}).length;
        out.push('- **' + k.toUpperCase() + ' Connector:** ' + mappedFields + ' synchronized field' + (mappedFields > 1 ? 's' : ''));
      });
      out.push('');
    }

    // 5. Data Population Rules
    if (dataPopulationRules && dataPopulationRules.length > 0) {
      out.push('### ⚡ Automated Data Population & Calculations');
      dataPopulationRules.forEach((dp: any) => {
        out.push('- **' + (dp.name || 'Autofill Rule') + '** (Source: `' + (dp.sourceField || 'Dynamic') + '` ➔ Target: `' + (dp.targetField || 'Record') + '`)');
      });
      out.push('');
    }

    // 6. Security & Governance Policies
    const maskedRoles: string[] = [];
    Object.keys(fieldSecurity).forEach(role => {
      const sec = fieldSecurity[role];
      if (sec && typeof sec === 'object') {
        const maskedCount = Object.keys(sec).filter(fid => sec[fid]?.masked).length;
        if (maskedCount > 0) {
          maskedRoles.push(role + ' (' + maskedCount + ' masked field' + (maskedCount > 1 ? 's' : '') + ')');
        }
      }
    });

    if (maskedRoles.length > 0) {
      out.push('### 🔒 Field Security & Privacy Governance');
      out.push('- **Active Masking Policies:** ' + maskedRoles.join(', '));
      out.push('');
    }

    // 7. Migration & Safety Details
    out.push('### 🛡️ Migration Safeguards');
    out.push('- **Total DDL Statements:** ' + changes.length + ' alterations');
    out.push('- **Transactional Rollback:** Enabled (automatic rollback on execution error)');
    out.push('- **Version Checkpoint Snapshot:** Saved for 1-click rollback recovery');

    return out.join('\n');
  },

  polishWithExecutiveTone(currentNotes: string, moduleName: string, versionTag: string): string {
    const noteLines = currentNotes.split('\n');
    const targetTag = versionTag.startsWith('v') ? versionTag : 'v' + versionTag;
    const header = [
      '# 🌟 Release ' + targetTag + ' — ' + moduleName + ' (Executive Summary)',
      '*Automated AI-Polished Release Brief for Stakeholders & Operations*',
      '',
      '### ✨ Highlights & Business Value',
      'This update enhances the **' + moduleName + '** application with streamlined data intake, improved field governance, and enhanced data integrity.',
      ''
    ];

    const userFacingContent = noteLines.filter(l =>
      !l.startsWith('# Release') &&
      !l.startsWith('*Upgraded') &&
      !l.startsWith('### 🛡️ Migration Safeguards') &&
      !l.startsWith('- **Total DDL Statements:') &&
      !l.startsWith('- **Transactional Rollback:')
    );

    return [...header, ...userFacingContent].join('\n');
  }
};
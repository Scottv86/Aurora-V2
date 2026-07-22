/**
 * Self-Healing JSON Manifest Validator & Sanitizer
 * Ensures 100% reliable UI rendering by validating AI-generated form & workflow manifests
 * against expected schema structures before passing to the React frontend.
 */

export interface ValidationResult {
  isValid: boolean;
  sanitizedManifest: any;
  errors: string[];
  repairPrompt?: string;
}

export class ManifestValidator {
  /**
   * Validates and sanitizes a form manifest structure.
   */
  public static validateFormManifest(manifest: any): ValidationResult {
    const errors: string[] = [];

    if (!manifest || typeof manifest !== 'object') {
      return {
        isValid: false,
        sanitizedManifest: null,
        errors: ['Manifest payload is not a valid JSON object.'],
        repairPrompt: 'JSON Repair: Output must be a valid JSON object representing form_manifest.'
      };
    }

    // Clone manifest for sanitization
    const sanitized = JSON.parse(JSON.stringify(manifest));

    // Ensure layout properties
    if (!sanitized.layout || !Array.isArray(sanitized.layout)) {
      sanitized.layout = [];
    }

    // Inspect fields inside layout rows/columns
    sanitized.layout.forEach((row: any, rIdx: number) => {
      if (!row.id) row.id = `row-${rIdx + 1}`;
      if (!row.columnCount || typeof row.columnCount !== 'number') row.columnCount = 1;
      if (!Array.isArray(row.columns)) row.columns = [{ id: `col-${rIdx}-1`, fields: [] }];

      row.columns.forEach((col: any, cIdx: number) => {
        if (!col.id) col.id = `col-${rIdx}-${cIdx}`;
        if (!Array.isArray(col.fields)) col.fields = [];

        col.fields.forEach((field: any, fIdx: number) => {
          if (!field.id) field.id = `field-${rIdx}-${cIdx}-${fIdx}`;
          if (!field.name) {
            field.name = `field_${rIdx}_${cIdx}_${fIdx}`;
            errors.push(`Missing field name at row ${rIdx}, col ${cIdx}, index ${fIdx}`);
          }
          if (!field.label) field.label = field.name.replace(/_/g, ' ').toUpperCase();
          if (!field.type) field.type = 'text';
          if (field.required === undefined) field.required = false;
        });
      });
    });

    const isValid = errors.length === 0;

    return {
      isValid,
      sanitizedManifest: sanitized,
      errors,
      repairPrompt: isValid ? undefined : `JSON Repair Directives:\n${errors.join('\n')}`
    };
  }
}

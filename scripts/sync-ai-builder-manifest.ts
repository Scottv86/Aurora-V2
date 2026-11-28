/**
 * Hybrid AI Builder Capability Manifest Generator
 *
 * Parses real TypeScript interfaces and union types directly from Aurora's UI builders
 * (excluding React/internal UI-only props) and outputs `server/generated/builderCapabilities.json`.
 *
 * Run via: `npm run sync:ai-schemas`
 */

import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const ROOT = process.cwd();

const INTERNAL_UI_ONLY_KEYS = new Set([
  'isDraggingPlaceholder',
  'isNameManuallyEdited',
  'isCollapsed',
  'icon',
  'rowSpan',
]);

const EXCLUDED_FIELD_TYPES = new Set(['placeholder']);

function parseSourceFile(relPath: string): ts.SourceFile | null {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const content = fs.readFileSync(abs, 'utf-8');
  return ts.createSourceFile(abs, content, ts.ScriptTarget.Latest, true);
}

function extractInterfaceProps(
  sf: ts.SourceFile | null,
  interfaceName: string,
  excludeKeys: Set<string> = INTERNAL_UI_ONLY_KEYS
): Record<string, string> {
  if (!sf) return {};
  const result: Record<string, string> = {};

  const visit = (node: ts.Node) => {
    if (ts.isInterfaceDeclaration(node) && node.name.text === interfaceName) {
      for (const member of node.members) {
        if (ts.isPropertySignature(member) && member.name) {
          const propName = member.name.getText(sf).replace(/^['"]|['"]$/g, '');
          if (!propName || excludeKeys.has(propName)) continue;
          const typeText = member.type
            ? member.type.getText(sf).replace(/\s+/g, ' ').trim()
            : 'any';
          // Keep compact type summary (skip huge inline callback/React types)
          if (typeText.includes('=>') || typeText.includes('React.')) continue;
          result[propName] = typeText.length > 140 ? `${typeText.slice(0, 137)}...` : typeText;
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return result;
}

function extractUnionLiterals(
  sf: ts.SourceFile | null,
  typeAliasName: string,
  exclude: Set<string> = new Set()
): string[] {
  if (!sf) return [];
  const literals: string[] = [];

  const collect = (typeNode: ts.TypeNode) => {
    if (ts.isLiteralTypeNode(typeNode) && ts.isStringLiteral(typeNode.literal)) {
      const val = typeNode.literal.text;
      if (!exclude.has(val)) literals.push(val);
    } else if (ts.isUnionTypeNode(typeNode)) {
      typeNode.types.forEach(collect);
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === typeAliasName) {
      collect(node.type);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return Array.from(new Set(literals));
}

function extractRegexStringList(relPath: string, pattern: RegExp): string[] {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return [];
  const content = fs.readFileSync(abs, 'utf-8');
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(content)) !== null) {
    if (m[1]) found.add(m[1]);
  }
  return Array.from(found);
}

function main() {
  const platformSf = parseSourceFile('src/types/platform.ts');
  const moduleEditorSf = parseSourceFile('src/components/ModuleEditor.tsx');
  const formUtilsSf = parseSourceFile('src/lib/formFieldUtils.ts');
  const validationSf = parseSourceFile('src/lib/validationEngine.ts');

  const fieldTypes = extractUnionLiterals(platformSf, 'FieldType', EXCLUDED_FIELD_TYPES);
  const moduleFieldProps = extractInterfaceProps(moduleEditorSf, 'Field');
  const tabProps = extractInterfaceProps(platformSf, 'Tab');
  const visibilityRuleProps = extractInterfaceProps(platformSf, 'VisibilityRule');
  const formattingPresets = extractUnionLiterals(platformSf, 'FormattingPreset');
  const formattingStyleProps = extractInterfaceProps(platformSf, 'FormattingStyle');
  const formattingRuleProps = extractInterfaceProps(platformSf, 'ConditionalFormattingRule');

  // Workflow Builder live properties
  const workflowNodeTypes = extractUnionLiterals(platformSf, 'WorkflowNodeType');
  const workflowNodeProps = extractInterfaceProps(platformSf, 'WorkflowNode');
  const workflowEdgeProps = extractInterfaceProps(platformSf, 'WorkflowEdge');
  const workflowSubstepProps = extractInterfaceProps(platformSf, 'WorkflowSubstep');

  // Formula Engine live supported functions
  const formulaFunctions = extractRegexStringList(
    'server/services/formulaService.ts',
    /expr\.replace\(\/([A-Z]{2,})\\s\*\\\(/g
  );

  // Form Builder live properties
  const formFieldProps = extractInterfaceProps(formUtilsSf, 'FormFieldPlacement');
  const formStepProps = extractInterfaceProps(formUtilsSf, 'FormStepConfig');
  const formPrefillProps = extractInterfaceProps(formUtilsSf, 'FormPrefillConfig');
  const formValidationProps = extractInterfaceProps(formUtilsSf, 'FormFieldValidation');
  const formContextBindingsProps = extractInterfaceProps(formUtilsSf, 'FormContextBindings');
  const formPostSubmitProps = extractInterfaceProps(formUtilsSf, 'FormPostSubmitConfig');
  const formThemeProps = extractInterfaceProps(formUtilsSf, 'FormThemeConfig');
  const formPaymentProps = extractInterfaceProps(formUtilsSf, 'FormPaymentConfig');

  // Validation Engine live properties
  const validationRuleProps = extractInterfaceProps(validationSf, 'ValidationRule');
  const validationOperators = extractUnionLiterals(validationSf, 'ValidationOperator');

  // Automation Engine live action & trigger types
  const automationActions = extractRegexStringList(
    'server/services/automationEngine.ts',
    /case\s+['"]([A-Z][A-Z0-9_]{2,})['"]\s*:/g
  );

  const manifest = {
    generatedAt: new Date().toISOString(),
    sourceFiles: [
      'src/types/platform.ts',
      'src/components/ModuleEditor.tsx',
      'src/lib/formFieldUtils.ts',
      'src/lib/validationEngine.ts',
      'server/services/automationEngine.ts',
      'server/services/formulaService.ts',
    ],
    builders: {
      MODULE: {
        fieldTypesCount: fieldTypes.length,
        fieldTypes,
        fieldProperties: moduleFieldProps,
        tabProperties: tabProps,
        visibilityRuleProperties: visibilityRuleProps,
        conditionalFormatting: {
          presets: formattingPresets,
          styleProperties: formattingStyleProps,
          ruleProperties: formattingRuleProps,
        },
        formulaEngine: {
          supportedFunctions: formulaFunctions,
          tokenSyntaxes: ['{{field_id}}', '{field_id}', '@Record.field_id', '@field_id'],
          operators: ['+', '-', '*', '/', '%', '?', ':', '>', '<', '>=', '<=', '==', '!=', '&&', '||'],
        },
      },
      WORKFLOW: {
        nodeTypes: workflowNodeTypes,
        nodeProperties: workflowNodeProps,
        edgeProperties: workflowEdgeProps,
        substepProperties: workflowSubstepProps,
      },
      FORM: {
        fieldPlacementProperties: formFieldProps,
        stepProperties: formStepProps,
        prefillProperties: formPrefillProps,
        validationProperties: formValidationProps,
        contextBindingsProperties: formContextBindingsProps,
        postSubmitProperties: formPostSubmitProps,
        themeProperties: formThemeProps,
        paymentProperties: formPaymentProps,
      },
      VALIDATION: {
        ruleProperties: validationRuleProps,
        ...(validationOperators.length > 0 ? { operators: validationOperators } : {}),
      },
      AUTOMATION: {
        ...(automationActions.length > 0 ? { engineActionTypes: automationActions } : {}),
      },
    },
  };

  const outDir = path.join(ROOT, 'server', 'generated');
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, 'builderCapabilities.json');
  fs.writeFileSync(outPath, JSON.stringify(manifest, null, 2), 'utf-8');

  console.log(
    `[sync:ai-schemas] Generated ${path.relative(ROOT, outPath)} — ` +
      `MODULE: ${fieldTypes.length} fieldTypes, ${Object.keys(moduleFieldProps).length} field props, ${formattingPresets.length} formatting presets, ${formulaFunctions.length} formula fns | ` +
      `WORKFLOW: ${workflowNodeTypes.length} nodeTypes | ` +
      `FORM: ${Object.keys(formFieldProps).length} placement props | ` +
      `AUTOMATION: ${automationActions.length} engine actions`
  );
}

main();

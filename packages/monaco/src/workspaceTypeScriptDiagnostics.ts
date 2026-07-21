import type * as Monaco from 'monaco-editor';

let workspaceTypeScriptDiagnosticsConfigured = false;

interface MonacoTypeScriptLanguageService {
  JsxEmit: { React: number };
  ModuleKind: { ESNext: number };
  ModuleResolutionKind: { NodeJs: number };
  ScriptTarget: { ESNext: number };
  javascriptDefaults: {
    setCompilerOptions: (options: Record<string, unknown>) => void;
    setDiagnosticsOptions: (options: Record<string, unknown>) => void;
    setEagerModelSync: (value: boolean) => void;
  };
  typescriptDefaults: {
    setCompilerOptions: (options: Record<string, unknown>) => void;
    setDiagnosticsOptions: (options: Record<string, unknown>) => void;
    setEagerModelSync: (value: boolean) => void;
  };
}

const workspaceTypeScriptDiagnosticsOptions = {
  noSemanticValidation: true,
  noSuggestionDiagnostics: true,
};

function getMonacoTypeScriptLanguageService(
  monacoInstance: typeof Monaco,
): MonacoTypeScriptLanguageService | undefined {
  return monacoInstance.languages.typescript as unknown as MonacoTypeScriptLanguageService;
}

export function configureWorkspaceEditorTypeScriptDiagnostics(monacoInstance: typeof Monaco): void {
  if (workspaceTypeScriptDiagnosticsConfigured) return;

  const typescript = getMonacoTypeScriptLanguageService(monacoInstance);
  if (!typescript) return;

  const compilerOptions = {
    allowJs: true,
    allowNonTsExtensions: true,
    esModuleInterop: true,
    jsx: typescript.JsxEmit.React,
    module: typescript.ModuleKind.ESNext,
    moduleResolution: typescript.ModuleResolutionKind.NodeJs,
    noEmit: true,
    reactNamespace: 'React',
    target: typescript.ScriptTarget.ESNext,
  };

  typescript.typescriptDefaults.setCompilerOptions(compilerOptions);
  typescript.javascriptDefaults.setCompilerOptions(compilerOptions);
  typescript.typescriptDefaults.setDiagnosticsOptions(workspaceTypeScriptDiagnosticsOptions);
  typescript.javascriptDefaults.setDiagnosticsOptions(workspaceTypeScriptDiagnosticsOptions);
  typescript.typescriptDefaults.setEagerModelSync(true);
  typescript.javascriptDefaults.setEagerModelSync(true);

  workspaceTypeScriptDiagnosticsConfigured = true;
}

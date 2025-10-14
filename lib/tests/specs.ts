export type TestType = 'cli' | 'docker' | 'git' | 'db' | 'php' | 'laravel';

export type SpecInputFile = {
  path: string;
  label?: string | null;
  max_bytes?: number | null;
  template?: string | null;
};

export type SpecInput = {
  files?: SpecInputFile[];
  git_url?: boolean;
};

export type SpecScoring = {
  pass_threshold_pct?: number; // display-only in UI
};

export type SpecUI = {
  tabs?: Array<'Editor' | 'Terminal' | 'Result'>;
  submit_label?: string;
  mode?: 'cli_only' | 'editor_plus_cli';
};

export type TestSpec = {
  id: string;
  name: string;
  overview_md: string;
  type: TestType;
  expected_minutes?: number;
  time_limit_sec?: number;
  input?: SpecInput;
  scoring?: SpecScoring;
  ui?: SpecUI;
  sample_output?: string | null;
};

// Safe, dependency-free best-effort parser:
// - If the string looks like JSON, parse as JSON.
// - Otherwise, return null (UI will degrade gracefully). For full YAML support,
//   install a YAML parser (e.g., `yaml`) and replace this implementation.
export async function parseSpecYaml(specYaml: string | null | undefined): Promise<Partial<TestSpec> | null> {
  if (!specYaml) return null;
  const src = specYaml.trim();
  if (!src) return null;
  // Heuristic: treat as JSON if starts with { or [
  if (src.startsWith('{') || src.startsWith('[')) {
    try {
      const obj = JSON.parse(src);
      return obj as Partial<TestSpec>;
    } catch {
      return null;
    }
  }
  // Try YAML parse if library is available
  try {
    const mod: any = await import('yaml');
    const obj = mod.parse(src);
    return (obj || null) as Partial<TestSpec> | null;
  } catch {
    return null;
  }
}

export function mergeRowWithSpecYamlSync(row: any, extra: Partial<TestSpec> | null | undefined): TestSpec {
  const base: TestSpec = {
    id: row.id,
    name: row.title,
    overview_md: row.description_md || '',
    type: row.type as TestType,
    expected_minutes: Math.round(((row.time_limit_sec as number | null) || 60) / 60),
    time_limit_sec: (row.time_limit_sec as number | null) || 60,
  };
  if (!extra) return base;
  return {
    ...base,
    ...extra,
    // Ensure required keys from row remain authoritative
    id: base.id,
    name: base.name,
    type: base.type,
    time_limit_sec: extra.time_limit_sec ?? base.time_limit_sec,
    expected_minutes: extra.expected_minutes ?? base.expected_minutes,
  };
}

export async function mergeRowWithSpecYaml(row: any): Promise<TestSpec> {
  const extra = await parseSpecYaml(row?.spec_yaml);
  return mergeRowWithSpecYamlSync(row, extra);
}

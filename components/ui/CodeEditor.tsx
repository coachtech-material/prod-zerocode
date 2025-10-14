"use client";
import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';

const Monaco = dynamic(() => import('@monaco-editor/react'), { ssr: false });

function guessLanguage(path?: string): string | undefined {
  if (!path) return undefined;
  const p = path.toLowerCase();
  if (p.endsWith('.ts') || p.endsWith('.tsx')) return 'typescript';
  if (p.endsWith('.js') || p.endsWith('.jsx')) return 'javascript';
  if (p.endsWith('.json')) return 'json';
  if (p.endsWith('.yml') || p.endsWith('.yaml')) return 'yaml';
  if (p.endsWith('.sql')) return 'sql';
  if (p.endsWith('.sh')) return 'shell';
  if (p.endsWith('.php')) return 'php';
  if (p.endsWith('dockerfile') || p.endsWith('/dockerfile')) return 'dockerfile';
  if (p.endsWith('.md') || p.endsWith('.markdown')) return 'markdown';
  if (p.endsWith('.css') || p.endsWith('.scss')) return 'css';
  if (p.endsWith('.html')) return 'html';
  if (p.endsWith('.go')) return 'go';
  if (p.endsWith('.py')) return 'python';
  if (p.endsWith('.rb')) return 'ruby';
  if (p.endsWith('.java')) return 'java';
  return undefined;
}

export default function CodeEditor({
  path,
  value,
  onChange,
  height = 260,
  language,
  readOnly = false,
  showLineNumbers = true,
  autoHeight = false,
  maxAutoHeight,
  minAutoHeight = 120,
  autoWidth = false,
  maxAutoWidth = 960,
  minAutoWidth = 240,
}: {
  path?: string;
  value: string;
  onChange: (v: string) => void;
  height?: number | string;
  language?: string;
  readOnly?: boolean;
  showLineNumbers?: boolean;
  autoHeight?: boolean;
  maxAutoHeight?: number;
  minAutoHeight?: number;
  autoWidth?: boolean;
  maxAutoWidth?: number;
  minAutoWidth?: number;
}) {
  const lang = useMemo(() => language || guessLanguage(path) || 'plaintext', [language, path]);
  // Manage dynamic height for autoHeight mode
  const h = typeof height === 'number' ? `${height}px` : height;
  const [dynHeight, setDynHeight] = useState<string>(autoHeight ? `${minAutoHeight}px` : h);
  const [dynWidth, setDynWidth] = useState<string | undefined>(autoWidth ? `${minAutoWidth}px` : undefined);
  return (
    <div
      className={[
        'rounded-xl border border-brand-sky/20 overflow-hidden',
        autoWidth ? 'inline-block max-w-full' : 'block w-full'
      ].join(' ')}
      style={autoWidth ? { width: dynWidth } : undefined}
    >
      <Monaco
        height={dynHeight}
        language={lang}
        theme="vs-dark"
        value={value}
        options={{
          minimap: { enabled: false },
          fontSize: 12,
          lineNumbers: showLineNumbers ? 'on' : 'off',
          scrollBeyondLastLine: false,
          wordWrap: autoWidth ? 'off' : 'on',
          automaticLayout: true,
          mouseWheelZoom: false,
          scrollbar: { alwaysConsumeMouseWheel: false },
          readOnly,
        }}
        onChange={(v) => onChange(v || '')}
        onMount={(editor) => {
          // Handle height
          if (autoHeight) {
            const applyH = () => {
              try {
                const ch = (editor as any).getContentHeight?.() || 0;
                const raw = Math.floor(ch);
                const px = Math.max(
                  minAutoHeight,
                  typeof maxAutoHeight === 'number' ? Math.min(maxAutoHeight, raw) : raw
                );
                setDynHeight(`${px}px`);
              } catch {}
            };
            applyH();
            try { (editor as any).onDidContentSizeChange?.(applyH); } catch {}
          }
          // Handle width
          if (autoWidth) {
            const applyW = () => {
              try {
                const cw = (editor as any).getContentWidth?.() || 0;
                const px = Math.max(minAutoWidth, Math.min(maxAutoWidth, Math.floor(cw)));
                setDynWidth(`${px}px`);
                (editor as any).layout?.();
              } catch {}
            };
            applyW();
            try { (editor as any).onDidContentSizeChange?.(applyW); } catch {}
          }
        }}
      />
    </div>
  );
}

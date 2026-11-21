import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import editorWorker from 'monaco-editor/editor/editor.worker?worker';
import tsWorker from 'monaco-editor/language/typescript/ts.worker?worker';
import { useEffect, useState } from 'react';
import type { ProgrammingLanguage } from '../types/codequest';

// Configure local Monaco workers so no external CDN is required
if (typeof self !== 'undefined' && !(self as unknown as { MonacoEnvironment?: unknown }).MonacoEnvironment) {
  (self as unknown as { MonacoEnvironment: unknown }).MonacoEnvironment = {
    getWorker(_moduleId: string, label: string) {
      if (label === 'typescript' || label === 'javascript') {
        return new tsWorker();
      }
      return new editorWorker();
    },
  };
}

loader.config({ monaco });

const MONACO_LANGUAGE_MAP: Record<ProgrammingLanguage, string> = {
  javascript: 'javascript',
  typescript: 'typescript',
  python: 'python',
  java: 'java',
  cpp: 'cpp',
  c: 'c',
  go: 'go',
  rust: 'rust',
  csharp: 'csharp',
  kotlin: 'kotlin',
  swift: 'swift',
  ruby: 'ruby',
};

interface MonacoCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: ProgrammingLanguage;
  height?: string;
  ariaLabel?: string;
}

export function MonacoCodeEditor({
  value,
  onChange,
  language,
  height = '340px',
  ariaLabel = 'Code editor',
}: MonacoCodeEditorProps) {
  const [fallbackMode, setFallbackMode] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mounted) {
        setFallbackMode(true);
      }
    }, 3500);
    return () => clearTimeout(timer);
  }, [mounted]);

  if (fallbackMode) {
    return (
      <div className="relative w-full rounded-lg border border-slate-700/80 bg-[#0B1120]" style={{ height }}>
        <textarea
          aria-label={ariaLabel}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="h-full w-full resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 rounded-lg"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full overflow-hidden rounded-lg border border-slate-700/80 bg-[#0B1120]"
      style={{ height }}
      data-testid="monaco-editor-container"
    >
      <Editor
        height={height}
        language={MONACO_LANGUAGE_MAP[language]}
        value={value}
        theme="vs-dark"
        onChange={(val) => onChange(val ?? '')}
        onMount={() => setMounted(true)}
        loading={
          <div className="flex h-full items-center justify-center bg-[#0B1120] text-xs font-mono text-slate-400">
            Initializing editor workspace...
          </div>
        }
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          fontFamily: "'JetBrains Mono', monospace",
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          padding: { top: 14, bottom: 14 },
          overviewRulerBorder: false,
          renderLineHighlight: 'line',
        }}
      />
    </div>
  );
}

import type {
  ChallengeTestCase,
  ExecutionTestResult,
  ProgrammingLanguage,
  SandboxExecutionResult,
} from '../types/codequest';

export function normalizeOutput(value: unknown): string {
  if (value === undefined) return 'undefined';
  if (value === null) return 'null';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') {
    if (Number.isNaN(value)) return 'NaN';
    return String(value);
  }
  if (typeof value === 'string') return value.trim();
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value).trim();
}

export function compareOutputs(actual: string, expected: string): boolean {
  const normA = actual.trim();
  const normE = expected.trim();
  if (normA === normE) return true;
  if (normA.toLowerCase() === 'true' && normE.toLowerCase() === 'true') return true;
  if (normA.toLowerCase() === 'false' && normE.toLowerCase() === 'false') return true;

  try {
    const parsedA = JSON.parse(normA);
    const parsedE = JSON.parse(normE);
    return JSON.stringify(parsedA) === JSON.stringify(parsedE);
  } catch {
    return false;
  }
}

/**
 * Converts a safe educational subset of Python into executable JavaScript
 * meant strictly for running inside an isolated Web Worker sandbox.
 */
export function transpilePythonSubset(pythonCode: string): string {
  const rawLines = pythonCode.replace(/\r\n/g, '\n').split('\n');
  const jsLines: string[] = [
    'const len = (x) => (x && typeof x.length === "number") ? x.length : (x && typeof x.size === "number" ? x.size : Object.keys(x || {}).length);',
    'const range = (a, b, step = 1) => { const res = []; const start = b === undefined ? 0 : a; const end = b === undefined ? a : b; if (step > 0) { for (let i = start; i < end; i += step) res.push(i); } else if (step < 0) { for (let i = start; i > end; i += step) res.push(i); } return res; };',
    'const abs = Math.abs;',
    'const min = (...args) => args.length === 1 && Array.isArray(args[0]) ? Math.min(...args[0]) : Math.min(...args);',
    'const max = (...args) => args.length === 1 && Array.isArray(args[0]) ? Math.max(...args[0]) : Math.max(...args);',
    'const sum = (arr) => (Array.isArray(arr) ? arr.reduce((a, b) => a + b, 0) : 0);',
    'const sorted = (arr) => [...arr].sort((a, b) => (typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b))));',
    'const str = (v) => String(v);',
    'const int = (v) => parseInt(v, 10);',
    'const float = (v) => parseFloat(v);',
    'const list = (v) => Array.from(v);',
    'const print = (...args) => console.log(...args);',
  ];

  const indentStack: number[] = [0];

  const transformExpr = (expr: string): string => {
    let out = expr
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null')
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\bnot\s+/g, '!')
      .replace(/(\w+|\))\s*\/\/\s*(\w+|\()/g, 'Math.floor($1 / $2)')
      .replace(/(\w+)\[::-1\]/g, '(typeof $1 === "string" ? $1.split("").reverse().join("") : [...$1].reverse())')
      .replace(/\.append\(/g, '.push(')
      .replace(/\.lower\(\)/g, '.toLowerCase()')
      .replace(/\.upper\(\)/g, '.toUpperCase()')
      .replace(/\.strip\(\)/g, '.trim()')
      .replace(/\.startswith\(/g, '.startsWith(')
      .replace(/\.endswith\(/g, '.endsWith(');
    return out;
  };

  for (const rawLine of rawLines) {
    const commentIdx = rawLine.indexOf('#');
    const cleanLine = (commentIdx >= 0 ? rawLine.slice(0, commentIdx) : rawLine).replace(/\s+$/, '');
    if (!cleanLine.trim()) continue;

    const indent = cleanLine.search(/\S/);
    const trimmed = cleanLine.trim();

    while (indentStack.length > 1 && indent < indentStack[indentStack.length - 1]) {
      indentStack.pop();
      jsLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
    }

    const pad = ' '.repeat(indent);

    if (trimmed.startsWith('def ') && trimmed.endsWith(':')) {
      const sig = trimmed.slice(4, -1).trim();
      jsLines.push(`${pad}function ${sig} {`);
      indentStack.push(indent + 2);
      continue;
    }

    if (trimmed.startsWith('if ') && trimmed.endsWith(':')) {
      const cond = transformExpr(trimmed.slice(3, -1).trim());
      jsLines.push(`${pad}if (${cond}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    if (trimmed.startsWith('elif ') && trimmed.endsWith(':')) {
      if (indentStack.length > 1 && indent === indentStack[indentStack.length - 1] - 2) {
        // already closed above if needed
      }
      const cond = transformExpr(trimmed.slice(5, -1).trim());
      jsLines.push(`${pad}else if (${cond}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    if (trimmed === 'else:') {
      jsLines.push(`${pad}else {`);
      indentStack.push(indent + 2);
      continue;
    }

    if (trimmed.startsWith('for ') && trimmed.includes(' in ') && trimmed.endsWith(':')) {
      const body = trimmed.slice(4, -1);
      const [varName, iterExpr] = body.split(' in ').map((s) => s.trim());
      jsLines.push(`${pad}for (const ${varName} of ${transformExpr(iterExpr)}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    if (trimmed.startsWith('while ') && trimmed.endsWith(':')) {
      const cond = transformExpr(trimmed.slice(6, -1).trim());
      jsLines.push(`${pad}while (${cond}) {`);
      indentStack.push(indent + 2);
      continue;
    }

    if (trimmed.startsWith('return ')) {
      jsLines.push(`${pad}return ${transformExpr(trimmed.slice(7).trim())};`);
      continue;
    }

    if (trimmed === 'return') {
      jsLines.push(`${pad}return;`);
      continue;
    }

    if (trimmed === 'pass') {
      continue;
    }

    // Simple variable assignment vs expression
    const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.+)$/);
    if (assignMatch && !trimmed.includes('==')) {
      const [, varName, rhs] = assignMatch;
      jsLines.push(`${pad}var ${varName} = ${transformExpr(rhs)};`);
      continue;
    }

    jsLines.push(`${pad}${transformExpr(trimmed)};`);
  }

  while (indentStack.length > 1) {
    indentStack.pop();
    jsLines.push(' '.repeat(indentStack[indentStack.length - 1]) + '}');
  }

  return jsLines.join('\n');
}

/**
 * Converts common educational C/C++/Java function bodies into JS for the
 * isolated Demo Sandbox Worker so learners using any of the 5 supported
 * languages get real test-case feedback without host execution.
 */
export function transpileCFamilySubset(
  code: string,
  language: 'java' | 'cpp' | 'c' | 'csharp',
  functionName: string
): string {
  let cleaned = code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/#include\s*<[^>]+>/g, '')
    .replace(/using\s+namespace\s+std\s*;/g, '')
    .replace(/using\s+System\s*;/g, '')
    .replace(/public\s+class\s+\w+\s*\{/g, '')
    .replace(/class\s+\w+\s*\{/g, '')
    .replace(/public\s+static\s+/g, '')
    .replace(/static\s+/g, '');

  if (language === 'java' || language === 'csharp') {
    const openBraces = (cleaned.match(/\{/g) || []).length;
    const closeBraces = (cleaned.match(/\}/g) || []).length;
    if (closeBraces > openBraces) {
      const lastIdx = cleaned.lastIndexOf('}');
      if (lastIdx !== -1) {
        cleaned = cleaned.slice(0, lastIdx) + cleaned.slice(lastIdx + 1);
      }
    }
  }

  cleaned = cleaned.replace(
    /\b(?:const\s+)?(?:int|long|double|float|boolean|bool|string|char\s*\*|std::string|String|void|vector<[^>]+>|List<[^>]+>|int\[\]|String\[\]|string\[\])\s+(\w+)\s*\(([^)]*)\)/g,
    (_m, fnName: string, params: string) => {
      const cleanParams = params
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p) => {
          const parts = p.replace(/\[\]|\*|&/g, '').trim().split(/\s+/);
          return parts[parts.length - 1];
        })
        .join(', ');
      return `function ${fnName}(${cleanParams})`;
    }
  );

  cleaned = cleaned
    .replace(/\b(?:const\s+)?(?:int|long|double|float|boolean|bool|string|char\s*\*|std::string|String|auto|var)\s+(\w+)\s*=/g, 'let $1 =')
    .replace(/\b(?:int|long|double|float|boolean|bool|string|std::string|String)\s+(\w+)\s*;/g, 'let $1;')
    .replace(/\.Length\b/g, '.length')
    .replace(/\.length\(\)/g, '.length')
    .replace(/\.size\(\)/g, '.length')
    .replace(/\.equals\(([^)]+)\)/g, ' === $1')
    .replace(/std::max\(/g, 'Math.max(')
    .replace(/std::min\(/g, 'Math.min(')
    .replace(/Math\.Max\(/g, 'Math.max(')
    .replace(/Math\.Min\(/g, 'Math.min(')
    .replace(/System\.out\.println\(/g, 'console.log(')
    .replace(/Console\.WriteLine\(/g, 'console.log(')
    .replace(/printf\(/g, 'console.log(');

  return `${cleaned}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
}

export function transpileModernLanguageSubset(
  code: string,
  language: 'typescript' | 'go' | 'rust' | 'kotlin' | 'swift' | 'ruby',
  functionName: string
): string {
  const lenHelper =
    'const len = (x) => (x && typeof x.length === "number") ? x.length : Object.keys(x || {}).length;\n';

  if (language === 'typescript') {
    const cleaned = code
      .replace(/^\s*(?:export\s+)?(?:interface|type)\s+\w+[\s\S]*?(?:\n\}|;)\s*$/gm, '')
      .replace(/function\s+(\w+)\s*\(([^)]*)\)\s*:\s*[\w<>\[\]\s|&?]+(?=\{)/g, (_m, fn: string, params: string) => {
        const cleanParams = params
          .split(',')
          .map((p) => p.split(':')[0].trim())
          .filter(Boolean)
          .join(', ');
        return `function ${fn}(${cleanParams}) `;
      })
      .replace(/\b(const|let|var)\s+(\w+)\s*:\s*[\w<>\[\]\s|&?]+=/g, '$1 $2 =')
      .replace(/\s+as\s+[\w<>\[\]]+/g, '');
    return `${cleaned}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
  }

  if (language === 'go') {
    const cleaned = code
      .replace(/\/\/.*$/gm, '')
      .replace(/^\s*package\s+\w+\s*$/gm, '')
      .replace(/^\s*import\s+(?:"[^"]+"|\([\s\S]*?\))\s*$/gm, '')
      .replace(/func\s+(\w+)\s*\(([^)]*)\)\s*[\w\[\]*,\s]*\{/g, (_m, fn: string, params: string) => {
        const cleanParams = params
          .split(',')
          .map((p) => p.trim().split(/\s+/)[0])
          .filter(Boolean)
          .join(', ');
        return `function ${fn}(${cleanParams}) {`;
      })
      .replace(/\b(\w+)\s*:=\s*/g, 'let $1 = ')
      .replace(/\bvar\s+(\w+)\s+[\w\[\]]+\s*=/g, 'let $1 =')
      .replace(/fmt\.Println\(/g, 'console.log(');
    return `${lenHelper}${cleaned}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
  }

  if (language === 'rust') {
    const cleaned = code
      .replace(/\/\/.*$/gm, '')
      .replace(/fn\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*[\w<>\[\]&'\s]+)?\{/g, (_m, fn: string, params: string) => {
        const cleanParams = params
          .split(',')
          .map((p) => p.split(':')[0].replace(/\bmut\s+/g, '').trim())
          .filter(Boolean)
          .join(', ');
        return `function ${fn}(${cleanParams}) {`;
      })
      .replace(/\blet\s+mut\s+/g, 'let ')
      .replace(/\blet\s+(\w+)\s*:\s*[^=]+=/g, 'let $1 =')
      .replace(/\.len\(\)/g, '.length')
      .replace(/println!\(/g, 'console.log(');
    return `${cleaned}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
  }

  if (language === 'kotlin') {
    const cleaned = code
      .replace(/\/\/.*$/gm, '')
      .replace(/fun\s+(\w+)\s*\(([^)]*)\)\s*(?::\s*[\w<>?]+)?\s*\{/g, (_m, fn: string, params: string) => {
        const cleanParams = params
          .split(',')
          .map((p) => p.split(':')[0].trim())
          .filter(Boolean)
          .join(', ');
        return `function ${fn}(${cleanParams}) {`;
      })
      .replace(/\b(val|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=/g, 'let $2 =')
      .replace(/\.size\b/g, '.length')
      .replace(/println\(/g, 'console.log(');
    return `${cleaned}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
  }

  if (language === 'swift') {
    const cleaned = code
      .replace(/\/\/.*$/gm, '')
      .replace(/func\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*[\w\[\]<>?]+)?\s*\{/g, (_m, fn: string, params: string) => {
        const cleanParams = params
          .split(',')
          .map((p) => {
            const left = p.split(':')[0].trim();
            const parts = left.split(/\s+/);
            return parts[parts.length - 1];
          })
          .filter(Boolean)
          .join(', ');
        return `function ${fn}(${cleanParams}) {`;
      })
      .replace(/\b(let|var)\s+(\w+)(?:\s*:\s*[^=]+)?\s*=/g, 'let $2 =')
      .replace(/\.count\b/g, '.length')
      .replace(/\bprint\(/g, 'console.log(');
    return `${cleaned}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
  }

  // Ruby subset transpiler
  const lines = code.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const raw of lines) {
    const trimmed = raw.replace(/#.*$/, '').trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('def ')) {
      const sig = trimmed.slice(4).trim();
      const fnCall = sig.includes('(') ? sig : `${sig}()`;
      out.push(`function ${fnCall} {`);
    } else if (trimmed === 'end') {
      out.push('}');
    } else if (trimmed.startsWith('if ')) {
      out.push(`if (${trimmed.slice(3).replace(/\bnil\b/g, 'null')}) {`);
    } else if (trimmed.startsWith('elsif ')) {
      out.push(`} else if (${trimmed.slice(6).replace(/\bnil\b/g, 'null')}) {`);
    } else if (trimmed === 'else') {
      out.push('} else {');
    } else if (trimmed.startsWith('while ')) {
      out.push(`while (${trimmed.slice(6)}) {`);
    } else if (trimmed.startsWith('puts ')) {
      out.push(`console.log(${trimmed.slice(5)});`);
    } else if (/^[a-zA-Z_]\w*\s*=[^=]/.test(trimmed)) {
      out.push(`var ${trimmed.replace(/\bnil\b/g, 'null')};`);
    } else {
      out.push(`${trimmed.replace(/\bnil\b/g, 'null')};`);
    }
  }
  return `${out.join('\n')}\nif (typeof ${functionName} !== 'function') { throw new Error('Function ${functionName} is not defined.'); }`;
}

function buildWorkerScript(
  transpiledCode: string,
  functionName: string,
  testCases: ChallengeTestCase[]
): string {
  const serializedTests = JSON.stringify(testCases);
  return `
    "use strict";
    // Harden isolated worker environment
    try {
      self.fetch = undefined;
      self.XMLHttpRequest = undefined;
      self.WebSocket = undefined;
      self.importScripts = undefined;
    } catch (_) {}

    const __logs = [];
    const console = {
      log: (...args) => __logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')),
      error: (...args) => __logs.push('ERR: ' + args.map(String).join(' ')),
      warn: (...args) => __logs.push(args.map(String).join(' '))
    };

    function __normalize(value) {
      if (value === undefined) return 'undefined';
      if (value === null) return 'null';
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (typeof value === 'number') return Number.isNaN(value) ? 'NaN' : String(value);
      if (typeof value === 'string') return value.trim();
      return JSON.stringify(value);
    }

    function __compare(actual, expected) {
      const a = actual.trim();
      const e = expected.trim();
      if (a === e) return true;
      try {
        return JSON.stringify(JSON.parse(a)) === JSON.stringify(JSON.parse(e));
      } catch (_) {
        return false;
      }
    }

    ${transpiledCode}

    self.onmessage = function() {
      const start = performance.now();
      const tests = ${serializedTests};
      const results = [];
      try {
        if (typeof ${functionName} !== 'function') {
          throw new Error('Expected function "${functionName}" to be defined.');
        }
        for (const tc of tests) {
          try {
            const argsCopy = JSON.parse(JSON.stringify(tc.args));
            const out = ${functionName}(...argsCopy);
            const norm = __normalize(out);
            const passed = __compare(norm, tc.expectedOutput);
            results.push({
              testCaseId: tc.id,
              description: tc.description,
              inputDisplay: tc.functionCall,
              expectedOutput: tc.expectedOutput,
              actualOutput: norm,
              passed
            });
          } catch (err) {
            results.push({
              testCaseId: tc.id,
              description: tc.description,
              inputDisplay: tc.functionCall,
              expectedOutput: tc.expectedOutput,
              actualOutput: 'Runtime Error',
              passed: false,
              error: err && err.message ? err.message : String(err)
            });
          }
        }
        const elapsed = Math.max(1, Math.round(performance.now() - start));
        self.postMessage({ ok: true, results, stdout: __logs.join('\\n'), executionMs: elapsed });
      } catch (err) {
        const elapsed = Math.max(1, Math.round(performance.now() - start));
        self.postMessage({
          ok: false,
          error: err && err.message ? err.message : String(err),
          results: [],
          stdout: __logs.join('\\n'),
          executionMs: elapsed
        });
      }
    };
  `;
}

export async function executeChallengeInSandbox(
  code: string,
  language: ProgrammingLanguage,
  functionName: string,
  testCases: ChallengeTestCase[]
): Promise<SandboxExecutionResult> {
  const runtimeLabels: Record<ProgrammingLanguage, string> = {
    javascript: 'Isolated Web Worker Sandbox (JS)',
    typescript: 'Isolated Worker Sandbox (TypeScript Subset)',
    python: 'Isolated Worker Sandbox (Python Subset)',
    java: 'Demo Sandbox Runtime (Java Subset)',
    cpp: 'Demo Sandbox Runtime (C++ Subset)',
    c: 'Demo Sandbox Runtime (C Subset)',
    go: 'Demo Sandbox Runtime (Go Subset)',
    rust: 'Demo Sandbox Runtime (Rust Subset)',
    csharp: 'Demo Sandbox Runtime (C# Subset)',
    kotlin: 'Demo Sandbox Runtime (Kotlin Subset)',
    swift: 'Demo Sandbox Runtime (Swift Subset)',
    ruby: 'Demo Sandbox Runtime (Ruby Subset)',
  };

  let transpiled = code;
  try {
    if (language === 'python') {
      transpiled = transpilePythonSubset(code);
    } else if (language === 'java' || language === 'cpp' || language === 'c' || language === 'csharp') {
      transpiled = transpileCFamilySubset(code, language, functionName);
    } else if (
      language === 'typescript' ||
      language === 'go' ||
      language === 'rust' ||
      language === 'kotlin' ||
      language === 'swift' ||
      language === 'ruby'
    ) {
      transpiled = transpileModernLanguageSubset(code, language, functionName);
    }
  } catch (err) {
    return {
      passedAll: false,
      passedCount: 0,
      totalCount: testCases.length,
      stdout: '',
      executionMs: 1,
      runtimeLabel: runtimeLabels[language],
      results: [],
      compileOrRuntimeError: err instanceof Error ? err.message : String(err),
    };
  }

  if (typeof Worker === 'undefined' || typeof Blob === 'undefined') {
    return {
      passedAll: false,
      passedCount: 0,
      totalCount: testCases.length,
      stdout: '',
      executionMs: 1,
      runtimeLabel: runtimeLabels[language],
      results: [],
      compileOrRuntimeError: 'Web Worker sandbox unavailable in this environment.',
    };
  }

  const workerScript = buildWorkerScript(transpiled, functionName, testCases);
  const blob = new Blob([workerScript], { type: 'application/javascript' });
  const blobUrl = URL.createObjectURL(blob);

  return new Promise<SandboxExecutionResult>((resolve) => {
    const worker = new Worker(blobUrl);
    let settled = false;

    const cleanup = () => {
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({
        passedAll: false,
        passedCount: 0,
        totalCount: testCases.length,
        stdout: '',
        executionMs: 1500,
        runtimeLabel: runtimeLabels[language],
        results: testCases.map((tc) => ({
          testCaseId: tc.id,
          description: tc.description,
          inputDisplay: tc.functionCall,
          expectedOutput: tc.expectedOutput,
          actualOutput: 'Timeout',
          passed: false,
          error: 'Execution timed out after 1500ms (possible infinite loop).',
        })),
        compileOrRuntimeError: 'Execution timed out after 1500ms (possible infinite loop).',
      });
    }, 1500);

    worker.onmessage = (event) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      const payload = event.data as {
        ok: boolean;
        error?: string;
        results: ExecutionTestResult[];
        stdout: string;
        executionMs: number;
      };

      if (!payload.ok) {
        resolve({
          passedAll: false,
          passedCount: 0,
          totalCount: testCases.length,
          stdout: payload.stdout || '',
          executionMs: payload.executionMs || 5,
          runtimeLabel: runtimeLabels[language],
          results: testCases.map((tc) => ({
            testCaseId: tc.id,
            description: tc.description,
            inputDisplay: tc.functionCall,
            expectedOutput: tc.expectedOutput,
            actualOutput: 'Error',
            passed: false,
            error: payload.error,
          })),
          compileOrRuntimeError: payload.error || 'Runtime error',
        });
        return;
      }

      const passedCount = payload.results.filter((r) => r.passed).length;
      resolve({
        passedAll: passedCount === testCases.length && testCases.length > 0,
        passedCount,
        totalCount: testCases.length,
        stdout: payload.stdout || '',
        executionMs: payload.executionMs || 4,
        runtimeLabel: runtimeLabels[language],
        results: payload.results,
      });
    };

    worker.onerror = (err) => {
      err.preventDefault();
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      cleanup();
      resolve({
        passedAll: false,
        passedCount: 0,
        totalCount: testCases.length,
        stdout: '',
        executionMs: 2,
        runtimeLabel: runtimeLabels[language],
        results: testCases.map((tc) => ({
          testCaseId: tc.id,
          description: tc.description,
          inputDisplay: tc.functionCall,
          expectedOutput: tc.expectedOutput,
          actualOutput: 'Syntax Error',
          passed: false,
          error: err.message || 'Syntax error in code',
        })),
        compileOrRuntimeError: err.message || 'Syntax error in code',
      });
    };

    worker.postMessage('run');
  });
}

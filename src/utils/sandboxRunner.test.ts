import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {
  compareOutputs,
  normalizeOutput,
  transpileCFamilySubset,
  transpileModernLanguageSubset,
  transpilePythonSubset,
} from './sandboxRunner';

test('normalizeOutput and compareOutputs handle primitives and JSON arrays cleanly', () => {
  assert.equal(normalizeOutput(true), 'true');
  assert.equal(normalizeOutput([1, 2, 3]), '[1,2,3]');
  assert.equal(compareOutputs('  Even  ', 'Even'), true);
  assert.equal(compareOutputs('[1, 2, 3]', '[1,2,3]'), true);
  assert.equal(compareOutputs('Odd', 'Even'), false);
});

test('transpilePythonSubset executes Python conditional and loop functions accurately', () => {
  const pythonCode = `
def checkNumber(n):
  if n % 2 == 0:
    return "Even"
  else:
    return "Odd"

def sumUpTo(n):
  total = 0
  for i in range(1, n + 1):
    total = total + i
  return total
`;
  const jsCode = transpilePythonSubset(pythonCode);
  const ctx: Record<string, unknown> = { console: { log: () => {} } };
  vm.runInNewContext(
    `${jsCode}\nthis.__out1 = checkNumber(4); this.__out2 = checkNumber(7); this.__out3 = sumUpTo(5);`,
    ctx
  );
  assert.equal(ctx.__out1, 'Even');
  assert.equal(ctx.__out2, 'Odd');
  assert.equal(ctx.__out3, 15);
});

test('transpileCFamilySubset evaluates basic C++ / Java / C# functions cleanly', () => {
  const cppCode = `
int maxOfTwo(int a, int b) {
  if (a > b) {
    return a;
  }
  return b;
}
`;
  const jsCode = transpileCFamilySubset(cppCode, 'cpp', 'maxOfTwo');
  const ctx: Record<string, unknown> = { console: { log: () => {} }, Math };
  vm.runInNewContext(`${jsCode}\nthis.__res = maxOfTwo(12, 29);`, ctx);
  assert.equal(ctx.__res, 29);

  const csharpCode = `
public class Solution {
  public static int addTwo(int a, int b) {
    return a + b;
  }
}
`;
  const csJs = transpileCFamilySubset(csharpCode, 'csharp', 'addTwo');
  const csCtx: Record<string, unknown> = { console: { log: () => {} }, Math };
  vm.runInNewContext(`${csJs}\nthis.__res = addTwo(8, 13);`, csCtx);
  assert.equal(csCtx.__res, 21);
});

test('transpileModernLanguageSubset executes TypeScript, Go, Rust, Kotlin, Swift, and Ruby', () => {
  const cases: Array<{ lang: 'typescript' | 'go' | 'rust' | 'kotlin' | 'swift' | 'ruby'; code: string }> = [
    {
      lang: 'typescript',
      code: `function addNumbers(a: number, b: number): number {\n  const sum: number = a + b;\n  return sum;\n}`,
    },
    {
      lang: 'go',
      code: `func addNumbers(a int, b int) int {\n  sum := a + b\n  return sum\n}`,
    },
    {
      lang: 'rust',
      code: `fn addNumbers(a: i32, b: i32) -> i32 {\n  let sum: i32 = a + b;\n  return sum;\n}`,
    },
    {
      lang: 'kotlin',
      code: `fun addNumbers(a: Int, b: Int): Int {\n  val sum = a + b\n  return sum\n}`,
    },
    {
      lang: 'swift',
      code: `func addNumbers(_ a: Int, _ b: Int) -> Int {\n  let sum = a + b\n  return sum\n}`,
    },
    {
      lang: 'ruby',
      code: `def addNumbers(a, b)\n  sum = a + b\n  return sum\nend`,
    },
  ];

  for (const c of cases) {
    const js = transpileModernLanguageSubset(c.code, c.lang, 'addNumbers');
    const ctx: Record<string, unknown> = { console: { log: () => {} } };
    vm.runInNewContext(`${js}\nthis.__res = addNumbers(7, 15);`, ctx);
    assert.equal(ctx.__res, 22, `Failed for ${c.lang}`);
  }
});

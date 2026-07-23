// Minimal test runner: loads each suite, aggregates pass/fail, sets exit code.
// jsdom's unimplemented window.scrollTo warning is harmless and silenced below.
const origErr = console.error;
console.error = (...a) => { if (String(a[0]).includes("Not implemented: Window's scrollTo")) return; origErr.apply(console, a); };

const SUITES = ['behavior', 'flow', 'edge', 'onboarding', 'naija'];

(async () => {
  let pass = 0, fail = 0;
  const failures = [];
  const t = {
    group(name) { process.stdout.write('\n  ' + name + '\n'); },
    ok(cond, msg) {
      if (cond) { pass++; process.stdout.write('    \u2713 ' + msg + '\n'); }
      else { fail++; failures.push(msg); process.stdout.write('    \u2717 FAIL: ' + msg + '\n'); }
    },
  };

  for (const name of SUITES) {
    process.stdout.write('\n=== ' + name + ' ===\n');
    try {
      const suite = require('./' + name + '.test.js');
      await suite(t);
    } catch (e) {
      fail++; failures.push(name + ' threw: ' + e.message);
      process.stdout.write('    \u2717 SUITE ERROR: ' + e.message + '\n');
    }
  }

  process.stdout.write('\n----------------------------------------\n');
  process.stdout.write('RESULT: ' + pass + ' passed, ' + fail + ' failed\n');
  if (fail) process.stdout.write('Failures:\n - ' + failures.join('\n - ') + '\n');
  process.exit(fail ? 1 : 0);
})();

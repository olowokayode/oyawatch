const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Brand — meta description contains Oya Watch');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content');
    t.ok(/Oya Watch/i.test(desc), 'meta description contains "Oya Watch"');
    t.ok(!/movie ?plug/i.test(doc.documentElement.innerHTML), 'no legacy "movie plug" branding');
    t.ok((doc.documentElement.innerHTML.match(/tmplug_v6/g) || []).length === 1, 'legacy key referenced once (migration only)');
  }

  t.group('Onboard renders correctly on fresh load');
  {
    const dom = await makeDom(); const doc = dom.window.document; await flush();
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'onboarding shown on fresh load');
    t.ok(/first things first/i.test(doc.getElementById('stepLabel').textContent), 'step 1 label correct');
    t.ok(doc.getElementById('nameInput'), 'name input rendered');
    t.ok(doc.getElementById('onboardNext').disabled, 'continue disabled before name');
    t.ok(!doc.querySelector('.platform-opt'), 'no platform options in onboarding');
  }

  t.group('Step 1 — name enables Continue');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'ada'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    t.ok(!doc.getElementById('onboardNext').disabled, 'Continue enabled after 3+ char name');
    inp.value = 'a'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    t.ok(doc.getElementById('onboardNext').disabled, 'Continue disabled for 1-char name');
  }

  t.group('Step 2 is avoid step, not platform');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'kemi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(/never watch/i.test(doc.getElementById('onboardHeadline').textContent), 'step 2 is the avoid step');
    t.ok(/kemi/i.test(doc.getElementById('stepLabel').textContent), 'name echoed in step 2 label');
    t.ok(!/\{name\}/.test(doc.getElementById('stepLabel').textContent), 'no leftover {name} token');
    t.ok(!doc.querySelector('.platform-opt'), 'no platform options in step 2');
  }

  t.group('Two-step onboarding completes to pick screen');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'ndidi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    const opts = doc.querySelectorAll('.option-btn');
    t.ok(opts.length >= 1, 'avoid options rendered in step 2');
    opts[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(!doc.getElementById('onboardNext').disabled, 'Continue enabled after picking avoid option');
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'pick screen shown after 2 steps');
    t.ok(A.state.profile.platform === 'netflix', 'platform hardcoded to netflix');
    t.ok(A.state.profile.name === 'Ndidi', 'name capitalised correctly');
    t.ok(dom.__errors.length === 0, 'zero runtime errors: ' + dom.__errors.slice(0, 2).join(' | '));
  }

  t.group('Skip goes straight to pick screen');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    doc.getElementById('skipLink').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'skip reaches pick screen');
  }

  t.group('Progress dots update per step');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const dotsAt = () => [...doc.querySelectorAll('.prog-dot')].map(d => d.className);
    const step1 = dotsAt();
    t.ok(step1.some(c => c.includes('active')), 'step 1 has active dot');
    const inp = doc.getElementById('nameInput');
    inp.value = 'yemi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    const step2 = dotsAt();
    t.ok(step2.some(c => c.includes('done')), 'step 1 dot marked done on step 2');
    t.ok(step2.filter(c => c.includes('active')).length === 1, 'exactly one active dot on step 2');
  }

  t.group('Legacy storage migration');
  {
    const dom = await makeDom({ legacy: { name: 'Legacy', platform: 'crunchyroll', avoid: 'I watch everything' } });
    const win = dom.window, doc = win.document, A = win.__app; await flush();
    t.ok(!win.__legacyErr, 'legacy key seeded without error');
    t.ok(A.state.profile && A.state.profile.name === 'Legacy', 'profile migrated from legacy key');
    t.ok(win.localStorage.getItem('oyawatch_v1'), 'profile stored under new key');
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'migrated user skips onboarding');
  }
};

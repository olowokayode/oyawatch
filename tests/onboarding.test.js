const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Brand integrity — no legacy naming');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content');
    t.ok(!/movie ?plug/i.test(desc), 'meta description has no "movie plug"');
    t.ok(/Oya Watch/.test(desc), 'meta description is on-brand');
    t.ok(!/movie ?plug|movieplug/i.test(doc.documentElement.innerHTML), 'no legacy "movie plug" branding anywhere');
    const tmp = (doc.documentElement.innerHTML.match(/tmplug_v6/g) || []).length;
    t.ok(tmp === 1, 'legacy key referenced once (migration only)');
  }

  t.group('Hero marquee present');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(doc.querySelector('.poster-marquee'), 'poster marquee hero present');
    t.ok(doc.querySelectorAll('.poster-chip').length >= 8, 'marquee has poster chips');
    t.ok(!doc.querySelector('.reel-strip'), 'old reel strip removed');
  }

  t.group('Netflix-only — no platform selector in onboarding');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'fresh load shows onboarding');
    // Step 1: name
    t.ok(/first things first/i.test(doc.getElementById('stepLabel').textContent), 'step 1 label correct');
    const inp = doc.getElementById('nameInput');
    inp.value = 'ada'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    t.ok(!doc.getElementById('onboardNext').disabled, 'Continue enabled after name');
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    // Step 2: avoid — no platform step
    const step2Head = doc.getElementById('onboardHeadline');
    t.ok(/never watch/i.test(step2Head.textContent), 'step 2 is the avoid step, not a platform step');
    t.ok(!doc.querySelector('.platform-opt'), 'no platform option buttons in onboarding');
  }

  t.group('Name echo in step 2');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'kemi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(/kemi/i.test(doc.getElementById('stepLabel').textContent), 'step 2 label echoes name');
    t.ok(!/\{name\}/.test(doc.getElementById('stepLabel').textContent), 'no leftover {name} token');
  }

  t.group('Two-step onboarding completes to pick screen');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'ndidi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    // Step 1 -> step 2
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    // Step 2: pick avoid option
    const opts = doc.querySelectorAll('.option-btn');
    t.ok(opts.length >= 1, 'avoid options rendered');
    opts[0].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    // Step 2 -> done
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'two-step onboarding reaches pick screen');
    t.ok(dom.window.__app.state.profile.platform === 'netflix', 'platform hardcoded to netflix');
    t.ok(dom.__errors.length === 0, 'zero runtime errors: ' + dom.__errors.slice(0,2).join(' | '));
  }

  t.group('Skip-setup goes straight to pick screen');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    doc.getElementById('skipLink').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'skip lands on pick screen');
  }

  t.group('Storage migration from legacy key');
  {
    const dom = await makeDom({ legacy: { name: 'Legacy', platform: 'crunchyroll', avoid: 'I watch everything' } });
    const win = dom.window, doc = win.document, A = win.__app; await flush();
    t.ok(!win.__legacyErr, 'legacy key seeding worked');
    t.ok(A.state.profile && A.state.profile.name === 'Legacy', 'existing profile migrated');
    t.ok(win.localStorage.getItem('oyawatch_v1'), 'profile under new key');
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'migrated user skips onboarding');
  }
};

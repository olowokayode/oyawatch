const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Legacy "MoviePlug" naming removed');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content');
    t.ok(!/movie ?plug/i.test(desc), 'meta description has no "movie plug"');
    t.ok(/Oya Watch/.test(desc), 'meta description is on-brand');
    t.ok(!/movie ?plug|movieplug/i.test(doc.documentElement.innerHTML), 'no legacy "movie plug" branding anywhere');
    const tmp = (doc.documentElement.innerHTML.match(/tmplug_v6/g) || []).length;
    t.ok(tmp === 1, 'legacy key referenced once (migration only), not active');
  }

  t.group('New hero visual (marquee replaces faint reel strip)');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(doc.querySelector('.poster-marquee'), 'poster marquee hero present');
    t.ok(doc.querySelectorAll('.poster-chip').length >= 8, 'marquee has poster chips (' + doc.querySelectorAll('.poster-chip').length + ')');
    t.ok(!doc.querySelector('.reel-strip'), 'old faint reel strip removed');
  }

  t.group('Onboarding voice: name echo + branded CTA');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'fresh load shows onboarding');
    t.ok(/first things first/i.test(doc.getElementById('stepLabel').textContent), 'step 1 label in new voice');
    const inp = doc.getElementById('nameInput'); inp.value = 'ada'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(/Ada/.test(doc.getElementById('stepLabel').textContent), 'step 2 greets user by name');
    t.ok(/where do you/i.test(doc.getElementById('onboardHeadline').textContent), 'step 2 headline in new voice');
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(/Oya\s*[\u2014-]\s*let/i.test(doc.getElementById('onboardNext').textContent), 'final step CTA is branded');
    t.ok(/Ada/.test(doc.getElementById('stepLabel').textContent), 'step 3 label also personalised');
  }

  t.group('Name echo absent gracefully when skipped');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.tempProfile = {}; A.renderOnboardStep(1);
    t.ok(!/\{name\}/.test(doc.getElementById('stepLabel').textContent), 'no leftover {name} token when name missing');
    t.ok(/Nice one/.test(doc.getElementById('stepLabel').textContent), 'label renders cleanly without a name');
  }

  t.group('Storage migration from legacy key (no data loss)');
  {
    const dom = await makeDom({ legacy: { name: 'Legacy', platform: 'crunchyroll', avoid: 'I watch everything' } });
    const win = dom.window, doc = win.document, A = win.__app; await flush();
    t.ok(!win.__legacyErr, 'legacy key seeding worked in test env');
    t.ok(A.state.profile && A.state.profile.name === 'Legacy', 'existing profile migrated from tmplug_v6');
    t.ok(A.state.profile.platform === 'crunchyroll', 'migrated platform preserved');
    t.ok(win.localStorage.getItem('oyawatch_v1'), 'profile now stored under new key');
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'migrated user skips onboarding -> pick screen');
  }

  t.group('No runtime errors across onboarding');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const inp = doc.getElementById('nameInput'); inp.value = 'ndidi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    for (let i = 0; i < 3; i++) { doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(); }
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'full onboarding completes to pick screen');
    t.ok(dom.__errors.length === 0, 'zero runtime errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 2).join(' | ') : ''));
  }
};

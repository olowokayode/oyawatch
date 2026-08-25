const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Meta — title and description');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(/Oya Watch/i.test(doc.title), 'title contains Oya Watch');
    const desc = doc.querySelector('meta[name="description"]').getAttribute('content');
    t.ok(/Netflix/.test(desc), 'meta description mentions Netflix');
    t.ok(!/movie ?plug/i.test(doc.documentElement.innerHTML), 'no legacy branding');
    t.ok((doc.documentElement.innerHTML.match(/tmplug_v6/g) || []).length === 1, 'legacy key referenced once only');
  }

  t.group('Onboarding — single screen, no wizard steps');
  {
    const dom = await makeDom(); const doc = dom.window.document; await flush();
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'onboarding shown on fresh load');
    t.ok(doc.getElementById('nameInput'), 'name input present');
    t.ok(doc.getElementById('avoidRow'), 'avoid chips present');
    t.ok(!doc.getElementById('stepLabel'), 'no step label (wizard removed)');
    t.ok(!doc.getElementById('progressRow'), 'no progress dots (wizard removed)');
    t.ok(!doc.querySelector('.platform-opt'), 'no platform options');
  }

  t.group('Onboarding — avoid chips present and selectable');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const chips = doc.querySelectorAll('#avoidRow .avoid-chip');
    t.ok(chips.length >= 3, '3 avoid chips rendered');
    const horror = [...chips].find(c => c.dataset.avoid && c.dataset.avoid.includes('Horror'));
    t.ok(horror, 'Horror chip exists');
    t.ok(!horror.dataset.avoid.includes('—'), 'no em dash in avoid chip');
    const def = [...chips].find(c => c.classList.contains('selected'));
    t.ok(def, 'one chip selected by default');
    t.ok(def.dataset.avoid === 'I watch everything', '"I watch everything" selected by default');
    horror.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(horror.classList.contains('selected'), 'Horror chip selectable');
    t.ok(!def.classList.contains('selected'), 'previous selection cleared');
  }

  t.group('Onboarding — name enables Let\'s watch button');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    const inp = doc.getElementById('nameInput'), nxt = doc.getElementById('onboardNext');
    t.ok(nxt.disabled, 'button disabled before name');
    inp.value = 'ada'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    t.ok(!nxt.disabled, 'button enabled after name');
    inp.value = 'a'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    t.ok(nxt.disabled, 'button disabled for 1-char name');
  }

  t.group('Onboarding — finishOnboard reaches pick screen');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'ndidi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'pick screen shown after submit');
    t.ok(A.state.profile.name === 'Ndidi', 'name capitalised and saved');
    t.ok(A.state.profile.platform === 'netflix', 'platform hardcoded to netflix');
    t.ok(dom.__errors.length === 0, 'zero errors: ' + dom.__errors[0]);
  }

  t.group('Onboarding — Skip goes to pick screen');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document; await flush();
    doc.getElementById('skipLink').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'skip reaches pick screen');
  }

  t.group('Onboarding — avoid saved in profile');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    const inp = doc.getElementById('nameInput');
    inp.value = 'kemi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    const horrorChip = [...doc.querySelectorAll('#avoidRow .avoid-chip')].find(c => c.dataset.avoid && c.dataset.avoid.includes('Horror'));
    if (horrorChip) horrorChip.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(A.state.profile.avoid && A.state.profile.avoid.includes('Horror'), 'avoid preference saved');
  }

  t.group('Onboarding — hero time-aware copy');
  {
    const dom = await makeDom(); const doc = dom.window.document; await flush();
    const heroTime = doc.getElementById('onboardHeroTime');
    t.ok(heroTime, 'onboardHeroTime element exists');
    const text = heroTime.textContent;
    const valid = ['Tonight,', 'This morning,', 'This afternoon,', 'This evening,'];
    t.ok(valid.some(v => text === v), `hero time text is time-aware: "${text}"`);
    t.ok(!text.includes('—'), 'no em dash in hero text');
  }

  t.group('Legacy storage migration');
  {
    const dom = await makeDom({ legacy: { name: 'Legacy', platform: 'crunchyroll', avoid: 'I watch everything' } });
    const win = dom.window, doc = win.document, A = win.__app; await flush();
    t.ok(A.state.profile && A.state.profile.name === 'Legacy', 'profile migrated');
    t.ok(win.localStorage.getItem('oyawatch_v1'), 'stored under new key');
    t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'migrated user skips onboarding');
  }
};

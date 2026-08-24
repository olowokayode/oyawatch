const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-US'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Full happy path: 2-step onboarding -> mood -> spin -> skip -> results');
  t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'fresh load shows onboarding');

  // Step 1: name
  const nameInput = doc.getElementById('nameInput');
  nameInput.value = 'chidi';
  nameInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  t.ok(!doc.getElementById('onboardNext').disabled, 'Continue enables after typing name');
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();

  // Step 2: avoid — pick an option
  const avoidOpts = doc.querySelectorAll('.option-btn');
  t.ok(avoidOpts.length >= 1, 'avoid options present in step 2');
  avoidOpts[2].dispatchEvent(new win.MouseEvent('click', { bubbles: true })); // "I watch everything"
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();

  t.ok(doc.getElementById('screen-pick').classList.contains('active'), '2-step onboarding completes to pick screen');
  t.ok(A.state.profile && A.state.profile.name === 'Chidi', 'profile saved with capitalized name');
  t.ok(A.state.profile.platform === 'netflix', 'platform hardcoded to netflix');

  // Mood selection
  const mood = doc.querySelector('#moviesGrid .mood-card[data-mood="Dey Play"]');
  mood.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(!doc.getElementById('spinBtn').disabled, 'mood select enables spin');
  t.ok(/Dey Play/.test(doc.getElementById('spinBtn').textContent), 'spin button shows selected mood');

  // Spin -> skip -> results
  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'), 'spin shows wheel screen');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush();
  t.ok(doc.getElementById('screen-results').classList.contains('active'), 'tap-to-skip jumps to results');

  const cards = doc.querySelectorAll('#picksList .pick-card');
  t.ok(cards.length >= 1, 'results rendered picks (' + cards.length + ')');
  t.ok(!/imdb/i.test(doc.getElementById('resultsScroll').innerHTML), 'no IMDb in results');
  t.ok(/★/.test(doc.getElementById('resultsScroll').innerHTML), 'star glyphs present');

  // results pill says Netflix
  t.ok(/Netflix/.test(doc.getElementById('resultsPill').textContent), 'results pill says Netflix');

  // Change mood
  doc.getElementById('btnAgain').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'), '"Change mood" returns to pick screen');

  // TV mode toggle
  doc.querySelector('.type-toggle-btn[data-mode="tv"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(doc.getElementById('tvGrid').style.display !== 'none', 'TV grid shows after toggle');
  t.ok(doc.getElementById('moviesGrid').style.display === 'none', 'Movies grid hides after toggle');
  t.ok(!doc.querySelector('#tvGrid .mood-card.selected'), 'TV mode starts with no selection');
  t.ok(doc.getElementById('spinBtn').disabled, 'spin disabled after mode switch');
};

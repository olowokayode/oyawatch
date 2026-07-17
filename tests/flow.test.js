const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-US'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Full happy path: onboarding -> mood -> spin -> skip -> results');
  t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'fresh load shows onboarding');

  const nameInput = doc.getElementById('nameInput');
  nameInput.value = 'chidi';
  nameInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  t.ok(!doc.getElementById('onboardNext').disabled, 'Continue enables after typing name');
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();

  t.ok(!!doc.getElementById('onboardNext'), 'platform step rendered a Continue button');
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();

  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();

  t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'onboarding completes -> pick screen');
  t.ok(A.state.profile && A.state.profile.name === 'Chidi', 'profile saved with capitalized name');

  const mood = doc.querySelector('#moviesGrid .mood-card[data-mood="Dey Play"]');
  mood.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(!doc.getElementById('spinBtn').disabled, 'mood select enables spin');

  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'), 'spin shows wheel screen');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush();
  t.ok(doc.getElementById('screen-results').classList.contains('active'), 'tap-to-skip jumps to results');
  const cards = doc.querySelectorAll('#picksList .pick-card');
  t.ok(cards.length >= 1, 'results rendered picks (' + cards.length + ')');
  t.ok(!/imdb/i.test(doc.getElementById('resultsScroll').innerHTML), 'no IMDb in end-to-end results');
  t.ok(/\u2605/.test(doc.getElementById('resultsScroll').innerHTML), 'star glyphs present in results');

  doc.getElementById('btnAgain').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'), '"Change mood" returns to pick screen');
};

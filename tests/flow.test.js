const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-US'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Full happy path: onboard → mood reel → spin → skip → swipe stack');

  t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'starts on onboarding');

  // Single-screen onboarding
  const inp = doc.getElementById('nameInput');
  inp.value = 'chidi'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
  t.ok(!doc.getElementById('onboardNext').disabled, 'Let\'s watch enabled after name');
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'pick screen after single-screen onboard');
  t.ok(A.state.profile.name === 'Chidi', 'name saved');
  t.ok(A.state.profile.platform === 'netflix', 'platform = netflix');

  // Mood reel selection
  t.ok(doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA hidden before mood select');
  const moodPanel = doc.querySelector('#moviesReel .mood-panel[data-mood="Dey Play"]');
  t.ok(moodPanel, 'Dey Play panel exists in reel');
  moodPanel.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(!doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA appears after mood select');
  t.ok(doc.getElementById('spinBtnText').textContent === 'Dey Play', 'spin button shows mood name');
  t.ok(moodPanel.classList.contains('selected'), 'panel has selected class');
  t.ok(doc.querySelector('.mood-reel.has-sel'), 'reel has has-sel class');

  // Spin → skip → results
  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'), 'wheel shown');
  t.ok(doc.getElementById('wheelEyebrow').textContent === 'DEY PLAY', 'wheel eyebrow shows mood in uppercase');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(6);
  t.ok(doc.getElementById('screen-results').classList.contains('active'), 'skip reaches results');

  // Results
  await flush(8);
  const cards = doc.querySelectorAll('.swipe-card');
  t.ok(cards.length >= 1, 'swipe cards rendered');
  t.ok(!/imdb/i.test(doc.getElementById('swipeCardWrap').innerHTML), 'no IMDb in results');
  t.ok(/Netflix/.test(doc.getElementById('resultsMoodPill').textContent), 'mood pill says Netflix');
  t.ok(!doc.getElementById('resultsHeadline'), 'no separate results headline');

  // Footer buttons
  t.ok(doc.getElementById('btnAgain').textContent === 'Moods', '"Moods" not "Change mood"');
  t.ok(doc.getElementById('btnRespin').textContent.includes('New picks'), '"New picks" not "Spin again"');

  // Moods button → pick screen
  doc.getElementById('btnAgain').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'Moods returns to pick screen');
  t.ok(doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA hidden after reset');

  // Series toggle
  doc.querySelector('.type-btn[data-mode="tv"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(doc.getElementById('tvReel').style.display !== 'none', 'TV reel visible');
  t.ok(doc.getElementById('moviesReel').style.display === 'none', 'movies reel hidden');
  t.ok(doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA hidden after mode switch');

  // Respin from results
  doc.querySelector('.mood-panel[data-mood="Binge It"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  A.state.fetchingResults = false;
  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'), 'wheel shown on respin');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(6);
  t.ok(doc.getElementById('screen-results').classList.contains('active'), 'respin delivers results');

  t.group('Zero errors through full flow');
  t.ok(dom.__errors.length === 0, 'no errors' + (dom.__errors.length ? ': ' + dom.__errors[0] : ''));
};

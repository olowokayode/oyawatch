const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-US'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Full happy path: onboard → mood → spin → skip → swipe stack');

  // Onboarding
  t.ok(doc.getElementById('screen-onboard').classList.contains('active'), 'starts on onboarding');
  const nameInput = doc.getElementById('nameInput');
  nameInput.value = 'chidi';
  nameInput.dispatchEvent(new win.Event('input', { bubbles: true }));
  t.ok(!doc.getElementById('onboardNext').disabled, 'Continue enabled after name');
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();

  // Step 2
  const avoidOpts = doc.querySelectorAll('.option-btn');
  t.ok(avoidOpts.length >= 1, 'avoid options shown in step 2');
  avoidOpts[2].dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  doc.getElementById('onboardNext').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'pick screen after 2 steps');
  t.ok(A.state.profile.name === 'Chidi', 'name capitalised');
  t.ok(A.state.profile.platform === 'netflix', 'platform = netflix');

  // Mood select
  const moodCard = doc.querySelector('#moviesGrid .mood-card[data-mood="Dey Play"]');
  moodCard.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(!doc.getElementById('spinBtn').disabled, 'spin enabled after mood select');
  t.ok(/Dey Play/.test(doc.getElementById('spinBtnText').textContent), 'spin button shows mood');
  t.ok(doc.getElementById('spinBtnArrow').style.display !== 'none', 'arrow shown after mood select');

  // Spin → skip → results
  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'), 'wheel shown after spin');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  await flush(2);
  t.ok(doc.getElementById('screen-results').classList.contains('active'), 'tap-to-skip reaches results');

  // Swipe stack
  await flush(4);
  const cards = doc.querySelectorAll('.swipe-card');
  t.ok(cards.length >= 1, 'swipe cards rendered (' + cards.length + ')');
  t.ok(!/imdb/i.test(doc.getElementById('swipeCardWrap').innerHTML), 'no IMDb in results');
  t.ok(/Netflix/.test(doc.getElementById('resultsMoodPill').textContent), 'mood pill says Netflix');

  // TV mode toggle
  doc.querySelector('.type-btn[data-mode="tv"]').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  t.ok(doc.getElementById('tvGrid').style.display !== 'none', 'TV grid visible after toggle');
  t.ok(doc.getElementById('moviesGrid').style.display === 'none', 'movies grid hidden after toggle');
  t.ok(doc.getElementById('spinBtn').disabled, 'spin disabled after mode switch');
  t.ok(!doc.querySelector('#tvGrid .mood-card.selected'), 'TV grid starts with no selection');

  // Change mood
  doc.getElementById('btnAgain').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'), 'Change mood returns to pick screen');

  // Respin
  const moodCard2 = doc.querySelector('#moviesGrid .mood-card[data-mood="Vawulence"]');
  moodCard2.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
  A.state.fetchingResults = false;
  doc.getElementById('btnRespin').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'), 'Spin again re-spins the wheel');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush(2);
  t.ok(doc.getElementById('screen-results').classList.contains('active'), 'respin delivers results');

  t.group('Zero runtime errors through full flow');
  t.ok(dom.__errors.length === 0, 'no errors' + (dom.__errors.length ? ': ' + dom.__errors[0] : ''));
};

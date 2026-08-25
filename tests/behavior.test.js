const { makeDom, flush, deferredVideos } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-NG'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  t.group('Region resolution');
  t.ok(A.state.region === 'NG', "region 'NG' from ['en-NG']");

  t.group('Time copy system');
  {
    const period = A.getTimePeriod();
    t.ok(['morning','afternoon','evening','night'].includes(period), 'valid time period: ' + period);
    const copy = A.tc();
    t.ok(copy.hero && copy.cardBadge && copy.watchlistTitle && copy.sharePrefix, 'tc() returns all keys');
    t.ok(!copy.hero.includes('—'), 'no em dash in time copy');
    t.ok(!copy.cardBadge.includes('—'), 'no em dash in card badge');
  }

  t.group('Verdict copy — benefit-led');
  {
    t.ok(A.getVerdict(9.2) === 'A film people rewatch.', '9.2 → rewatch');
    t.ok(A.getVerdict(8.5) === 'Stays with you.', '8.5 → stays');
    t.ok(A.getVerdict(7.1) === 'Worth the night.', '7.1 → worth');
    t.ok(A.getVerdict(6.2) === 'A gamble. Could be good.', '6.2 → gamble');
    t.ok(A.getVerdict(0) === 'A gamble. Could be good.', '0 → gamble');
  }

  t.group('No em dashes in visible UI text');
  {
    const uiEls = [...doc.querySelectorAll('button, a, label, span, h1, h2, h3, p, div.sheet-title, div.wl-title, div.alldone-title, div.error-title')];
    const uiText = uiEls.map(el => el.textContent).join(' ');
    t.ok(!uiText.includes('—'), 'no em dashes in UI elements');
    t.ok(!doc.documentElement.innerHTML.includes('&mdash;'), 'no &mdash; entity in HTML');
  }

  t.group('Netflix-only — no platform picker');
  {
    t.ok(!doc.querySelector('.platform-opt'), 'no platform-opt element');
    t.ok(!doc.getElementById('platformPillBtn'), 'no platformPillBtn');
    t.ok(doc.querySelector('.netflix-pill'), 'Netflix pill visible');
  }

  t.group('Settings accessible via visible button');
  {
    t.ok(doc.getElementById('settingsBtn'), 'settings button present');
    doc.getElementById('settingsBtn').dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await flush();
    t.ok(doc.getElementById('settingsOverlay').classList.contains('active'), 'settings sheet opens');
    t.ok(doc.querySelector('.sheet-title').textContent === 'Preferences', 'title is "Preferences" not "Your settings"');
    t.ok(!doc.querySelector('.sheet-sub'), 'no sub-copy in settings sheet');
    A.closeSettings();
  }

  t.group('Settings — no em dashes in choices');
  {
    const choices = [...doc.querySelectorAll('#setAvoid .sheet-choice')];
    t.ok(choices.length >= 3, '3 avoid choices');
    choices.forEach(c => {
      t.ok(!c.textContent.includes('—'), `no em dash in: "${c.textContent.trim()}"`);
    });
    t.ok(choices.some(c => c.textContent.includes('Horror. Hard no.')), 'period instead of em dash in horror option');
  }

  t.group('Mood reel — full-width panels, no grid');
  {
    t.ok(!doc.querySelector('.mood-grid'), 'no .mood-grid (replaced by reel)');
    t.ok(doc.querySelector('.mood-reel'), '.mood-reel present');
    t.ok(doc.querySelectorAll('.mood-panel').length >= 8, 'at least 8 mood panels');
    t.ok(!doc.querySelector('.card-pill'), 'no frosted pill labels on cards');
    t.ok(!doc.querySelector('.card-check'), 'no card check circles');
    t.ok(!doc.querySelector('.card-desc'), 'no 9px card descriptions');
    t.ok(!doc.querySelector('.card-peek'), 'long-press peek removed');
  }

  t.group('Mood panel selection — spin button appears');
  {
    const panel = doc.querySelector('.mood-panel[data-mood="No Wahala"]');
    t.ok(panel, 'No Wahala panel exists');
    t.ok(doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA hidden before selection');
    panel.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    t.ok(!doc.getElementById('stickyCta').classList.contains('hidden'), 'CTA appears after selection');
    t.ok(doc.getElementById('spinBtnText').textContent === 'No Wahala', 'spin button shows mood name');
    t.ok(A.state.selectedMood === 'No Wahala', 'state.selectedMood set');
  }

  t.group('Series tab label (not TV Shows)');
  {
    const tabs = [...doc.querySelectorAll('.type-btn')];
    t.ok(tabs.some(b => b.textContent === 'Series'), '"Series" tab present');
    t.ok(!tabs.some(b => b.textContent === 'TV Shows'), 'no "TV Shows" tab');
  }

  t.group('Search go button — arrow not "Go"');
  {
    const go = doc.getElementById('similarGo');
    t.ok(go, 'search go button exists');
    t.ok(!go.textContent.trim().includes('Go'), 'go button has no "Go" text');
    t.ok(go.querySelector('svg'), 'go button has SVG arrow');
  }

  t.group('No "Or pick a mood" label');
  {
    t.ok(!doc.querySelector('.mood-label'), 'no .mood-label element');
    t.ok(!doc.body.innerHTML.includes('Or pick a mood'), 'no "Or pick a mood" text');
  }

  t.group('Surprise button present');
  {
    t.ok(doc.getElementById('surpriseBtn'), 'surprise button in movies reel');
    t.ok(doc.getElementById('surpriseBtnTV'), 'surprise button in TV reel');
    t.ok(doc.querySelector('.mood-panel-surprise-text').textContent === 'Feeling lucky?', 'correct surprise copy');
  }

  t.group('fetchTMDB — Netflix provider always id=8');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.state.currentMode = 'movies';
    A.state.selectedMood = 'No Wahala';
    A.state.selectedCard = doc.querySelector('.mood-panel[data-mood="No Wahala"]');
    win.__fetches = [];
    await A.fetchTMDB();
    t.ok(win.__fetches.some(u => u.includes('with_watch_providers=8')), 'Netflix provider filter applied');
    t.ok(!win.__fetches.some(u => u.includes('with_watch_providers=283')), 'no Crunchyroll provider');
  }

  t.group('fetchTMDB — avoid horror (non-conflicting mood)');
  {
    A.state.profile.avoid = 'Horror. Hard no.';
    A.state.selectedMood = 'Dey Play';
    A.state.selectedCard = doc.querySelector('.mood-panel[data-mood="Dey Play"]');
    win.__fetches = [];
    await A.fetchTMDB();
    t.ok(win.__fetches.filter(u => u.includes('/discover/')).some(u => u.includes('without_genres=27')), 'horror excluded from Dey Play');
  }

  t.group('TV mode hits /discover/tv');
  {
    A.state.currentMode = 'tv';
    A.state.selectedMood = 'Binge It';
    A.state.selectedCard = doc.querySelector('.mood-panel[data-mood="Binge It"]');
    win.__fetches = [];
    const pool = await A.fetchTMDB();
    t.ok(win.__fetches.some(u => u.includes('/discover/tv')), 'queries /discover/tv');
    t.ok(!win.__fetches.some(u => u.includes('/discover/movie')), 'no /discover/movie in TV mode');
    t.ok(pool.length > 0, 'TV mode returns picks');
    A.state.currentMode = 'movies';
  }

  t.group('Swipe stack renders correctly');
  {
    A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
    A.state.pickIdx = 0;
    const picks = Array.from({ length: 5 }, (_, i) => ({ id: 200 + i, title: 'Film ' + i, overview: 'Great film ' + i + '. Worth your night.', vote_average: 7.8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }));
    A.state.allPicks = picks;
    A.renderSwipeStack(); await flush();
    const cards = doc.querySelectorAll('.swipe-card');
    t.ok(cards.length >= 1 && cards.length <= 4, `stack has ${cards.length} cards (1-4)`);
    t.ok(cards[0].classList.contains('swipe-card-nth-1'), 'top card is nth-1');
  }

  t.group('Swipe card — verdict shown, no star glyphs, no /10 suffix removed');
  {
    A.state.allPicks = [{ id: 500, title: 'Test', overview: 'A great film.', vote_average: 8.5, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    const html = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(/Stays with you/.test(html), 'verdict shown');
    t.ok(!/★|☆/.test(html), 'no star glyphs');
    t.ok(!/imdb/i.test(html), 'no IMDb reference');
    t.ok(/8\.5/.test(html), 'score shown');
  }

  t.group('Swipe card — action buttons are icon-only');
  {
    const html = doc.getElementById('swipeCardWrap').innerHTML;
    t.ok(!/<button[^>]*sc-trailer[^>]*>[^<]*Trailer/.test(html), 'trailer button has no text label');
    t.ok(!/<button[^>]*sc-share[^>]*>[^<]*Share/.test(html), 'share button has no text label');
    t.ok(!/<button[^>]*sc-save[^>]*>[^<]*Save/.test(html), 'save button has no text label');
  }

  t.group('Watch button states');
  {
    A.state.allPicks = [{ id: 102, title: 'OnNetflix', overview: 'On Netflix.', vote_average: 8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush(8);
    const btn = doc.querySelector('.sc-watch-btn');
    t.ok(btn && /Watch on Netflix/.test(btn.textContent), 'verified → Watch on Netflix');
    t.ok(!btn.classList.contains('checking'), 'verified clears checking state');
  }

  t.group('"Where to watch" fallback (no em dash)');
  {
    A.state.allPicks = [{ id: 101, title: 'NotHere', overview: 'Elsewhere.', vote_average: 8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: false }];
    A.state.pickIdx = 0;
    win.__fetches = [];
    A.renderSwipeStack(); await flush(8);
    const btn = doc.querySelector('.sc-watch-btn');
    if (btn && btn.classList.contains('elsewhere')) {
      t.ok(!btn.textContent.includes('—'), 'no em dash in fallback button text');
      t.ok(/Where to watch/.test(btn.textContent), 'fallback says "Where to watch"');
    } else { t.ok(true, 'watch state still resolving'); }
  }

  t.group('Watchlist — add, dedupe, badge');
  {
    A.state.watchlist = [];
    const pick = { id: 999, title: 'SaveMe', mediaType: 'movie', poster_path: null, release_date: '2022-01-01' };
    A.addToWatchlist(pick); A.addToWatchlist(pick);
    t.ok(A.state.watchlist.length === 1, 'deduplication works');
    t.ok(A.loadWatchlist().some(w => w.id === 999), 'persisted to localStorage');
    t.ok(doc.getElementById('wlBadge').classList.contains('visible'), 'badge visible');
  }

  t.group('iOS-safe trailer open');
  {
    const dv = deferredVideos();
    win.__deferredVideos = dv.promise;
    A.state.allPicks = [{ id: 300, title: 'Trailer', overview: 'Test.', vote_average: 8, vote_count: 400, poster_path: null, mediaType: 'movie', verified: true }];
    A.state.pickIdx = 0;
    A.renderSwipeStack(); await flush();
    win.__openCalls = [];
    const btn = doc.querySelector('.sc-trailer');
    if (btn) {
      btn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
      t.ok(win.__openCalls.length === 1 && win.__openCalls[0][0] === 'about:blank', 'opens about:blank synchronously');
      dv.resolve(); await flush();
      t.ok(win.__lastWin && /youtube\.com\/watch\?v=zzz/.test(win.__lastWin.location.href), 'redirected to YouTube');
    } else { t.ok(false, 'trailer button not found'); }
    win.__deferredVideos = null;
  }

  t.group('Curtain copy — no "Your picks are ready"');
  {
    const html = doc.documentElement.innerHTML;
    t.ok(!html.includes('your picks are ready'), 'old curtain copy removed');
    t.ok(doc.getElementById('curtainMsg'), 'curtain msg element exists');
  }

  t.group('Results header — one line, no separate headline');
  {
    t.ok(!doc.getElementById('resultsHeadline'), 'resultsHeadline removed');
    t.ok(doc.getElementById('resultsMoodPill'), 'mood pill present');
    t.ok(doc.getElementById('resultsWordmark'), 'logotype present');
    t.ok(doc.querySelector('.results-header'), 'results header exists');
  }

  t.group('Share popup is a bottom sheet');
  {
    A.showSharePopup(); await flush();
    const ov = doc.getElementById('shareOverlay');
    t.ok(ov.classList.contains('active'), 'share sheet opens');
    t.ok(ov.querySelector('.share-sheet'), 'uses .share-sheet (bottom sheet class)');
    t.ok(!ov.querySelector('.share-popup'), '.share-popup (modal) not used');
    const hl = doc.getElementById('shareHeadline');
    t.ok(hl && (hl.textContent.includes('Watching with') || hl.textContent.includes('Share')), 'correct headline variant');
    const sb = doc.getElementById('shareSub');
    t.ok(sb && (sb.textContent.includes('terrible') || sb.textContent.includes('sorted')), 'share sub has personality copy');
    A.hideSharePopup();
  }

  t.group('"Copy" not "COPY" in share sheet');
  {
    t.ok(doc.getElementById('shareLinkCopy').textContent === 'Copy', '"Copy" not "COPY"');
  }

  t.group('Zero runtime errors');
  t.ok(dom.__errors.length === 0, 'no errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 2).join(' | ') : ''));
};

const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  const dom = await makeDom({ languages: ['en-US'] });
  const win = dom.window, doc = win.document, A = win.__app;
  await flush();

  A.state.profile = { name: 'Ada', platform: 'netflix', avoid: 'I watch everything' };
  A.applyPlatformFromProfile();
  A.initPickScreen();
  await flush();

  t.group('YouTube is a real, selectable platform everywhere Netflix/Crunchyroll are');
  {
    t.ok(!!A.PLATFORMS.youtube, 'PLATFORMS has a youtube entry');
    t.ok(A.PLATFORMS.youtube.id === 192, 'youtube entry uses TMDB\'s real provider id (192)');

    // Onboarding platform step
    A.state.tempProfile = {}; A.state.onboardStep = 1; A.renderOnboardStep(1); await flush();
    const onboardOpts = [...doc.querySelectorAll('.platform-opt')].map((o) => o.dataset.pkey);
    t.ok(onboardOpts.includes('youtube'), 'onboarding platform step includes youtube (' + onboardOpts.join(',') + ')');
    t.ok(/YouTube/.test(doc.querySelector('.platform-opt[data-pkey="youtube"] .platform-opt-name').textContent), 'onboarding shows YouTube name');
    t.ok(/Naija/.test(doc.querySelector('.platform-opt[data-pkey="youtube"] .platform-opt-hint').textContent), 'onboarding hint clarifies it\'s for Naija Movies');

    // Settings sheet
    A.openSettings(); await flush();
    const settingsOpts = [...doc.querySelectorAll('#setPlatform .sheet-choice')].map((o) => o.dataset.pkey);
    t.ok(settingsOpts.includes('youtube'), 'Settings platform picker includes youtube (' + settingsOpts.join(',') + ')');
    A.closeSettings();
  }

  t.group('Toggling to Naija Movies switches the grid and chrome');
  {
    const naijaBtn = doc.querySelector('.type-toggle-btn[data-mode="naija"]');
    t.ok(!!naijaBtn, 'Naija toggle button exists');
    naijaBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await flush();

    t.ok(doc.getElementById('naijaGrid').style.display === 'grid', 'naijaGrid now visible');
    t.ok(doc.getElementById('moviesGrid').style.display === 'none', 'moviesGrid hidden');
    t.ok(naijaBtn.classList.contains('active'), 'Naija toggle marked active');
    t.ok(/YouTube/.test(doc.getElementById('platformPillBtn').textContent), 'pill switches to YouTube immediately (no stale label)');
    t.ok(/Nigerian movie/.test(doc.getElementById('similarInput').placeholder), 'similar-search placeholder adapts to Naija mode');
    t.ok(A.state.currentMode === 'naija', 'state.currentMode updated');
  }

  t.group('Naija mood cards use plain, standard genre names — nothing invented or stereotyping');
  {
    const cards = [...doc.querySelectorAll('#naijaGrid .mood-card')];
    t.ok(cards.length === 8, 'eight Naija mood cards (' + cards.length + ')');
    const moods = cards.map((c) => c.dataset.mood);
    ['Romance', 'Comedy', 'Drama', 'Family', 'Epic', 'Action', 'Crime', 'Thriller'].forEach((g) => {
      t.ok(moods.includes(g), '"' + g + '" present as a plain genre-named mood');
    });
    t.ok(!moods.some((m) => /Ritual|Yahoo|Owambe|Wahala|Juju|Diaspora|Kingdom Tales/i.test(m)), 'no invented/slang/stereotyping mood names');
  }

  t.group('Naija spin -> YouTube watch button, no provider check, NG origin filter');
  {
    const card = doc.querySelector('#naijaGrid .mood-card[data-mood="Romance"]');
    A.state.selectedMood = card.dataset.mood;
    A.state.selectedCard = card;
    A.state.fetchingResults = false;
    win.__fetches = [];
    A.startFlow();
    await flush(2);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await flush(3);

    t.ok(doc.getElementById('screen-results').classList.contains('active'), 'naija spin reaches results');
    const cards = doc.querySelectorAll('#picksList .pick-card');
    t.ok(cards.length >= 1, 'naija results rendered picks (' + cards.length + ')');

    const discoverCalls = win.__fetches.filter((u) => u.includes('/discover/'));
    t.ok(discoverCalls.length > 0, 'discover was called');
    t.ok(discoverCalls.every((u) => u.includes('with_origin_country=NG')), 'every naija discover call filters with_origin_country=NG');
    t.ok(!discoverCalls.some((u) => u.includes('with_watch_providers')), 'naija discover never filters by watch provider');
    t.ok(discoverCalls.every((u) => { const p = (u.match(/[?&]page=(\d+)/) || [])[1]; return p === '1' || p === '2'; }), 'naija discover only ever requests page 1 or 2, never a random higher page (' + discoverCalls.map((u) => (u.match(/[?&]page=(\d+)/) || [])[1]).join(',') + ')');

    const providerCalls = win.__fetches.filter((u) => u.includes('/watch/providers'));
    t.ok(providerCalls.length === 0, 'naija cards never call /watch/providers (nothing to verify)');

    const label = doc.getElementById('card0').querySelector('.watch-label').textContent;
    t.ok(/Watch on YouTube/.test(label), 'watch button reads "Watch on YouTube" (' + label + ')');
    const href = doc.getElementById('card0').querySelector('.watch-btn').getAttribute('href');
    t.ok(href.startsWith('https://www.youtube.com/results?search_query='), 'watch button links to a real YouTube search (' + href + ')');
    t.ok(/full\+movie/.test(href) || /full%20movie/.test(href), 'YouTube search is biased toward full movies, not clips/trailers');
  }

  t.group('REGRESSION: Naija spin still returns results on a thin NG-origin catalog (the reported bug)');
  {
    // Simulates real-world TMDB behaviour: with_origin_country=NG + a specific
    // genre is a small catalog, so anything past page 1 legitimately comes
    // back empty. Before the fix, fetchTMDB randomly requested pages up to 6
    // and could easily strike out completely on a spin.
    const realFetch = win.fetch;
    const mkRes = (obj) => ({ ok: true, json: () => Promise.resolve(obj) });
    win.fetch = (url) => {
      const u = String(url);
      win.__fetches.push(u);
      if (u.includes('/discover/')) {
        const page = (u.match(/[?&]page=(\d+)/) || [])[1] || '1';
        if (page !== '1') return Promise.resolve(mkRes({ results: [] })); // thin catalog: nothing past page 1
        const results = [0, 1, 2].map((i) => ({
          id: 8000 + i, title: 'Thin Catalog Movie ' + i,
          overview: 'A real Nigerian movie used to test the thin-catalog fallback. It should still render fine here.',
          vote_average: 7, vote_count: 20, poster_path: '/x' + i + '.jpg', release_date: '2024-01-01', popularity: 40 - i,
        }));
        return Promise.resolve(mkRes({ results }));
      }
      return realFetch(url);
    };

    const card = doc.querySelector('#naijaGrid .mood-card[data-mood="Crime"]');
    A.state.selectedCard = card; A.state.selectedMood = card.dataset.mood;
    const picks = await A.fetchTMDB();
    t.ok(picks.length > 0, 'fetchTMDB still returns picks when only page 1 has data (' + picks.length + ' picks)');

    win.fetch = realFetch;
  }

  t.group('REGRESSION: Naija widens past the genre filter when even page 1 is nearly empty');
  {
    const realFetch = win.fetch;
    const mkRes = (obj) => ({ ok: true, json: () => Promise.resolve(obj) });
    let wideningCallMade = false;
    win.fetch = (url) => {
      const u = String(url);
      win.__fetches.push(u);
      if (u.includes('/discover/')) {
        const hasGenre = u.includes('with_genres=');
        if (!hasGenre) {
          // The widen step drops with_genres entirely — confirm it's reached.
          wideningCallMade = true;
          const results = [{ id: 9001, title: 'Popular Nigerian Movie', overview: 'A broadly popular Nigerian title returned once the mood genre filter is dropped as a last resort.', vote_average: 7, vote_count: 5, poster_path: '/y.jpg', release_date: '2023-01-01', popularity: 90 }];
          return Promise.resolve(mkRes({ results }));
        }
        return Promise.resolve(mkRes({ results: [] })); // genre-specific queries come back empty
      }
      return realFetch(url);
    };

    const card = doc.querySelector('#naijaGrid .mood-card[data-mood="Epic"]');
    A.state.selectedCard = card; A.state.selectedMood = card.dataset.mood;
    const picks = await A.fetchTMDB();
    t.ok(wideningCallMade, 'a genre-dropping widen query was made once the genre-specific pool was empty');
    t.ok(picks.length > 0, 'widen fallback still returns picks instead of nothing (' + picks.length + ' picks)');

    win.fetch = realFetch;
  }

  t.group('Toggling back to Movies restores Netflix chrome');
  {
    const moviesBtn = doc.querySelector('.type-toggle-btn[data-mode="movies"]');
    moviesBtn.dispatchEvent(new win.MouseEvent('click', { bubbles: true }));
    await flush();
    t.ok(doc.getElementById('moviesGrid').style.display === 'grid', 'moviesGrid restored');
    t.ok(doc.getElementById('naijaGrid').style.display === 'none', 'naijaGrid hidden again');
    t.ok(/Netflix/.test(doc.getElementById('platformPillBtn').textContent), 'pill restores to Netflix');
    t.ok(doc.getElementById('similarInput').placeholder === 'Type a movie you love...', 'placeholder restores');
  }

  t.group('No silent runtime errors across the Naija flow');
  t.ok(dom.__errors.length === 0, 'zero window/console errors' + (dom.__errors.length ? ': ' + dom.__errors.slice(0, 3).join(' | ') : ''));
};

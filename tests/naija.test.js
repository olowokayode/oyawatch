// Naija/anime/YouTube modes have been removed. This suite validates their full removal.
const { makeDom, flush } = require('./helpers');

module.exports = async (t) => {
  t.group('Removed platforms — Crunchyroll and YouTube absent');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!/crunchyroll/i.test(doc.documentElement.innerHTML), 'no Crunchyroll reference in DOM');
    t.ok(!/youtube.*platform/i.test(doc.documentElement.innerHTML), 'no YouTube as a platform in DOM');
    t.ok(!doc.querySelector('[data-pkey="crunchyroll"]'), 'no crunchyroll data attribute');
    t.ok(!doc.querySelector('[data-pkey="youtube"]'), 'no youtube data attribute');
  }

  t.group('Removed modes — anime and naija absent');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    t.ok(!doc.querySelector('[data-anime]'), 'no anime cards');
    t.ok(!doc.querySelector('[data-naija]'), 'no naija cards');
    t.ok(!/anime/i.test(doc.getElementById('screen-pick').innerHTML), 'no anime text on pick screen');
    t.ok(!/naija/i.test(doc.getElementById('screen-pick').innerHTML), 'no naija mode text on pick screen');
  }

  t.group('Type toggle: only Movies and TV');
  {
    const dom = await makeDom(); const doc = dom.window.document;
    const toggleBtns = doc.querySelectorAll('.type-toggle-btn');
    t.ok(toggleBtns.length === 2, 'exactly 2 type toggle buttons');
    const modes = [...toggleBtns].map(b => b.dataset.mode);
    t.ok(modes.includes('movies'), 'movies tab present');
    t.ok(modes.includes('tv'), 'tv tab present');
    t.ok(!modes.includes('anime'), 'no anime tab');
    t.ok(!modes.includes('naija'), 'no naija tab');
  }

  t.group('Settings: no platform selector');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.profile = { name: 'Test', platform: 'netflix' };
    A.openSettings();
    t.ok(!doc.getElementById('setPlatform'), 'no setPlatform section in settings');
    t.ok(!doc.querySelector('#settingsSheet .platform-opt'), 'no platform options in settings sheet');
    t.ok(doc.getElementById('setAvoid'), 'avoid section still present');
  }

  t.group('No runtime errors with TV picks');
  {
    const dom = await makeDom(); const win = dom.window, doc = win.document, A = win.__app; await flush();
    A.state.profile = { name: 'Ada', platform: 'netflix' };
    A.state.currentMode = 'tv';
    const tvCard = doc.querySelector('#tvGrid .mood-card');
    t.ok(!!tvCard, 'at least one TV mood card exists');
    A.state.selectedMood = tvCard.dataset.mood;
    A.state.selectedCard = tvCard;
    win.__fetches = []; const pool = await A.fetchTMDB();
    t.ok(pool.length > 0, 'TV fetchTMDB returns results');
    t.ok(win.__fetches.some(u => u.includes('/discover/tv')), 'TV mode queries /discover/tv');
    t.ok(dom.__errors.length === 0, 'no errors during TV fetch');
  }
};

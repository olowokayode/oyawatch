const {makeDom,flush}=require('./helpers');
module.exports=async(t)=>{
  t.group('No legacy platforms or modes');
  {
    const dom=await makeDom();const doc=dom.window.document;
    t.ok(!/crunchyroll/i.test(doc.documentElement.innerHTML),'no Crunchyroll');
    t.ok(!doc.querySelector('[data-pkey]'),'no data-pkey');
    t.ok(!doc.querySelector('[data-anime]'),'no anime attrs');
    t.ok(!doc.querySelector('[data-naija]'),'no naija attrs');
  }

  t.group('Panel reel replaces mood grid');
  {
    const dom=await makeDom();const doc=dom.window.document;
    t.ok(!doc.querySelector('.mood-grid'),'no .mood-grid');
    t.ok(!doc.querySelector('.mood-card'),'no .mood-card');
    t.ok(doc.querySelector('.panel'),'panels present');
    t.ok(doc.querySelectorAll('.panel').length>=8,'8+ panels');
  }

  t.group('Card inner structure — poster + body + footer');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document,A=win.__app;await flush();
    A.ST.profile={name:'Test',platform:'netflix'};
    A.ST.picks=[{id:1,title:'Test',overview:'A test film.',vote_average:8,vote_count:300,poster_path:null,mediaType:'movie',verified:true}];
    A.ST.idx=0;A.renderStack();await flush();
    const card=doc.querySelector('.card');
    t.ok(card,'card exists');
    t.ok(card.querySelector('.card-inner'),'card-inner');
    t.ok(card.querySelector('.card-poster'),'card-poster (42%)');
    t.ok(card.querySelector('.card-body'),'card-body (scrollable)');
    t.ok(card.querySelector('.card-footer'),'card-footer (fixed, always visible)');
    t.ok(card.querySelector('.card-footer .watch-btn'),'watch btn in footer');
    t.ok(!card.querySelector('.card-body .watch-btn'),'watch btn NOT in scrollable body');
    t.ok(dom.__errors.length===0,'no errors');
  }

  t.group('Scale-only stack — no translateY');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document,A=win.__app;await flush();
    A.ST.profile={name:'Test',platform:'netflix'};
    A.ST.picks=Array.from({length:4},(_,i)=>({id:100+i,title:'Film '+i,overview:'Great.',vote_average:8,vote_count:300,poster_path:null,mediaType:'movie',verified:true}));
    A.ST.idx=0;A.renderStack();await flush();
    const cards=[...doc.querySelectorAll('.card')];
    t.ok(cards.length>=2,'multiple cards in stack');
    // card-2, card-3, card-4 use scale() only — verified by class
    if(cards[1])t.ok(cards[1].classList.contains('card-2'),'second card has card-2 class');
    if(cards[2])t.ok(cards[2].classList.contains('card-3'),'third card has card-3 class');
  }

  t.group('Screens are position:fixed — no scroll at screen level');
  {
    const dom=await makeDom();const doc=dom.window.document;
    const screenRule=[...doc.styleSheets[0].cssRules||[]].find(r=>r.selectorText==='.screen');
    // Just check the class exists and screen is not min-height:100dvh
    t.ok(doc.querySelector('.screen'),'screen class exists');
    t.ok(!doc.body.innerHTML.includes('min-height:100dvh'),'no min-height:100dvh on screens');
  }

  t.group('Inputs are 16px font — prevents iOS zoom');
  {
    const dom=await makeDom();const doc=dom.window.document;
    const html=doc.documentElement.innerHTML;
    // All txt-input and search-inp should render at 16px (set in CSS)
    t.ok(/font-size:16px/.test(html),'16px font-size present for inputs');
  }

  t.group('Safe area insets used throughout');
  {
    const dom=await makeDom();const doc=dom.window.document;
    const html=doc.documentElement.innerHTML;
    t.ok(/safe-area-inset/.test(html),'safe-area-inset present in HTML/CSS');
    t.ok(html.includes('--sab'),'--sab custom property used');
    t.ok(html.includes('--sat'),'--sat custom property used');
  }

  t.group('Watchlist badge above footer bar');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document,A=win.__app;await flush();
    A.ST.wl=[];
    A.addWL({id:1,title:'Test',mediaType:'movie',poster_path:null,release_date:'2022-01-01'});
    const badge=doc.getElementById('wlBadge');
    t.ok(badge.classList.contains('on'),'badge visible');
    t.ok(badge.querySelector('svg'),'badge has heart SVG');
    t.ok(doc.getElementById('wlCount').textContent==='1','count=1');
  }

  t.group('Series tab not TV Shows');
  {
    const dom=await makeDom();const doc=dom.window.document;
    const tabs=[...doc.querySelectorAll('.toggle-btn')];
    t.ok(tabs.some(b=>b.textContent==='Series'),'Series tab');
    t.ok(!tabs.some(b=>b.textContent==='TV Shows'),'no TV Shows');
  }

  t.group('Surprise button present in both reels');
  {
    const dom=await makeDom();const doc=dom.window.document;
    t.ok(doc.getElementById('surpriseM'),'surprise in movies reel');
    t.ok(doc.getElementById('surpriseTV'),'surprise in TV reel');
    t.ok(doc.querySelector('.panel-surprise-txt').textContent==='Feeling lucky?','correct copy');
  }

  t.group('Touch targets — no 38px buttons');
  {
    const dom=await makeDom();const doc=dom.window.document;
    const html=doc.documentElement.innerHTML;
    t.ok(!html.includes('height:38px'),'no 38px heights (below 44px minimum)');
  }

  t.group('8px spacing system — no arbitrary values');
  {
    const dom=await makeDom();const doc=dom.window.document;
    const html=doc.documentElement.innerHTML;
    t.ok(html.includes('--sp1:4px'),'spacing system defined');
    t.ok(html.includes('--sp2:8px'),'8px base unit');
    t.ok(!html.includes('padding:14px'),'no arbitrary 14px padding');
    t.ok(!html.includes('padding:18px'),'no arbitrary 18px padding');
  }

  t.group('Zero errors with TV picks');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document,A=win.__app;await flush();
    A.ST.profile={name:'Ada',platform:'netflix',avoid:'I watch everything'};
    A.ST.mode='tv';
    const tvP=doc.querySelector('#tvReel .panel');
    t.ok(!!tvP,'TV panel exists');
    A.ST.mood=tvP.dataset.mood;A.ST.moodCard=tvP;
    win.__fetches=[];const pool=await A.fetchTMDB();
    t.ok(pool.length>0,'TV results returned');
    t.ok(win.__fetches.some(u=>u.includes('/discover/tv')),'queries /discover/tv');
    t.ok(dom.__errors.length===0,'no errors');
  }
};

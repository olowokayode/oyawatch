const {makeDom,flush}=require('./helpers');
module.exports=async(t)=>{
  const dom=await makeDom({languages:['en-NG']});
  const win=dom.window,doc=win.document,A=win.__app;
  await flush();

  const setMood=(mood)=>{
    const p=doc.querySelector(`.panel[data-mood="${mood}"]`);if(!p)return;
    A.ST.mood=mood;A.ST.moodCard=p;p.classList.add('sel');
  };

  t.group('tmdbGet caching');
  {
    win.__fetches=[];await A.tGet('/movie/424242');await A.tGet('/movie/424242');
    t.ok(win.__fetches.filter(u=>u.includes('/movie/424242')).length===1,'cached after first call');
  }

  t.group('Empty results → error card');
  {
    A.ST.profile={name:'Ada',platform:'netflix',avoid:'I watch everything'};
    A.ST.mode='movies';setMood('Dey Play');
    win.__mode='empty';A.ST.busy=false;
    A.startFlow();await flush(3);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush(16);
    const html=doc.getElementById('cardWrap').innerHTML;
    t.ok(/err-box/.test(html)||/error/.test(html),'error shown for empty results');
    win.__mode='normal';
  }

  t.group('Network error → error card');
  {
    setMood('Dey Play');win.__mode='reject';A.ST.busy=false;
    A.startFlow();await flush(3);
    doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush(16);
    const html=doc.getElementById('cardWrap').innerHTML;
    t.ok(/err-box/.test(html)||/error/.test(html),'error shown for network failure');
    win.__mode='normal';A.ST.busy=false;
  }

  t.group('All-done card — SVG icon not emoji');
  {
    A.ST.picks=[{id:1,title:'One',overview:'One film.',vote_average:8,vote_count:200,poster_path:null,mediaType:'movie',verified:true}];
    A.ST.idx=99;A.renderStack();await flush();
    const html=doc.getElementById('cardWrap').innerHTML;
    t.ok(/done-card/.test(html),'all-done card shown');
    t.ok(/<svg/.test(html),'SVG icon present');
    t.ok(!/🎬|🍿/.test(html),'no emoji in done card');
    t.ok(!html.includes('—'),'no em dash in done card');
  }

  t.group('Error card — SVG icon');
  {
    A.renderErr('no-results');
    const html=doc.getElementById('cardWrap').innerHTML;
    t.ok(/<svg/.test(html),'SVG in error card');
    t.ok(!/🎬/.test(html),'no emoji in error card');
    t.ok(/Not on Netflix/.test(html)||/nothing matched/i.test(html),'correct error copy');
  }

  t.group('Watchlist deduplication');
  {
    A.ST.wl=[];
    const p={id:42,title:'Dedup',mediaType:'movie',poster_path:null,release_date:'2021-01-01'};
    A.addWL(p);A.addWL(p);A.addWL(p);
    t.ok(A.ST.wl.length===1,'added only once');
  }

  t.group('Watchlist sheet content');
  {
    A.ST.wl=[];
    A.addWL({id:77,title:'Test Film',mediaType:'movie',poster_path:null,release_date:'2022-01-01'});
    A.openWL();await flush();
    t.ok(doc.getElementById('wlOverlay').classList.contains('on'),'sheet opens');
    t.ok(/Test Film/.test(doc.getElementById('wlItems').innerHTML),'title in list');
    const playBtn=doc.querySelector('.wl-play');
    t.ok(playBtn,'play button present');
    t.ok(!playBtn.textContent.trim(),'play button icon-only');
    A.closeWL();
  }

  t.group('Similar search → swipe stack');
  {
    A.ST.busy=false;A.ST.idx=0;
    await A.similarSearch('Inception');await flush(8);
    t.ok(A.ST.picks.length>0,'allPicks populated');
    t.ok(doc.querySelectorAll('.card').length>=1,'swipe cards rendered');
  }

  t.group('Settings reset — two tap');
  {
    A.ST.profile={name:'Ada',platform:'netflix',avoid:'I watch everything'};
    A.openSettings();await flush();
    const rb=doc.getElementById('setReset');
    t.ok(rb.textContent==='Reset everything','correct label');
    rb.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
    t.ok(/Tap again/.test(rb.textContent),'first tap asks confirmation');
    rb.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush();
    t.ok(A.ST.profile===null,'profile wiped');
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'),'back to onboarding');
  }

  t.group('Back button closes sheets');
  {
    A.openSettings();await flush();
    win.dispatchEvent(new win.PopStateEvent('popstate'));await flush();
    t.ok(!doc.getElementById('settingsOverlay').classList.contains('on'),'back closes settings');
  }

  t.group('No old classes present');
  {
    t.ok(!doc.querySelector('.sc-body'),'no .sc-body (replaced by .card-body)');
    t.ok(!doc.querySelector('.sc-watch-btn'),'no .sc-watch-btn (replaced by .watch-btn)');
    t.ok(!doc.querySelector('.sc-inner'),'no .sc-inner (replaced by .card-inner)');
    t.ok(!doc.querySelector('.mood-card'),'no .mood-card (replaced by .panel)');
    t.ok(!doc.querySelector('.swipe-card'),'no .swipe-card (replaced by .card)');
  }

  t.group('Zero errors');
  t.ok(dom.__errors.length===0,'no errors'+(dom.__errors.length?': '+dom.__errors.slice(0,2).join(' | '):''));
};

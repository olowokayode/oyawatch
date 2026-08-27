const {makeDom,flush}=require('./helpers');
module.exports=async(t)=>{
  const dom=await makeDom({languages:['en-US']});
  const win=dom.window,doc=win.document,A=win.__app;
  await flush();

  t.group('Full flow: onboard → mood → spin → skip → stack');
  t.ok(doc.getElementById('screen-onboard').classList.contains('active'),'starts on onboarding');

  const inp=doc.getElementById('nameInp');
  inp.value='chidi';inp.dispatchEvent(new win.Event('input',{bubbles:true}));
  t.ok(!doc.getElementById('obNext').disabled,'Let\'s watch enabled');
  doc.getElementById('obNext').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'),'pick screen after onboard');
  t.ok(A.ST.profile.name==='Chidi','name saved');
  t.ok(A.ST.profile.platform==='netflix','platform=netflix');

  t.ok(doc.getElementById('spinCta').classList.contains('gone'),'CTA hidden before mood');
  const panel=doc.querySelector('#moviesReel .panel[data-mood="Dey Play"]');
  t.ok(panel,'Dey Play panel exists');
  panel.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  t.ok(!doc.getElementById('spinCta').classList.contains('gone'),'CTA appears after mood select');
  t.ok(doc.getElementById('spinTxt').textContent==='Dey Play','spin button shows mood');
  t.ok(panel.classList.contains('sel'),'panel has sel class');

  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'),'wheel shown');
  t.ok(doc.getElementById('wheelEyebrow').textContent==='DEY PLAY','eyebrow shows mood uppercase');
  t.ok(doc.getElementById('wheelBg'),'wheel background element present');

  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush(8);
  t.ok(doc.getElementById('screen-results').classList.contains('active'),'skip reaches results');

  await flush(6);
  const cards=doc.querySelectorAll('.card');
  t.ok(cards.length>=1,'swipe cards rendered: '+cards.length);
  t.ok(!/imdb/i.test(doc.getElementById('cardWrap').innerHTML),'no IMDb');
  t.ok(/Netflix/.test(doc.getElementById('resPill').textContent),'pill says Netflix');
  t.ok(!doc.getElementById('resultsHeadline'),'no separate results headline');

  t.ok(doc.getElementById('btnMoods').textContent==='Moods','"Moods" button');
  t.ok(doc.getElementById('btnNew').textContent==='New picks','"New picks" button');

  doc.getElementById('btnMoods').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush();
  t.ok(doc.getElementById('screen-pick').classList.contains('active'),'Moods → pick screen');
  t.ok(doc.getElementById('spinCta').classList.contains('gone'),'CTA hidden after reset');

  doc.querySelector('.toggle-btn[data-mode="tv"]').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  t.ok(doc.getElementById('tvReel').style.display!=='none','TV reel visible');
  t.ok(doc.getElementById('moviesReel').style.display==='none','Movies reel hidden');
  t.ok(doc.getElementById('spinCta').classList.contains('gone'),'CTA hidden after mode switch');

  doc.querySelector('.panel[data-mood="Binge It"]').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
  A.ST.busy=false;
  doc.getElementById('spinBtn').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush(2);
  t.ok(doc.getElementById('screen-wheel').classList.contains('active'),'respin shows wheel');
  doc.getElementById('screen-wheel').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush(8);
  t.ok(doc.getElementById('screen-results').classList.contains('active'),'respin delivers results');

  t.group('Zero errors through full flow');
  t.ok(dom.__errors.length===0,'no errors'+(dom.__errors.length?': '+dom.__errors[0]:''));
};

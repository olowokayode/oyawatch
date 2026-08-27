const {makeDom,flush}=require('./helpers');
module.exports=async(t)=>{
  t.group('Meta');
  {
    const dom=await makeDom();const doc=dom.window.document;
    t.ok(/Oya Watch/i.test(doc.title),'title contains Oya Watch');
    t.ok(!/movie ?plug/i.test(doc.documentElement.innerHTML),'no legacy branding');
    t.ok((doc.documentElement.innerHTML.match(/tmplug_v6/g)||[]).length===1,'legacy key once');
  }

  t.group('Single-screen onboarding structure');
  {
    const dom=await makeDom();const doc=dom.window.document;await flush();
    t.ok(doc.getElementById('screen-onboard').classList.contains('active'),'onboarding active on fresh load');
    t.ok(doc.getElementById('nameInp'),'name input present');
    t.ok(doc.getElementById('avoidRow'),'avoid row present');
    t.ok(!doc.getElementById('stepLabel'),'no step label (wizard removed)');
    t.ok(!doc.getElementById('progressRow'),'no progress dots');
    t.ok(!doc.querySelector('.platform-opt'),'no platform options');
  }

  t.group('Time-aware hero headline');
  {
    const dom=await makeDom();const doc=dom.window.document;await flush();
    const el=doc.getElementById('obTime');
    t.ok(el,'obTime element exists');
    const valid=['Tonight,','This morning,','This afternoon,','This evening,'];
    t.ok(valid.some(v=>el.textContent===v),`hero time is valid: "${el.textContent}"`);
    t.ok(!el.textContent.includes('—'),'no em dash in hero time');
  }

  t.group('Name enables button');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document;await flush();
    const inp=doc.getElementById('nameInp'),nxt=doc.getElementById('obNext');
    t.ok(nxt.disabled,'button disabled before name');
    inp.value='ada';inp.dispatchEvent(new win.Event('input',{bubbles:true}));
    t.ok(!nxt.disabled,'enabled after 3+ chars');
    inp.value='a';inp.dispatchEvent(new win.Event('input',{bubbles:true}));
    t.ok(nxt.disabled,'disabled for 1 char');
  }

  t.group('Avoid chips selectable');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document;await flush();
    const chips=doc.querySelectorAll('#avoidRow .avoid-chip');
    t.ok(chips.length>=3,'3 avoid chips');
    const def=[...chips].find(c=>c.classList.contains('sel'));
    t.ok(def&&def.dataset.avoid==='I watch everything','"I watch everything" default selected');
    t.ok(!def.dataset.avoid.includes('—'),'no em dash in avoid option');
    const horror=[...chips].find(c=>c.dataset.avoid&&c.dataset.avoid.includes('Horror'));
    horror.dispatchEvent(new win.MouseEvent('click',{bubbles:true}));
    t.ok(horror.classList.contains('sel'),'horror chip selectable');
    t.ok(!def.classList.contains('sel'),'previous chip deselected');
  }

  t.group('finishOb reaches pick screen');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document,A=win.__app;await flush();
    const inp=doc.getElementById('nameInp');
    inp.value='ndidi';inp.dispatchEvent(new win.Event('input',{bubbles:true}));
    doc.getElementById('obNext').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'),'pick screen shown');
    t.ok(A.ST.profile.name==='Ndidi','name capitalised');
    t.ok(A.ST.profile.platform==='netflix','platform=netflix');
    t.ok(dom.__errors.length===0,'zero errors: '+dom.__errors[0]);
  }

  t.group('Skip goes to pick screen');
  {
    const dom=await makeDom();const win=dom.window,doc=win.document;await flush();
    doc.getElementById('obSkip').dispatchEvent(new win.MouseEvent('click',{bubbles:true}));await flush();
    t.ok(doc.getElementById('screen-pick').classList.contains('active'),'skip reaches pick screen');
  }

  t.group('Legacy migration');
  {
    const dom=await makeDom({legacy:{name:'Legacy',platform:'crunchyroll',avoid:'I watch everything'}});
    const win=dom.window,doc=win.document,A=win.__app;await flush();
    t.ok(A.ST.profile&&A.ST.profile.name==='Legacy','migrated');
    t.ok(doc.getElementById('screen-pick').classList.contains('active'),'migrated skips onboarding');
  }
};

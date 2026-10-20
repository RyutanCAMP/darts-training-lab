// analysis/period: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectPeriod(runtime){
let AIM_SKIP;
function allRecordedRounds(raw){
 const blocks=[];
 const sessions=runtime.store.sessions.slice().reverse();
 /* Only complete 3-dart rounds count as a round (1R/10R/20R/ALL); an unfinished round never shrinks or skews the window. */
 for(const s of sessions)for(let i=0;i<s.darts.length;i+=3){const round=s.darts.slice(i,i+3);if(round.length===3&&!runtime.excludedRounds.includes(runtime.roundKey(s,i/3)))blocks.push(round)}
 for(let i=0;i<runtime.store.active.darts.length;i+=3){const round=runtime.store.active.darts.slice(i,i+3);if(round.length===3&&!runtime.excludedRounds.includes(runtime.roundKey(runtime.store.active,i/3)))blocks.push(round)}
 return raw?blocks:blocks.filter(r=>runtime.aimOf(r[0])===effectiveAim(blocks));
}
function effectiveAim(blocks){
 const aims=[...new Set(blocks.map(r=>runtime.aimOf(r[0])))];
 if(runtime.analysisAim&&aims.includes(runtime.analysisAim))return runtime.analysisAim;
 if(aims.includes(runtime.curAim()))return runtime.curAim();
 return aims.length?runtime.aimOf(blocks[blocks.length-1][0]):runtime.curAim();
}
function selectedRounds(){const blocks=allRecordedRounds();return runtime.aimPeriod==='all'?blocks:blocks.slice(-Number(runtime.aimPeriod))}
function selectedDarts(){return selectedRounds().flat()}
function renderAnalysis(){
 const rawBlocks=allRecordedRounds(true);runtime.hitAim=effectiveAim(rawBlocks);
 const rounds=selectedRounds(),ds=rounds.flat(),ss=runtime.finished(),prev=runtime.previousRounds();
 document.querySelectorAll('[data-aim-period]').forEach(b=>{const active=b.dataset.aimPeriod===runtime.aimPeriod;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
 const aimsIn=runtime.AIMS.filter(a=>rawBlocks.some(r=>runtime.aimOf(r[0])===a));
 runtime.$('analysisScope').textContent=rounds.length+'R · '+ds.length+' DARTS'+(runtime.hitAim!=='BULL'||aimsIn.length>1?' · AIM '+runtime.hitAim:'');
 runtime.renderRoundManager();
 runtime.$('analysisAim').classList.toggle('hidden',aimsIn.length<2);
 runtime.$('analysisAim').innerHTML=aimsIn.length<2?'':'<span class="tiny muted">AIM</span>'+aimsIn.map(a=>'<button type="button" data-aim-sel="'+a+'" class="'+(a===runtime.hitAim?'selected':'')+'" aria-pressed="'+(a===runtime.hitAim)+'">'+a+'</button>').join('');
 runtime.$('metrics').innerHTML=runtime.scopeMetrics(ds,ss,prev);
 runtime.$('allbull').innerHTML=runtime.bullBars(ds);
 runtime.$('analysischart').innerHTML=runtime.chart(ss);
 runtime.$('achievementTotals').innerHTML=runtime.achievementTotals();runtime.$('personalRecords').innerHTML=runtime.personalRecords();
 runtime.renderAim();runtime.renderAdvanced();runtime.renderThrowOrder();runtime.renderMore(rounds,ds,prev);runtime.renderReportState();localizeAim();
}
function localizeAim(){
 const root=runtime.$('analysis'),w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
 while(w.nextNode())nodes.push(w.currentNode);
 for(const n of nodes){if(n.parentElement&&n.parentElement.closest(AIM_SKIP))continue;if(n.__o===undefined)n.__o=n.nodeValue;const v=runtime.AT(n.__o);if(n.nodeValue!==v)n.nodeValue=v}
}
Object.assign(runtime,{allRecordedRounds,selectedRounds,selectedDarts,renderAnalysis});
function initialize(){
AIM_SKIP='#analysisAim,.card-help,.card-gloss,.help-btn,#achievementTotals,#advancedGoalBody,#advancedBestVsAvg,#advancedConditions,#advancedLog,#analysischart,#reportBody';
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectPeriod=connectPeriod;
})();

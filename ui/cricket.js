(()=>{'use strict';
function connectCricketView(runtime){
// Slash, cross and circled cross drawn as SVG so they stay crisp and large.
const MARK=['','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19 18 5"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19 18 5M6 5l12 14"/></svg>','<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M7 17 17 7M7 7l10 10"/></svg>'];
const short=d=>d.segment==='IB'?'IB':d.segment==='OB'?'OB':d.segment;
function renderCricket(){
 const s=runtime.store.active,q=runtime.evaluateCricket(s),ds=s.darts;
 if(!q.valid){runtime.$('score').textContent='—';runtime.$('miss').disabled=true;return}
 const match=q.match,pending=runtime.awaitingPlayer(s),T=runtime.CRICKET_TARGETS;
 // While a handoff is pending, keep showing the turn that just finished.
 const shown=pending?ds.at(-1).playerIndex:q.playerIndex;
 if(match){
  runtime.$('matchPlayers').classList.remove('hidden');
  runtime.$('matchPlayers').innerHTML=s.players.map((p,i)=>'<div class="match-player p'+(i+1)+' '+(i===q.playerIndex?'current':'')+'" '+(i===q.playerIndex?'aria-current="true"':'')+'><span title="'+runtime.esc(p.name)+'">P'+(i+1)+' · '+runtime.esc(p.name)+'</span><strong>'+q.points[i]+'</strong><small>'+(q.ended?(q.winner===i?'WIN':q.winner===null?'DRAW':''):i===q.playerIndex?(pending?'交代待ち':'THROWING'):'WAIT')+' · MPR '+q.mpr[i].toFixed(2)+'</small></div>').join('');
  runtime.$('turnChange').classList.toggle('hidden',!pending);
  runtime.$('nextPlayerName').textContent='P'+(q.playerIndex+1)+' · '+s.players[q.playerIndex].name+'の番です';
  runtime.$('confirmTurn').textContent='交代して投げる';
  runtime.$('livebull').innerHTML=runtime.bullBars(ds.filter(d=>d.playerIndex===q.playerIndex),runtime.curAim());
 }
 runtime.$('score').textContent=q.points[0];
 runtime.$('scoreCaption').textContent=match?'P'+(q.playerIndex+1)+' POINTS':'POINTS · MPR '+q.mpr[0].toFixed(2);
 // Light up what the opponent took in their last turn and what this turn adds.
 const lastTurn=pending?q.frames.at(-1).turn:match?q.turnIndex-1:-1,thisTurn=pending?-1:q.turnIndex,added=[{},{}];
 for(const f of q.frames)if(f.target&&f.marks&&(f.turn===lastTurn||f.turn===thisTurn))added[f.playerIndex][f.target]=(added[f.playerIndex][f.target]||0)+f.marks;
 const cell=(i,t)=>{const n=q.marks[i][t],plus=added[i][t];return '<span class="ck-mark p'+(i+1)+(n>=3?' closed':'')+(plus?' recent':'')+'" aria-label="'+n+' MARK">'+MARK[n]+(plus?'<i>+'+plus+'</i>':'')+'</span>'};
 const own=t=>!match?'':q.marks[0][t]>=3&&q.marks[1][t]>=3?' dead':q.marks[0][t]>=3?' own-p1':q.marks[1][t]>=3?' own-p2':'';
 const head=match?'<div class="ck-head">'+s.players.map((p,i)=>'<span class="p'+(i+1)+(i===q.playerIndex&&!q.ended?' current':'')+'"><em>P'+(i+1)+' · '+runtime.esc(p.name)+'</em><b>'+q.points[i]+'</b></span>').join('<span></span>')+'</div>':'';
 runtime.$('cricketBoard').innerHTML=head+T.map(t=>'<div class="ck-row'+own(t)+'">'+(match?cell(0,t):'')+'<b>'+t+'</b>'+(match?cell(1,t):cell(0,t))+'</div>').join('');
 runtime.$('cricketBoard').classList.toggle('solo',!match);
 runtime.$('roundlabel').textContent='ROUND '+q.round+' / 15';
 runtime.$('progress').textContent=pending?'P'+(shown+1)+' · LAST TURN':ds.length+' DARTS';
 runtime.$('rounds').innerHTML=Array.from({length:15},(_,i)=>{
  const r=q.rounds.find(x=>x.round===i+1&&x.playerIndex===shown);
  return '<div class="'+(r?.closed?'done':!pending&&i+1===q.round?'active':'')+'">R'+(i+1)+'<br><b>'+(r?r.marks+'M':'—')+'</b></div>';
 }).join('');
 const last=q.rounds.filter(r=>r.playerIndex===shown).at(-1),displayRound=pending?last.round:match?q.round:last?.round||1;
 const current=ds.map((d,i)=>({d,f:q.frames[i]})).filter(x=>x.f.round===displayRound&&x.f.playerIndex===shown);
 runtime.$('throws').innerHTML=Array.from({length:3},(_,i)=>{
  const x=current[i];
  return '<div class="throw '+(!q.ended&&!pending&&!x&&displayRound===q.round&&i+1===q.dart?'active':'')+'"><span class="tiny muted">DART '+(i+1)+'</span><b>'+(x?short(x.d):'—')+'</b><span class="tiny muted">'+(x?(x.f.marks?x.f.marks+' MARK':'NO MARK')+(x.f.points?' · +'+x.f.points:''):q.ended?'END':'READY')+'</span></div>';
 }).join('');
 runtime.$('resultpanel').classList.toggle('hidden',!q.ended||!runtime.showResult);
 runtime.$('resultscore').textContent=match?q.points.join(' - '):q.mpr[0].toFixed(2);
 runtime.$('resultCaption').textContent=match?q.winner!==null?'P'+(q.winner+1)+' · '+s.players[q.winner].name+' WIN!':'DRAW · 2人とも15ラウンド終了':q.reason==='closed'?'ALL CLOSED! 15〜20とBULLを全部閉めました。':'ROUND LIMIT · 15ラウンド終了。';
 runtime.$('resultCompare').textContent=match?runtime.matchSummary(s):'MPR '+q.mpr[0].toFixed(2)+' · '+q.totals[0]+' MARKS · '+q.points[0]+' PTS · '+ds.length+' DARTS';
 runtime.$('resultbull').textContent=ds.filter(runtime.isBull).length+' / '+ds.length;
 runtime.$('saveResult').disabled=!q.ended;runtime.$('miss').disabled=q.ended;
 runtime.$('throwlog').innerHTML=ds.map((d,i)=>'<tr><td>'+(match?'P'+(d.playerIndex+1)+' · ':'')+'R'+d.roundIndex+'-'+d.dartIndex+'</td><td>'+runtime.dartLabel(d)+'</td><td class="num">'+q.frames[i].marks+'M'+(d.score?' +'+d.score:'')+'</td></tr>').reverse().join('')||'<tr><td colspan="3" class="muted">まだ投球記録がありません</td></tr>';
}
Object.assign(runtime,{renderCricket});
return {};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectCricketView=connectCricketView;
})();

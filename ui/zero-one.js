(()=>{'use strict';
function connectZeroOneView(runtime){
function renderZero(){
 const s=runtime.store.active,q=runtime.evaluateZero(s),ds=s.darts;
 if(!q.valid){runtime.$('score').textContent='—';runtime.$('miss').disabled=true;return}
 const match=runtime.isMatch(s),pending=runtime.awaitingPlayer(s);
 const guide=runtime.$('checkoutGuide');runtime.$('checkoutHome').appendChild(guide);
 if(match){
  runtime.$('matchPlayers').classList.remove('hidden');
  runtime.$('matchPlayers').innerHTML=s.players.map((p,i)=>'<div class="match-player p'+(i+1)+' '+(i===q.playerIndex?'current':'')+'" '+(i===q.playerIndex?'aria-current="true"':'')+'><span title="'+runtime.esc(p.name)+'">P'+(i+1)+' · '+runtime.esc(p.name)+'</span><strong>'+q.scores[i]+'</strong><small>'+(q.ended?(q.winner===i?'WIN':q.winner===null?'DRAW':''):i===q.playerIndex?(pending?'交代待ち':'THROWING'):'WAIT')+'</small></div>').join('');
  runtime.$('matchPlayers').querySelector('.current').appendChild(guide);
  runtime.$('scoreCaption').textContent='P'+(q.playerIndex+1)+' REMAINING';
  runtime.$('turnChange').classList.toggle('hidden',!pending);
  runtime.$('nextPlayerName').textContent='P'+(q.playerIndex+1)+' · '+s.players[q.playerIndex].name+'の番です';
  runtime.$('confirmTurn').textContent='交代して投げる';
  runtime.$('livebull').innerHTML=runtime.bullBars(ds.filter(d=>d.playerIndex===q.playerIndex),runtime.curAim());
 }
 runtime.$('score').textContent=q.remaining;
 guide.classList.toggle('hidden',q.ended||q.remaining>180);
 if(!q.ended&&q.remaining<=180){
  const available=4-q.dart,routes=runtime.checkoutRoutes(q.remaining,available);
  const nextRound=!match&&q.dart===1&&q.rounds.at(-1)?.closed;
  runtime.$('checkoutTitle').textContent='CHECKOUT · '+(nextRound?'次ラウンド ':'残り ')+available+'投';
  runtime.$('checkoutRoutes').replaceChildren();
  if(routes.length){for(const route of routes){const item=document.createElement('span');item.className='checkout-route';item.textContent=route.join(' + ');runtime.$('checkoutRoutes').appendChild(item)}}
  else runtime.$('checkoutRoutes').textContent='残り'+available+'投で上がれる候補はありません';
 }
 runtime.$('roundlabel').textContent='ROUND '+q.round+' / 20';
 runtime.$('progress').textContent=ds.length+' DARTS';
 runtime.$('rounds').innerHTML=Array.from({length:20},(_,i)=>{
  const r=q.rounds.find(x=>x.round===i+1&&(!match||x.playerIndex===q.playerIndex));
  return '<div class="'+(r?.closed?'done':i+1===q.round?'active':'')+'">R'+(i+1)+'<br><b>'+(r?(r.bust?'BUST':r.score):'—')+'</b></div>';
 }).join('');
 const last=match?q.rounds.filter(r=>r.playerIndex===q.playerIndex).at(-1):q.rounds.at(-1),displayRound=match?q.round:last?.round||1,current=ds.filter(d=>d.roundIndex===displayRound&&(!match||d.playerIndex===q.playerIndex));
 runtime.$('throws').innerHTML=Array.from({length:3},(_,i)=>{
  const d=current[i];
  return '<div class="throw '+(!q.ended&&!d&&displayRound===q.round&&i+1===q.dart?'active':'')+'"><span class="tiny muted">DART '+(i+1)+'</span><b>'+(d?d.score:'—')+'</b><span class="tiny muted">'+(d?runtime.dartLabel(d):last?.bust?'BUST':q.ended?'END':'READY')+'</span></div>';
 }).join('');
 runtime.$('resultpanel').classList.toggle('hidden',!q.ended||!runtime.showResult);
 runtime.$('resultscore').textContent=q.remaining;
 runtime.$('resultCaption').textContent=q.reason==='checkout'?'CHECKOUT! 残点0でクリアしました。':'ROUND LIMIT · 20ラウンド終了。残点を記録します。';
 runtime.$('resultCompare').textContent=runtime.gameName(s)+' · '+q.round+' ROUND · '+ds.length+' DARTS';
 if(match){runtime.$('resultCaption').textContent=q.winner!==null?'P'+(q.winner+1)+' · '+s.players[q.winner].name+' WIN!':'DRAW · 2人とも20ラウンド終了';runtime.$('resultCompare').textContent=runtime.matchSummary(s);}
 runtime.$('resultbull').textContent=ds.filter(runtime.isBull).length+' / '+ds.length;
 runtime.$('saveResult').disabled=!q.ended;runtime.$('miss').disabled=q.ended;
 runtime.$('throwlog').innerHTML=ds.map((d,i)=>'<tr><td>'+(match?'P'+(d.playerIndex+1)+' · ':'')+'R'+d.roundIndex+'-'+d.dartIndex+'</td><td>'+runtime.dartLabel(d)+(q.frames[i].bust?' · BUST':'')+'</td><td class="num">'+d.score+' → '+q.frames[i].remaining+'</td></tr>').reverse().join('')||'<tr><td colspan="3" class="muted">まだ投球記録がありません</td></tr>';
}
Object.assign(runtime,{renderZero});
return {};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectZeroOneView=connectZeroOneView;
})();

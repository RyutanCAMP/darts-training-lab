// ui/render: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectRender(runtime){
function renderAimSetting(){
 const sel=runtime.$('aimSelect');if(sel&&sel.value!==runtime.curAim())sel.value=runtime.curAim();
 const chip=runtime.$('aimChip');if(chip)chip.textContent='AIM '+runtime.curAim();
}
function render(){renderAimSetting();runtime.$('soundToggle').textContent=runtime.store.soundEnabled===false?'効果音 OFF':'効果音 ON';runtime.$('soundToggle').setAttribute('aria-pressed',String(runtime.store.soundEnabled!==false));document.querySelectorAll('[data-delay]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.delay)===Number(runtime.store.roundDelay))});runtime.updateSaveIndicator();runtime.$('savedNotice').classList.toggle('hidden',!runtime.justSaved);const s=runtime.store.active,ds=s.darts,n=ds.length,ss=runtime.finished(),a=runtime.completedDarts(),average=ss.length?Math.round(ss.reduce((v,x)=>v+runtime.sum(x.darts),0)/ss.length):0,bulls=a.filter(runtime.isBull).length;
const zero=runtime.isZero(s),cricket=runtime.isCricket(s);
runtime.$('play').classList.toggle('is-match',runtime.isMatch(s));runtime.$('play').classList.toggle('is-cricket',cricket);
runtime.$('cricketBoard').classList.toggle('hidden',!cricket);runtime.$('roundsTitle').textContent=cricket?'ROUND MARKS':'ROUND SCORE';
// Cricket only uses 15-20 and BULL; dim the other segments.
document.querySelectorAll('#board .hit').forEach(h=>{const n=Number(h.dataset.segment.replace(/^[SDT](\d+).*$/,'$1'));h.classList.toggle('cricket-off',cricket&&n>0&&n<15)});
runtime.$('matchPlayers').classList.add('hidden');runtime.$('turnChange').classList.add('hidden');runtime.$('soloMode').classList.toggle('hidden',!runtime.isMatch(s));
runtime.$('checkoutGuide').classList.add('hidden');
runtime.$('gameSelect').value=runtime.gameChoiceOf(s);
runtime.$('gameRules').textContent=cricket?'15-20 / BULL / 15 ROUND':zero?'BULL 50 / OPEN OUT / 20 ROUND':'8 ROUND / 24 DARTS';
runtime.$('scoreCaption').textContent=zero?'REMAINING':cricket?'POINTS':'TOTAL SCORE';
runtime.$('rounds').classList.toggle('zero-rounds',zero);
runtime.$('resultCaption').textContent='24投完了。スコアを確認して記録を確定してください。';
runtime.renderAnalysis();runtime.$('livebull').innerHTML=runtime.bullBars(ds,runtime.curAim());
if(!zero&&!cricket){
runtime.$('score').textContent=runtime.sum(ds);runtime.$('roundlabel').textContent='ROUND '+Math.min(8,Math.floor(n/3)+1)+' / 8';runtime.$('progress').textContent=n+' / 24';
runtime.$('rounds').innerHTML=Array.from({length:8},(_,i)=>{let d=ds.filter(x=>x.roundIndex===i+1);return '<div class="'+(d.length===3?'done':i===Math.min(7,Math.floor(n/3))?'active':'')+'">R'+(i+1)+'<br><b>'+(d.length?runtime.sum(d):'—')+'</b></div>'}).join('');
let r=n>0&&n%3===0?Math.min(7,n/3-1):Math.min(7,Math.floor(n/3));runtime.$('throws').innerHTML=Array.from({length:3},(_,i)=>{let d=ds[r*3+i];return '<div class="throw '+(!d&&i===n%3?'active':'')+'"><span class="tiny muted">DART '+(i+1)+'</span><b>'+(d?d.score:'—')+'</b><span class="tiny muted">'+(d?runtime.dartLabel(d):'READY')+'</span></div>'}).join('');
runtime.$('throwlog').innerHTML=ds.slice().reverse().map((d,i)=>'<tr><td>'+(n-i)+' (R'+d.roundIndex+'-'+d.dartIndex+')</td><td>'+runtime.dartLabel(d)+'</td><td class="num">'+d.score+'</td></tr>').join('')||'<tr><td colspan="3" class="muted">まだ投球記録がありません</td></tr>';
runtime.$('resultpanel').classList.toggle('hidden',n!==24||!runtime.showResult);runtime.$('resultCompare').innerHTML=n===24?resultCompare(ds,ss):'';runtime.$('resultscore').textContent=runtime.sum(ds);runtime.$('resultbull').textContent=ds.filter(runtime.isBull).length+' / 24';runtime.$('saveResult').disabled=n!==24;
runtime.$('miss').disabled=n===24;
}else if(cricket)runtime.renderCricket();else runtime.renderZero();
runtime.$('undo').disabled=!n;runtime.$('endgame').disabled=!n;
const latest=runtime.store.sessions[0];runtime.$('latestResult').innerHTML=latest?'<div class="latest-score">'+runtime.gameScore(latest)+'</div><div class="latest-meta"><span>'+runtime.date(latest.startedAt)+'</span><span>'+runtime.esc(runtime.gameName(latest))+' · '+runtime.gameOutcome(latest)+(runtime.isMatch(latest)?'<br>'+runtime.esc(runtime.matchSummary(latest)):'')+(runtime.isZero(latest)?' · 残点':scoreUnit(latest,' · '))+'</span><span>BULL '+latest.darts.filter(runtime.isBull).length+' / '+latest.darts.length+'</span></div>':'<div class="empty">まだ記録がありません。PLAYで最初のゲームを始めましょう。</div>';
runtime.$('sessions').innerHTML=runtime.store.sessions.map(x=>'<tr><td>'+runtime.date(x.startedAt)+'</td><td>'+runtime.esc(runtime.gameName(x))+' · '+runtime.gameOutcome(x)+'</td><td>'+runtime.gameScore(x)+scoreUnit(x,' ')+'</td><td>'+x.darts.filter(runtime.isBull).length+'</td><td>'+x.darts.length+'</td><td><button data-detail="'+runtime.esc(x.id)+'">詳細</button></td></tr>').join('')||'<tr><td colspan="6" class="muted">まだ履歴がありません。PLAYから練習を始めましょう。</td></tr>';
document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{runtime.viewId=b.dataset.detail;renderDetail()});if(runtime.store.sessions.length&&!runtime.store.sessions.some(x=>x.id===runtime.viewId))runtime.viewId=runtime.store.sessions[0].id;renderDetail();
runtime.$('bindinglog').textContent=Object.entries(runtime.store.bindings).map(([k,v])=>k+' → '+runtime.label(v)).join('\n')||'割当なし';
renderArena(s);
}
function renderArena(s){
 const q=runtime.isGame(s)?runtime.evaluateGame(s):null,round=q?.round||Math.min(8,Math.floor(s.darts.length/3)+1);
 runtime.$('arenaGameTitle').textContent=runtime.gameName(s);
 runtime.$('arenaTurnName').textContent=runtime.isMatch(s)?'P'+(q.playerIndex+1)+' · '+s.players[q.playerIndex].name:runtime.myDarts.nick||'SOLO PRACTICE';
 runtime.$('soloPlayerName').textContent=runtime.myDarts.nick||'PLAYER 1';
 const rows=runtime.$('rounds');[...rows.children].forEach((row,i)=>row.classList.toggle('arena-recent',i>=Math.max(0,round-3)&&i<round));
 runtime.$('toggleRounds').textContent=rows.classList.contains('show-all')?'直近ラウンド':'全ラウンド';
 runtime.$('toggleRounds').setAttribute('aria-expanded',String(rows.classList.contains('show-all')));
 document.body.classList.toggle('arena-playing',runtime.$('play').classList.contains('active'));
}
// Unit after a history score: 01 shows what is left, cricket solo shows MPR.
const scoreUnit=(s,sep)=>runtime.isZero(s)?sep+'残り':runtime.isCricket(s)?sep+(runtime.isMatch(s)?'PTS':'MPR'):'';
function resultCompare(ds,ss){
 if(!ss.length)return '<div class="cmp-first">FIRST GAME — ここが基準になります</div>';
 const sc=runtime.sum(ds),scores=ss.map(x=>runtime.sum(x.darts)),avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),best=Math.max(...scores),rank=scores.filter(x=>x>sc).length+1,A=runtime.curAim(),rt=x=>x.length?x.filter(q=>runtime.aimHit(q,A)).length/x.length*100:0,br=rt(ds),pbr=Math.round(ss.reduce((a,x)=>a+rt(x.darts),0)/ss.length*10)/10;
 const d=(v,u)=>'<b class="'+(v>0?'up':v<0?'down':'')+'">'+(v>0?'▲ +':v<0?'▼ ':'± ')+(v<0?v:v===0?0:v)+(u||'')+'</b>';
 const r=Math.round((br-pbr)*10)/10;
 return '<div class="cmp-grid"><div><span>VS AVG '+avg+'</span>'+d(sc-avg)+'</div><div><span>VS BEST '+best+'</span>'+d(sc-best)+'</div><div><span>RANK</span><b>'+rank+' / '+(scores.length+1)+'</b></div><div><span>'+A+' RATE vs AVG</span>'+d(r,'pt')+'</div></div>'+(sc>best?'<div class="cmp-new">NEW PERSONAL BEST!</div>':'');
}
function renderDetail(){let s=runtime.store.sessions.find(x=>x.id===runtime.viewId);if(!s){runtime.$('sessiondetail').textContent='履歴の「詳細」を押してください。';return}runtime.$('sessiondetail').innerHTML='<div class="flex"><b>'+runtime.date(s.startedAt)+'</b><span class="pill">'+runtime.esc(runtime.gameName(s))+' · '+runtime.gameOutcome(s)+'</span><strong class="accent">'+runtime.gameScore(s)+(runtime.isZero(s)?' REMAINING':runtime.isCricket(s)&&!runtime.isMatch(s)?' MPR':' POINTS')+'</strong></div>'+(runtime.isMatch(s)?'<p class="tiny">'+runtime.esc(runtime.matchSummary(s))+'</p>':'')+'<div class="minirows"><table><thead><tr><th>R</th><th>投球順</th><th>着弾</th><th>得点</th><th>時刻</th></tr></thead><tbody>'+s.darts.map((d,i)=>'<tr><td>'+(runtime.isMatch(s)?'P'+(d.playerIndex+1)+' · ':'')+d.roundIndex+'</td><td>'+d.dartIndex+'</td><td>'+runtime.dartLabel(d)+(runtime.isZero(s)&&runtime.evaluateZero(s).frames?.[i]?.bust?' · BUST':'')+(runtime.isCricket(s)?' · '+(runtime.evaluateCricket(s).frames[i]?.marks||0)+'M':'')+'</td><td>'+d.score+'</td><td>'+new Date(d.timestamp).toLocaleTimeString('ja-JP')+'</td></tr>').join('')+'</tbody></table></div>'}
Object.assign(runtime,{render});

return {};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectRender=connectRender;
})();

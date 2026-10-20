// ui/render: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectRender(runtime){
function renderAimSetting(){
 const sel=runtime.$('aimSelect');if(sel&&sel.value!==runtime.curAim())sel.value=runtime.curAim();
 const chip=runtime.$('aimChip');if(chip)chip.textContent='AIM '+runtime.curAim();
}
function render(){renderAimSetting();runtime.$('soundToggle').textContent=runtime.store.soundEnabled===false?'効果音 OFF':'効果音 ON';runtime.$('soundToggle').setAttribute('aria-pressed',String(runtime.store.soundEnabled!==false));document.querySelectorAll('[data-delay]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.delay)===Number(runtime.store.roundDelay))});runtime.updateSaveIndicator();runtime.$('savedNotice').classList.toggle('hidden',!runtime.justSaved);const s=runtime.store.active,ds=s.darts,n=ds.length,ss=runtime.finished(),a=runtime.completedDarts(),average=ss.length?Math.round(ss.reduce((v,x)=>v+runtime.sum(x.darts),0)/ss.length):0,bulls=a.filter(runtime.isBull).length;
runtime.renderAnalysis();runtime.$('livebull').innerHTML=runtime.bullBars(ds,runtime.curAim());
runtime.$('score').textContent=runtime.sum(ds);runtime.$('roundlabel').textContent='ROUND '+Math.min(8,Math.floor(n/3)+1)+' / 8';runtime.$('progress').textContent=n+' / 24';
runtime.$('rounds').innerHTML=Array.from({length:8},(_,i)=>{let d=ds.filter(x=>x.roundIndex===i+1);return '<div class="'+(d.length===3?'done':i===Math.min(7,Math.floor(n/3))?'active':'')+'">R'+(i+1)+'<br><b>'+(d.length?runtime.sum(d):'—')+'</b></div>'}).join('');
let r=n>0&&n%3===0?Math.min(7,n/3-1):Math.min(7,Math.floor(n/3));runtime.$('throws').innerHTML=Array.from({length:3},(_,i)=>{let d=ds[r*3+i];return '<div class="throw '+(!d&&i===n%3?'active':'')+'"><span class="tiny muted">DART '+(i+1)+'</span><b>'+(d?d.score:'—')+'</b><span class="tiny muted">'+(d?runtime.dartLabel(d):'READY')+'</span></div>'}).join('');
runtime.$('throwlog').innerHTML=ds.slice().reverse().map((d,i)=>'<tr><td>'+(n-i)+' (R'+d.roundIndex+'-'+d.dartIndex+')</td><td>'+runtime.dartLabel(d)+'</td><td class="num">'+d.score+'</td></tr>').join('')||'<tr><td colspan="3" class="muted">まだ投球記録がありません</td></tr>';
runtime.$('undo').disabled=!n;runtime.$('endgame').disabled=!n;
runtime.$('resultpanel').classList.toggle('hidden',n!==24||!runtime.showResult);runtime.$('resultCompare').innerHTML=n===24?resultCompare(ds,ss):'';runtime.$('resultscore').textContent=runtime.sum(ds);runtime.$('resultbull').textContent=ds.filter(runtime.isBull).length+' / 24';runtime.$('saveResult').disabled=n!==24;
runtime.$('miss').disabled=n===24;
const latest=runtime.store.sessions[0];runtime.$('latestResult').innerHTML=latest?'<div class="latest-score">'+runtime.sum(latest.darts)+'</div><div class="latest-meta"><span>'+runtime.date(latest.startedAt)+'</span><span>'+(latest.status==='completed'?'24投 完走':'途中終了 '+latest.darts.length+'投')+'</span><span>BULL '+latest.darts.filter(runtime.isBull).length+' / '+latest.darts.length+'</span></div>':'<div class="empty">まだ記録がありません。PLAYで最初のゲームを始めましょう。</div>';
runtime.$('sessions').innerHTML=runtime.store.sessions.map(x=>'<tr><td>'+runtime.date(x.startedAt)+'</td><td>'+(x.status==='completed'?'完走':'途中終了')+'</td><td>'+runtime.sum(x.darts)+'</td><td>'+x.darts.filter(runtime.isBull).length+'</td><td>'+x.darts.length+'</td><td><button data-detail="'+runtime.esc(x.id)+'">詳細</button></td></tr>').join('')||'<tr><td colspan="6" class="muted">まだ履歴がありません。PLAYから練習を始めましょう。</td></tr>';
document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{runtime.viewId=b.dataset.detail;renderDetail()});if(runtime.store.sessions.length&&!runtime.store.sessions.some(x=>x.id===runtime.viewId))runtime.viewId=runtime.store.sessions[0].id;renderDetail();
runtime.$('bindinglog').textContent=Object.entries(runtime.store.bindings).map(([k,v])=>k+' → '+runtime.label(v)).join('\n')||'割当なし';
}
function resultCompare(ds,ss){
 if(!ss.length)return '<div class="cmp-first">FIRST GAME — ここが基準になります</div>';
 const sc=runtime.sum(ds),scores=ss.map(x=>runtime.sum(x.darts)),avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),best=Math.max(...scores),rank=scores.filter(x=>x>sc).length+1,A=runtime.curAim(),rt=x=>x.length?x.filter(q=>runtime.aimHit(q,A)).length/x.length*100:0,br=rt(ds),pbr=Math.round(ss.reduce((a,x)=>a+rt(x.darts),0)/ss.length*10)/10;
 const d=(v,u)=>'<b class="'+(v>0?'up':v<0?'down':'')+'">'+(v>0?'▲ +':v<0?'▼ ':'± ')+(v<0?v:v===0?0:v)+(u||'')+'</b>';
 const r=Math.round((br-pbr)*10)/10;
 return '<div class="cmp-grid"><div><span>VS AVG '+avg+'</span>'+d(sc-avg)+'</div><div><span>VS BEST '+best+'</span>'+d(sc-best)+'</div><div><span>RANK</span><b>'+rank+' / '+(scores.length+1)+'</b></div><div><span>'+A+' RATE vs AVG</span>'+d(r,'pt')+'</div></div>'+(sc>best?'<div class="cmp-new">NEW PERSONAL BEST!</div>':'');
}
function renderDetail(){let s=runtime.store.sessions.find(x=>x.id===runtime.viewId);if(!s){runtime.$('sessiondetail').textContent='履歴の「詳細」を押してください。';return}runtime.$('sessiondetail').innerHTML='<div class="flex"><b>'+runtime.date(s.startedAt)+'</b><span class="pill">'+(s.status==='completed'?'完走':'途中終了')+'</span><strong class="accent">'+runtime.sum(s.darts)+' POINTS</strong></div><div class="minirows"><table><thead><tr><th>R</th><th>投球順</th><th>着弾</th><th>得点</th><th>時刻</th></tr></thead><tbody>'+s.darts.map(d=>'<tr><td>'+d.roundIndex+'</td><td>'+d.dartIndex+'</td><td>'+runtime.label(d.segment)+'</td><td>'+d.score+'</td><td>'+new Date(d.timestamp).toLocaleTimeString('ja-JP')+'</td></tr>').join('')+'</tbody></table></div>'}
Object.assign(runtime,{render});

return {};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectRender=connectRender;
})();

// analysis/advanced: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectAdvanced(runtime){
let wilson,arrowOf,badge,signed,advBar,statCard,dayKey;
function scopeMetrics(ds,ss,prev){
 const best=ss.length?Math.max(...ss.map(s=>runtime.sum(s.darts))):null;
 const value=(name,n,detail,key)=>'<div class="panel metric"><div class="label">'+name+'</div>'+runtime.helpBtn(key)+'<div class="value">'+n+'</div><div class="detail">'+detail+'</div>'+runtime.helpBox(key,true)+'</div>';
 const diff=prev&&ds.length?Math.round((runtime.hitRate(ds)-runtime.hitRate(prev.flat()))*10)/10:null;
 return value('BULL RATE',ds.length?runtime.hitRate(ds)+'%':'—',ds.filter(runtime.isHit).length+' / '+ds.length+(diff===null?'':' · '+signed(diff,'pt')),'m-bull')
 +value('BULL HITS',ds.filter(runtime.isHit).length,'SELECTED','m-hits')
 +(runtime.hitAim==='BULL'?value('INNER BULL',ds.filter(d=>d.segment==='IB').length,'SELECTED','m-inner'):value('AVG / DART',ds.length?(runtime.sum(ds)/ds.length).toFixed(1):'—','SELECTED','m-inner'))
 +value('PERSONAL BEST',best??'—','ALL TIME','m-best');
}
function renderAdvanced(){
 const rounds=runtime.selectedRounds(),ds=rounds.flat(),pts=ds.map(runtime.aimPoint).filter(Boolean),nonbull=ds.filter(d=>runtime.aimPoint(d)&&!runtime.isHit(d)),np=nonbull.map(runtime.aimPoint);
 const directions=['↑','↗','→','↘','↓','↙','←','↖'],counts=Array(8).fill(0);
 for(const p of np){const deg=(Math.atan2(p.y,p.x)*180/Math.PI+450)%360;counts[Math.round(deg/45)%8]++}
 const bar=(label,value,max,extra='')=>advBar(label,value,max,extra);
 runtime.$('advancedDirection').innerHTML='<div class="direction-grid">'+counts.map((n,i)=>'<div class="direction-cell"><span>'+directions[i]+'</span><strong>'+(np.length?Math.round(n/np.length*100):0)+'%</strong></div>').join('')+'</div>';
 const median=a=>{a.sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):0};
 const mx=median(pts.map(p=>p.x)),my=median(pts.map(p=>p.y));
 const radii=pts.map(p=>Math.hypot(p.x-mx,p.y-my)),avg=radii.length?radii.reduce((a,b)=>a+b,0)/radii.length:0;
 const tight=pts.length?Math.round(pts.filter(p=>Math.hypot(p.x-mx,p.y-my)<=.45).length/pts.length*100):0;
 runtime.$('advancedConsistency').innerHTML='<div class="advanced-big">'+(pts.length?tight+'%':'—')+'</div><div class="tiny muted">CLUSTER · 0.45R</div>'+bar('SPREAD',Math.min(avg,1.5),1.5,pts.length?avg.toFixed(2):'—');
 const half=Math.floor(rounds.length/2),older=rounds.slice(0,half).flat(),newer=rounds.slice(half).flat(),newRate=newer.length?runtime.hitRate(newer):null,oldRate=older.length?runtime.hitRate(older):null;
 runtime.$('advancedBullTrend').innerHTML='<div class="advanced-big">'+(newRate===null?'—':newRate+'%')+'</div><div class="tiny muted">'+(oldRate===null?'BULL RATE':('PREV '+oldRate+'% · '+(newRate-oldRate>=0?'+':'')+(newRate-oldRate).toFixed(1)+'pt'))+'</div>'+bar('RECENT',newRate??0,100,'');
 const grouped=Array.from({length:8},()=>[]);
 for(const round of rounds){const d=round[0];if(d&&Number.isInteger(d.roundIndex)&&d.roundIndex>=1&&d.roundIndex<=8)grouped[d.roundIndex-1].push(round)}
 runtime.$('advancedRounds').innerHTML=grouped.map((arr,i)=>{const darts=arr.flat(),r=darts.length?runtime.hitRate(darts):0;return bar('R'+(i+1),r,100,darts.length?r+'%':'—')}).join('');
 let streak=0,best=0;for(const d of ds){streak=runtime.isHit(d)?streak+1:0;best=Math.max(best,streak)}
 runtime.$('advancedStreak').innerHTML='<div class="advanced-big">'+best+'</div><div class="tiny muted">CONSECUTIVE BULLS</div>';
}
function personalRecords(){
 const games=runtime.finished().filter(s=>Array.isArray(s.darts)&&s.darts.length===24);
 const rows=games.map(s=>{
  const ds=s.darts,rounds=Array.from({length:8},(_,i)=>ds.slice(i*3,i*3+3));
  let run=0,longest=0;
  for(const d of ds){run=runtime.isBull(d)?run+1:0;longest=Math.max(longest,run)}
  return {score:runtime.sum(ds),bulls:ds.filter(runtime.isBull).length,inner:ds.filter(d=>d.segment==='IB').length,
   round:Math.max(...rounds.map(runtime.sum)),streak:longest,hats:rounds.filter(r=>r.every(runtime.isBull)).length,
   ton80:rounds.filter(r=>r.every(d=>d.segment==='T20')).length};
 });
 const best=k=>rows.length?Math.max(...rows.map(r=>r[k])):null;
 const items=[
  ['HIGH SCORE',best('score'),'PTS'],
  ['BULL / GAME',best('bulls'),'HITS'],
  ['BULL RATE',best('bulls')===null?null:Math.round(best('bulls')/24*1000)/10,'%'],
  ['INNER / GAME',best('inner'),'HITS'],
  ['BEST ROUND',best('round'),'PTS'],
  ['BULL STREAK',best('streak'),'DARTS'],
  ['HAT / GAME',best('hats'),'TIMES'],
  ['TON 80 / GAME',best('ton80'),'TIMES']
 ];
 return items.map(([label,value,unit])=>'<div class="record-tile"><span>'+label+'</span><strong>'+(value===null?'—':value)+'</strong><small>'+unit+'</small></div>').join('');
}
function achievementTotals(){
 const games=runtime.finished(),darts=games.flatMap(s=>s.darts),rounds=games.flatMap(s=>Array.from({length:8},(_,i)=>s.darts.slice(i*3,i*3+3))).filter(a=>a.length===3);
 const bulls=darts.filter(runtime.isBull).length,inner=darts.filter(d=>d.segment==='IB').length,hats=rounds.filter(a=>a.every(runtime.isBull)).length,ton80=rounds.filter(a=>a.every(d=>d.segment==='T20')).length,high=rounds.filter(a=>{const n=runtime.sum(a);return n>=151&&n<180}).length;
 const items=[['BULL',bulls],['INNER BULL',inner],['HAT TRICK',hats],['TON 80',ton80],['HIGH TON',high]];
 return items.map(([label,n])=>'<div class="achievement-tile"><span>'+label+'</span><strong>'+n+'</strong></div>').join('');
}
function previousRounds(){
 if(runtime.aimPeriod==='all')return null;
 const N=Number(runtime.aimPeriod),b=runtime.allRecordedRounds(),prev=b.slice(Math.max(0,b.length-2*N),Math.max(0,b.length-N));
 return prev.length===N?prev:null;
}
function orderStats(ds){
 return [1,2,3].map(i=>{const a=ds.filter(d=>d.dartIndex===i),b=a.filter(runtime.isHit).length;
  return {i,n:a.length,bulls:b,ib:a.filter(d=>d.segment==='IB').length,rate:a.length?Math.round(b/a.length*100):null,avg:a.length?Math.round(runtime.sum(a)/a.length*10)/10:null,ci:wilson(b,a.length)}});
}
function orderVerdict(data){
 const valid=data.filter(x=>x.n);
 if(valid.length<2)return {text:'—',best:null,weak:null,tag:''};
 const best=valid.reduce((a,b)=>b.rate>a.rate?b:a),weak=valid.reduce((a,b)=>b.rate<a.rate?b:a),anyRef=valid.some(x=>x.n<runtime.REF_MIN);
 if(best.rate===weak.rate)return {text:'EVEN',best,weak,tag:anyRef?'REF':''};
 return {text:'BEST · DART '+best.i+'　/　LOW · DART '+weak.i,best,weak,tag:anyRef?'REF':best.ci[0]>weak.ci[1]?'CLEAR DIFF':'NO CLEAR DIFF'};
}
function renderThrowOrder(){
 const data=orderStats(runtime.selectedDarts()),v=orderVerdict(data);
 const cards=data.map(d=>statCard('DART '+d.i,d.rate===null?'—':d.rate+'%',['BULL '+d.bulls+'/'+d.n,'RANGE '+(d.ci?d.ci[0]+'–'+d.ci[1]+'%':'—'),runtime.hitAim==='BULL'?'IB '+d.ib+'/'+d.bulls:'','AVG '+(d.avg===null?'—':d.avg)].filter(Boolean),badge(d.n))).join('');
 runtime.$('advancedThrowOrder').innerHTML='<div class="throw-order-grid">'+cards+'</div><div class="throw-order-verdict">'+v.text+(v.tag?'　·　'+v.tag:'')+'</div><div class="tiny muted">RANGE = 95% 信頼区間'+(runtime.hitAim==='BULL'?' · IB = BULLのうちINNER':'')+'</div>';
}
function dartStats(ds){
 return [1,2,3].map(i=>{
  const a=ds.filter(d=>d.dartIndex===i),pts=a.map(runtime.aimPoint).filter(Boolean),mx=runtime.medianOf(pts.map(p=>p.x)),my=runtime.medianOf(pts.map(p=>p.y));
  return {i,n:a.length,np:pts.length,mx,my,off:Math.hypot(mx,my),spread:pts.length?runtime.mean(pts.map(p=>Math.hypot(p.x-mx,p.y-my))):null};
 });
}
function renderDrift(){
 const st=dartStats(runtime.selectedDarts());
 const cards=st.map(s=>statCard('DART '+s.i,s.np?arrowOf(s.mx,s.my):'—',[s.np?runtime.driftWord(s.mx,s.my):'—','OFFSET '+(s.np?s.off.toFixed(2):'—'),'SPREAD '+(s.spread===null?'—':s.spread.toFixed(2))],badge(s.np))).join('');
 runtime.$('advancedDrift').innerHTML='<div class="throw-order-grid drift">'+cards+'</div><div class="tiny muted">セグメント推定 · MISS・ZONE不明は除外 · n '+st.map(s=>s.np).join(' / ')+'</div>';
}
function afterStats(rounds){
 const g={bull:[0,0],miss:[0,0],other:[0,0]};
 for(const r of rounds)for(let k=1;k<3;k++){const p=r[k-1],c=r[k];if(!p||!c)continue;const key=runtime.isHit(p)?'bull':p.segment==='MISS'?'miss':'other';g[key][1]++;if(runtime.isHit(c))g[key][0]++}
 return [['AFTER BULL','bull'],['AFTER MISS','miss'],['AFTER OTHER','other']].map(([label,key])=>({label,k:g[key][0],n:g[key][1],rate:g[key][1]?Math.round(g[key][0]/g[key][1]*100):null,ci:wilson(g[key][0],g[key][1])}));
}
function renderAfter(rounds){
 const st=afterStats(rounds);
 const cards=st.map(s=>statCard(s.label,s.rate===null?'—':s.rate+'%',['BULL '+s.k+'/'+s.n,'RANGE '+(s.ci?s.ci[0]+'–'+s.ci[1]+'%':'—')],badge(s.n))).join('');
 const b=st[0],m=st[1],gap=b.n&&m.n?b.rate-m.rate:null;
 runtime.$('advancedAfter').innerHTML='<div class="throw-order-grid">'+cards+'</div><div class="throw-order-verdict">'+(gap===null?'—':'BULL − MISS　'+(gap>0?'+':'')+gap+'pt'+(st.some(s=>s.n&&s.n<runtime.REF_MIN)?'　·　REF':''))+'</div><div class="tiny muted">同じラウンド内の次の1投 · OTHER = ブル以外の命中</div>';
 return st;
}
function roundStats(rounds){
 const by=Array.from({length:8},()=>[]);
 for(const r of rounds){const i=r[0]&&r[0].roundIndex;if(Number.isInteger(i)&&i>=1&&i<=8)by[i-1].push(runtime.sum(r))}
 const avg=a=>a.length?runtime.mean(a):null,first=by.slice(0,4).flat(),second=by.slice(4).flat(),all=by.flat();
 return {by,avgs:by.map(avg),first:{n:first.length,avg:avg(first)},second:{n:second.length,avg:avg(second)},all,avg:avg(all)};
}
function renderRoundScore(rs,prev){
 const max=Math.max(1,...rs.avgs.filter(x=>x!==null));
 const rows=rs.avgs.map((a,i)=>advBar('R'+(i+1),a||0,max,a===null?'—':Math.round(a)+' · '+rs.by[i].length+'R','wide'+(rs.by[i].length&&rs.by[i].length<3?' dim':''))).join('');
 const prevAvg=prev&&prev.length?runtime.mean(prev.map(runtime.sum)):null,d=rs.avg!==null&&prevAvg!==null?Math.round((rs.avg-prevAvg)*10)/10:null;
 const halves=rs.first.avg!==null&&rs.second.avg!==null?'R1–4 '+Math.round(rs.first.avg)+'　/　R5–8 '+Math.round(rs.second.avg)+'　('+(rs.second.avg-rs.first.avg>=0?'+':'')+Math.round(rs.second.avg-rs.first.avg)+')'+(Math.min(rs.first.n,rs.second.n)<12?'　·　REF':''):'—';
 const buckets=[['0–29',0,29],['30–59',30,59],['60–99',60,99],['100–149',100,149],['150+',150,180]].map(([l,lo,hi])=>[l,rs.all.filter(x=>x>=lo&&x<=hi).length]);
 const top=Math.max(1,...buckets.map(b=>b[1]));
 runtime.$('advancedRoundScore').innerHTML='<div class="advanced-big">'+(rs.avg===null?'—':rs.avg.toFixed(1))+'</div><div class="tiny muted">AVG / ROUND'+(d===null?'':' · '+signed(d)+' VS PREV')+'</div>'+rows+'<div class="advanced-sub">HALF</div><div class="throw-order-verdict">'+halves+'</div><div class="advanced-sub">DISTRIBUTION</div>'+buckets.map(([l,n])=>advBar(l,n,top,n+' · '+(rs.all.length?Math.round(n/rs.all.length*100):0)+'%','wide')).join('')+'<div class="tiny muted">薄い行 = 3R未満（参考）</div>';
}
function renderBreakdown(ds){
 const cats=[['IN BULL',d=>d.segment==='IB'],['OUT BULL',d=>d.segment==='OB'],['TRIPLE',d=>d.segment[0]==='T'],['DOUBLE',d=>d.segment[0]==='D'],['SINGLE',d=>d.segment[0]==='S'],['MISS',d=>d.segment==='MISS']];
 const total=runtime.sum(ds);
 runtime.$('advancedBreakdown').innerHTML='<div class="tiny muted">TOTAL '+total+' pt · '+ds.length+'投</div>'+cats.map(([l,f])=>{const a=ds.filter(f),p=runtime.sum(a);return advBar(l,p,total,(total?Math.round(p/total*100):0)+'% · '+a.length+'投','wide')}).join('');
}
function paceStats(rounds){
 const iv=[];
 for(const r of rounds)for(let k=1;k<3;k++){const dt=(Date.parse(r[k].timestamp)-Date.parse(r[k-1].timestamp))/1000;if(dt>0&&dt<=120)iv.push({dt,bull:runtime.isHit(r[k])})}
 if(iv.length<6)return null;
 const med=runtime.medianOf(iv.map(x=>x.dt)),f=a=>({n:a.length,k:a.filter(x=>x.bull).length});
 return {med,fast:f(iv.filter(x=>x.dt<=med)),slow:f(iv.filter(x=>x.dt>med))};
}
function renderPace(rounds){
 const p=paceStats(rounds);
 if(!p){runtime.$('advancedPace').innerHTML='<div class="advanced-big">—</div><div class="tiny muted">投球間隔が6区間以上たまると表示</div>';return}
 const rt=x=>x.n?Math.round(x.k/x.n*100)+'%':'—';
 runtime.$('advancedPace').innerHTML='<div class="throw-order-grid">'+statCard('MEDIAN',p.med.toFixed(1)+'s',['DART間隔'])+statCard('FAST',rt(p.fast),['BULL '+p.fast.k+'/'+p.fast.n,'≦ '+p.med.toFixed(1)+'s'],badge(p.fast.n))+statCard('SLOW',rt(p.slow),['BULL '+p.slow.k+'/'+p.slow.n,'> '+p.med.toFixed(1)+'s'],badge(p.slow.n))+'</div><div class="tiny muted">同じラウンド内、前の投球からの入力間隔 · 120秒超は除外</div>';
}
function renderLog(){
 const byDay=new Map();
 for(const d of runtime.all().concat(runtime.isCountup(runtime.store.active)?runtime.store.active.darts:[])){if(!d.timestamp||isNaN(Date.parse(d.timestamp)))continue;const k=dayKey(d.timestamp);byDay.set(k,(byDay.get(k)||0)+1)}
 const today=new Date(),cells=[];
 for(let i=34;i>=0;i--){const t=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i),k=dayKey(t),n=byDay.get(k)||0;cells.push({k,n,t,today:i===0})}
 const level=n=>n===0?0:n<24?1:n<72?2:n<144?3:4;
 const days28=cells.slice(-28).filter(c=>c.n>0).length;
 let streak=0,i=cells.length-1;if(!cells[i].n)i--;while(i>=0&&cells[i].n>0){streak++;i--}
 const sinceMon=(today.getDay()+6)%7,week=cells.slice(-(sinceMon+1)).reduce((a,c)=>a+c.n,0);
 runtime.$('advancedLog').innerHTML='<div class="throw-order-grid">'+statCard('DAYS',days28+'/28',['LAST 28D'])+statCard('STREAK',streak,['DAYS'])+statCard('THIS WEEK',week,['DARTS'])+'</div><div class="practice-grid">'+cells.map(c=>'<div class="practice-cell l'+level(c.n)+(c.today?' today':'')+'" title="'+(c.t.getMonth()+1)+'/'+c.t.getDate()+'：'+c.n+'投"></div>').join('')+'</div><div class="tiny muted">直近35日 · 色の濃さ = 投数</div>';
}
function renderConditions(){
 const gs=runtime.finished().slice().sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
 if(!gs.length){runtime.$('advancedConditions').innerHTML='<div class="advanced-big">—</div>';return}
 const seen={},rows=gs.map(s=>{const k=dayKey(s.startedAt);seen[k]=(seen[k]||0)+1;return {score:runtime.sum(s.darts),h:new Date(s.startedAt).getHours(),nth:seen[k]}});
 const group=(title,defs)=>{
  const stats=defs.map(([l,f])=>{const a=rows.filter(f);return {l,g:a.length,avg:a.length?runtime.mean(a.map(x=>x.score)):null}}),max=Math.max(1,...stats.map(s=>s.avg||0));
  return '<div class="advanced-sub">'+title+'</div>'+stats.map(s=>advBar(s.l,s.avg||0,max,s.avg===null?'—':Math.round(s.avg)+' · '+s.g+'G','wide'+(s.g&&s.g<3?' dim':''))).join('');
 };
 runtime.$('advancedConditions').innerHTML=group('TIME OF DAY',[['MORNING',x=>x.h>=5&&x.h<11],['DAY',x=>x.h>=11&&x.h<17],['EVENING',x=>x.h>=17&&x.h<22],['NIGHT',x=>x.h>=22||x.h<5]])+group('GAME OF THE DAY',[['1ST',x=>x.nth===1],['2ND',x=>x.nth===2],['3RD+',x=>x.nth>=3]])+'<div class="tiny muted">MORNING 5–11 · DAY 11–17 · EVENING 17–22 · NIGHT 22–5 / 平均スコア · G=ゲーム数 · 薄い行は3G未満(参考)</div>';
}
function renderGoal(){
 const input=runtime.$('goalInput');if(input&&document.activeElement!==input)input.value=runtime.store.goalScore||'';
 const gs=runtime.finished().slice().sort((a,b)=>a.startedAt.localeCompare(b.startedAt)),sc=gs.map(s=>runtime.sum(s.darts)),body=runtime.$('advancedGoalBody');
 if(!sc.length){body.innerHTML='<div class="advanced-big">—</div>';return}
 const last=sc.slice(-10),avg=runtime.mean(last),sd=Math.sqrt(runtime.mean(last.map(x=>(x-avg)*(x-avg)))),latest=sc[sc.length-1],rank=sc.filter(x=>x>latest).length+1,top=Math.ceil(rank/sc.length*100);
 const ref=last.length<5?'<em title="5ゲーム未満は参考値">REF</em>':'';
 let goal='';
 if(runtime.store.goalScore>0){const gap=Math.round(runtime.store.goalScore-avg);goal=advBar('GOAL',avg,runtime.store.goalScore,Math.round(avg/runtime.store.goalScore*100)+'%','wide')+'<div class="throw-order-verdict">'+(gap>0?'GAP '+gap+' pt':'REACHED +'+(-gap)+' pt')+'</div>'}
 body.innerHTML='<div class="throw-order-grid">'+statCard('AVG',Math.round(avg),['LAST '+last.length+'G'],ref)+statCard('SD',Math.round(sd),['ばらつき'])+statCard('BEST',Math.max(...last),['MIN '+Math.min(...last),'LAST '+last.length+'G'])+'</div><div class="tiny muted">LATEST '+latest+' · TOP '+top+'% of '+sc.length+'G</div>'+goal;
}
function renderBestVsAvg(){
 const gs=runtime.finished(),root=runtime.$('advancedBestVsAvg');
 if(gs.length<2){root.innerHTML='<div class="advanced-big">—</div><div class="tiny muted">2ゲーム以上で表示</div>';return}
 const per=s=>Array.from({length:8},(_,i)=>runtime.sum(s.darts.slice(i*3,i*3+3))),all=gs.map(per),best=gs.reduce((a,b)=>runtime.sum(b.darts)>runtime.sum(a.darts)?b:a),bestR=per(best);
 const avgR=bestR.map((_,i)=>runtime.mean(all.map(r=>r[i]))),max=Math.max(1,...avgR,...bestR);
 root.innerHTML='<div class="tiny muted">BEST '+runtime.sum(best.darts)+' vs AVG '+Math.round(runtime.mean(gs.map(s=>runtime.sum(s.darts))))+' · '+gs.length+'G</div><div class="tiny muted">棒 = 平均 / 黄線 = ベスト</div>'+bestR.map((b,i)=>{const diff=Math.round(b-avgR[i]);return '<div class="advanced-bar wide"><span>R'+(i+1)+'</span><div class="track has-mark"><div class="fill" style="width:'+(avgR[i]/max*100).toFixed(1)+'%"></div><i class="mark" style="left:'+(b/max*100).toFixed(1)+'%"></i></div><strong>'+(diff>=0?'+':'')+diff+'</strong></div>'}).join('');
}
function renderInsight(ctx){
 const items=[],{order,verdict:v,drift,after,rs}=ctx;
 if(v.best&&v.weak&&v.best.rate-v.weak.rate>=10)items.push({fact:'BULL  DART '+v.best.i+' '+v.best.rate+'%　/　DART '+v.weak.i+' '+v.weak.rate+'%',ref:v.tag==='REF',hyp:'DART '+v.weak.i+' の精度が下がっている可能性。サンプルが少ないうちは偶然の幅があります。',tryIt:'DART '+v.weak.i+' の前に構えを確認し、20R分ためて再確認。'});
 const dr=drift.filter(s=>s.np>=10&&s.off>=.2).sort((a,b)=>b.off-a.off)[0];
 if(dr)items.push({fact:'DART '+dr.i+'  '+runtime.driftWord(dr.mx,dr.my)+'  OFFSET '+dr.off.toFixed(2),ref:dr.np<runtime.REF_MIN,hyp:'その方向に着弾が偏っている可能性。狙いはブルとして見ています。',tryIt:'DART '+dr.i+' だけ、次の10投で反対方向を少し意識して変化を見る。'});
 const [ab,am]=after;
 if(ab.n>=10&&am.n>=10&&Math.abs(ab.rate-am.rate)>=15){const lower=am.rate<ab.rate;items.push({fact:'AFTER BULL '+ab.rate+'%　/　AFTER MISS '+am.rate+'%',ref:ab.n<runtime.REF_MIN||am.n<runtime.REF_MIN,hyp:lower?'外した直後に崩れやすい可能性。':'外した後のほうが集中している可能性。',tryIt:lower?'外した次の1投の前に一拍置く。':''})}
 if(rs.first.n>=6&&rs.second.n>=6&&Math.abs(rs.first.avg-rs.second.avg)>=8){const fade=rs.first.avg>rs.second.avg;items.push({fact:'R1–4 '+Math.round(rs.first.avg)+'　/　R5–8 '+Math.round(rs.second.avg),ref:Math.min(rs.first.n,rs.second.n)<12,hyp:fade?'後半に落ちやすい可能性。':'序盤が立ち上がりきっていない可能性。',tryIt:fade?'R4とR5の間に一呼吸入れて比較。':'R1の前に数投の素振りを入れて比較。'})}
 const top=items.slice(0,3),panel=runtime.$('insightPanel'),fp=items.find(x=>x.tryIt);
 runtime.$('focusPanel').classList.toggle('hidden',!fp);
 runtime.$('focusBody').innerHTML=fp?'<div class="focus-line">'+fp.tryIt+'</div><div class="focus-fact tiny muted">'+fp.fact+(fp.ref?' <em title="参考値">REF</em>':'')+'</div>':'';
 panel.classList.toggle('hidden',!top.length);
 runtime.$('insightBody').innerHTML=top.map(x=>'<div class="insight-fact"><span class="insight-tag">FACT</span><span>'+x.fact+(x.ref?' <em title="参考値">REF</em>':'')+'</span></div>').join('')+(top.length?'<details class="insight-next"><summary>NEXT</summary>'+top.map(x=>'<p><b>HYPOTHESIS</b> '+x.hyp+(x.tryIt?'<br><b>TRY</b> '+x.tryIt:'')+'</p>').join('')+'</details>':'');
}
function renderMore(rounds,ds,prev){
 const order=orderStats(ds),verdict=orderVerdict(order),drift=dartStats(ds),rs=roundStats(rounds);
 renderDrift();
 const after=renderAfter(rounds);
 renderRoundScore(rs,prev);renderBreakdown(ds);renderPace(rounds);
 renderGoal();renderBestVsAvg();renderConditions();renderLog();
 renderInsight({order,verdict,drift,after,rs});
}
Object.assign(runtime,{scopeMetrics,renderAdvanced,personalRecords,achievementTotals,previousRounds,orderStats,orderVerdict,renderThrowOrder,dartStats,afterStats,roundStats,renderMore});
function initialize(){
document.addEventListener('click',e=>{const sb=e.target.closest('[data-aim-sel]');if(sb){runtime.analysisAim=sb.dataset.aimSel;runtime.renderAnalysis();return}const b=e.target.closest('[data-aim-period]');if(b){runtime.aimPeriod=b.dataset.aimPeriod;runtime.renderAnalysis()}});
runtime.REF_MIN=20;
runtime.mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
runtime.medianOf=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?(s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2):0};
wilson=(k,n)=>{if(!n)return null;const z=1.96,p=k/n,d=1+z*z/n,c=p+z*z/(2*n),m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return [Math.max(0,Math.round((c-m)/d*100)),Math.min(100,Math.round((c+m)/d*100))]};
arrowOf=(x,y)=>{if(Math.hypot(x,y)<.08)return '●';const deg=(Math.atan2(y,x)*180/Math.PI+450)%360;return ['↑','↗','→','↘','↓','↙','←','↖'][Math.round(deg/45)%8]};
runtime.driftWord=(x,y)=>{const w=(Math.abs(y)<.08?'':y>0?'下':'上')+(Math.abs(x)<.08?'':x>0?'右':'左');return w?w+'寄り':'中央'};
badge=n=>n>0&&n<runtime.REF_MIN?'<em title="'+runtime.REF_MIN+'投未満は参考値">REF</em>':'';
signed=(v,unit='')=>(v>0?'▲ +'+v:v<0?'▼ '+v:'＝ 0')+unit;
advBar=(label,value,max,extra='',cls='')=>'<div class="advanced-bar '+cls+'"><span>'+label+'</span><div class="track"><div class="fill" style="width:'+(max?Math.min(100,value/max*100):0).toFixed(1)+'%"></div></div><strong>'+extra+'</strong></div>';
statCard=(label,big,lines=[],ref='')=>'<div class="throw-order-card"><div class="throw-order-label">'+label+ref+'</div><strong>'+big+'</strong>'+lines.map(t=>'<span>'+t+'</span>').join('')+'</div>';
dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
document.addEventListener('change',e=>{if(e.target&&e.target.id==='goalInput'){const v=Math.round(Number(e.target.value));runtime.store.goalScore=v>0&&v<=1440?v:null;runtime.persist();runtime.profTouch();runtime.renderAnalysis()}});
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectAdvanced=connectAdvanced;
})();

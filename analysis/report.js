// analysis/report: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectReport(runtime){
let reportTimer,lastReport;
function buildReport(rounds,ds,prev){
 const R=rounds.length,N=ds.length,label=runtime.aimPeriod==='all'?'ALL':runtime.aimPeriod+'R',head=label+' · '+(runtime.aimPeriod!=='all'&&R===Number(runtime.aimPeriod)?'':R+'R / ')+N+'投';
 const order=runtime.orderStats(ds),v=runtime.orderVerdict(order),drift=runtime.dartStats(ds),after=runtime.afterStats(rounds),rs=runtime.roundStats(rounds);
 const anyRef=order.some(x=>x.n>0&&x.n<runtime.REF_MIN);
 const conf={k:'CONFIDENCE',label:'信頼度',lines:['データ量：'+N+'投。'+(N===0?'':anyRef?'投球順ごとに20投未満の項目があり、参考値として読んでください（REF）。':'投球順ごとに20投以上あります。'),'着弾位置はセグメントからの推定で、狙いはブル前提で見ています。','この文章は数値をもとにしたルール式の自動生成で、AIモデルによる判断ではありません。']};
 if(R<3)return {head,sections:[{k:'SUMMARY',label:'総評',lines:['まだデータが少なく（'+R+'R / '+N+'投）、傾向は読み取れません。','3ラウンド（9投）以上、できれば1ゲーム（24投）を完走すると、投球順の比較が見られます。']},conf]};
 const bulls=ds.filter(runtime.isHit).length,diff=prev?Math.round((runtime.hitRate(ds)-runtime.hitRate(prev.flat()))*10)/10:null;
 const trend=diff===null?'比較できる直前の期間はまだありません。':Math.abs(diff)<3?'直前の同じ長さの期間とほぼ同じです（'+(diff>=0?'+':'')+diff+'pt）。':diff>0?'直前の同じ長さの期間より '+diff+'pt 上がっています。':'直前の同じ長さの期間より '+(-diff)+'pt 下がっています。';
 const scores=runtime.finished().slice().sort((a,b)=>a.startedAt.localeCompare(b.startedAt)).map(s=>runtime.sum(s.darts)),latest=scores[scores.length-1];
 const summary=['ブル率は '+runtime.hitRate(ds)+'%（'+bulls+'/'+N+'投）。'+trend,'1ラウンドの平均は '+Math.round(runtime.mean(rounds.map(runtime.sum)))+' 点。'+(scores.length>=3?'直近のゲーム '+latest+' 点は、全 '+scores.length+' ゲーム中で上位 '+Math.ceil((scores.filter(x=>x>latest).length+1)/scores.length*100)+'% です。':'')];
 const strengths=[],focus=[],drills=[];
 const best=v.best,weak=v.weak,gap=best&&weak?best.rate-weak.rate:0;
 if(gap>=10)strengths.push('DART '+best.i+' のブル率が最も高く '+best.rate+'% です（DART '+weak.i+' は '+weak.rate+'%）。'+(v.tag==='CLEAR DIFF'?'':'差はまだ参考値です。'));
 if(diff!==null&&diff>=3)strengths.push('ブル率が直前の期間より '+diff+'pt 上がっています。');
 const hats=rounds.filter(r=>r.every(runtime.isHit)).length,tons=rounds.filter(r=>runtime.sum(r)>=100).length;
 if(hats)strengths.push('3投すべてブルのラウンド（HAT TRICK）が '+hats+' 回あります。');
 else if(tons)strengths.push('100点以上のラウンドが '+tons+' 回あります。');
 const pts=ds.map(runtime.aimPoint).filter(Boolean);
 if(pts.length>=20){const mx=runtime.medianOf(pts.map(p=>p.x)),my=runtime.medianOf(pts.map(p=>p.y)),tight=Math.round(pts.filter(p=>Math.hypot(p.x-mx,p.y-my)<=.45).length/pts.length*100);if(tight>=50)strengths.push('着弾のまとまりが良好です（中央値から近い範囲に '+tight+'%）。')}
 const [ab,am]=after;
 if(ab.n>=10&&am.n>=10&&am.rate>=ab.rate)strengths.push('外した直後のブル率（'+am.rate+'%）が、ブル直後（'+ab.rate+'%）と同程度以上で、崩れにくい傾向です。');
 if(gap>=10){const clear=v.tag==='CLEAR DIFF';focus.push('DART '+weak.i+' のブル率が低めです（'+weak.rate+'%、DART '+best.i+' は '+best.rate+'%）。'+(clear?'差は偶然の幅を超えています。':'差は偶然の幅に収まる可能性があります。')+'この投目で精度が下がっているのかもしれません。');drills.push('DART '+weak.i+' の前に構えと立ち位置を確認し、10ラウンド分を同じ条件で比べる。')}
 const dr=drift.filter(s=>s.np>=10&&s.off>=.2).sort((a,b)=>b.off-a.off)[0];
 if(dr){focus.push('DART '+dr.i+' は '+runtime.driftWord(dr.mx,dr.my)+' に着弾が偏っています（OFFSET '+dr.off.toFixed(2)+'）。狙いはブル前提です。');drills.push('DART '+dr.i+' だけ、10投のあいだ反対方向を少し意識して変化を見る。')}
 if(ab.n>=10&&am.n>=10&&am.rate<=ab.rate-15){focus.push('外した直後のブル率が低めです（AFTER MISS '+am.rate+'%、AFTER BULL '+ab.rate+'%）。外した後に力みやすいのかもしれません。');drills.push('外した次の1投の前に、一拍置いてから構える。')}
 if(rs.first.n>=6&&rs.second.n>=6){const d=rs.first.avg-rs.second.avg;
  if(d>=8){focus.push('後半が落ちています（R1–4 平均 '+Math.round(rs.first.avg)+'、R5–8 平均 '+Math.round(rs.second.avg)+'）。集中や体力が切れているのかもしれません。');drills.push('R4とR5のあいだに水分補給や深呼吸を入れて、後半を比べる。')}
  else if(d<=-8){focus.push('序盤が低めです（R1–4 平均 '+Math.round(rs.first.avg)+'、R5–8 平均 '+Math.round(rs.second.avg)+'）。立ち上がりに時間がかかっているのかもしれません。');drills.push('1ゲーム目の前に数投の素振りを入れて、R1–4 を比べる。')}}
 const miss=ds.filter(d=>d.segment==='MISS').length;
 if(N>=12&&miss/N>=.15){focus.push('MISS が '+miss+' 投あります（'+Math.round(miss/N*100)+'%）。場外やバウンスアウト、入力の取りこぼしが混ざっているかもしれません。');drills.push('MISS になった理由を数ゲームだけ思い出してメモする。')}
 if(!strengths.length)strengths.push('際立った強みは、まだデータから見つかっていません。');
 if(!focus.length){focus.push('大きな偏りや落ち込みは見つかっていません。');drills.push('同じ条件で投げ続けて、データをためてから見直す。')}
 if(anyRef&&drills.length<3)drills.push('20ラウンド（60投）以上ためると、REF が外れて比較しやすくなります。');
 const rep=a=>a.map(runtime.AT);
 return {head,sections:[{k:'SUMMARY',label:'総評',lines:rep(summary.filter(Boolean))},{k:'STRENGTHS',label:'強み',lines:rep(strengths.slice(0,3))},{k:'FOCUS',label:'課題',lines:rep(focus.slice(0,3))},{k:'NEXT DRILL',label:'次の練習',lines:rep(drills.slice(0,3))},conf]};
}
function showReport(animate){
 if(reportTimer){clearInterval(reportTimer);reportTimer=null}
 const rounds=runtime.selectedRounds(),ds=rounds.flat(),rep=buildReport(rounds,ds,runtime.previousRounds()),root=runtime.$('reportBody'),items=[];
 lastReport=rep;root.textContent='';
 const meta=document.createElement('div');meta.className='report-meta';meta.textContent=rep.head;root.appendChild(meta);
 for(const s of rep.sections){
  const sec=document.createElement('section'),lab=document.createElement('div');sec.className='report-sec';lab.className='report-label';lab.textContent=s.k+' · '+s.label;sec.appendChild(lab);
  for(const text of s.lines){const p=document.createElement('p'),t=document.createElement('span'),rest=document.createElement('span');p.className='report-line';t.className='t';rest.className='rest';p.append(t,rest);sec.appendChild(p);items.push({p,t,rest,text})}
  root.appendChild(sec);
 }
 const paint=n=>{let left=n;for(const x of items){const k=Math.max(0,Math.min(x.text.length,left));x.t.textContent=x.text.slice(0,k);x.rest.textContent=x.text.slice(k);x.p.classList.toggle('typing',k>0&&k<x.text.length);left-=x.text.length}};
 const total=items.reduce((a,x)=>a+x.text.length,0),reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 root.dataset.done='0';
 if(!animate||reduce){paint(total);root.dataset.done='1';return}
 let shown=0;const step=Math.max(3,Math.ceil(total/90));paint(0);
 reportTimer=setInterval(()=>{shown+=step;paint(shown);if(shown>=total){clearInterval(reportTimer);reportTimer=null;root.dataset.done='1'}},30);
}
function renderReportState(){
 runtime.$('reportBody').classList.toggle('hidden',!runtime.reportOn);runtime.$('reportCopy').classList.toggle('hidden',!runtime.reportOn);
 runtime.$('reportBtn').textContent=runtime.reportOn?'REGENERATE':'GENERATE REPORT';
 if(runtime.reportOn)showReport(false);else{if(reportTimer){clearInterval(reportTimer);reportTimer=null}runtime.$('reportStatus').textContent=''}
}
Object.assign(runtime,{renderReportState});
function initialize(){
runtime.reportOn=false;
reportTimer=null;
lastReport=null;
runtime.$('reportBtn').onclick=()=>{runtime.reportOn=true;runtime.$('reportStatus').textContent='';runtime.$('reportBody').classList.remove('hidden');runtime.$('reportCopy').classList.remove('hidden');runtime.$('reportBtn').textContent='REGENERATE';showReport(true)};
runtime.$('reportCopy').onclick=async()=>{
 if(!lastReport)return;
 const text=[lastReport.head].concat(lastReport.sections.map(s=>'['+s.k+' '+s.label+']\n'+s.lines.map(l=>'・'+l).join('\n'))).join('\n\n');
 try{await navigator.clipboard.writeText(text);runtime.$('reportStatus').textContent='コピーしました'}catch(e){runtime.$('reportStatus').textContent='コピーできませんでした。文章を長押しして選択してください'}
};
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectReport=connectReport;
})();

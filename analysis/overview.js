// analysis/overview: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectOverview(runtime){
function bullBars(ds,aim){const A=aim||runtime.hitAim;return [1,2,3].map(i=>{const a=ds.filter(d=>d.dartIndex===i),k=a.filter(d=>runtime.aimHit(d,A)).length,p=a.length?Math.round(k/a.length*1000)/10:null;return '<div class="barrow"><span class="tiny">DART '+i+'</span><div class="track"><div class="fill" style="width:'+(p??0)+'%"></div></div><span class="tiny">'+(p===null?'—':p+'%')+' <span class="muted">('+k+'/'+a.length+')</span></span></div>'}).join('')}
function chart(ss){
 if(!ss.length)return '<div class="empty">—</div>';
 const ordered=ss.slice().reverse(),recent=ordered.slice(-20),scores=recent.map(s=>runtime.sum(s.darts));
 const width=640,height=215,left=44,right=16,top=20,bottom=30;
 const all=scores.map((_,i)=>{const absolute=ordered.length-recent.length+i;return Math.round(ordered.slice(Math.max(0,absolute-9),absolute+1).reduce((n,s)=>n+runtime.sum(s.darts),0)/Math.min(10,absolute+1))});
 const ceiling=Math.max(200,Math.ceil(Math.max(...scores,...all)/100)*100),step=(width-left-right)/Math.max(1,scores.length-1);
 const x=i=>left+i*step,y=score=>top+(height-top-bottom)*(1-score/ceiling);
 const line=values=>values.map((n,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(n).toFixed(1)).join(' ');
 const grid=[0,.25,.5,.75,1].map(t=>{let val=Math.round(ceiling*t);return '<line x1="'+left+'" y1="'+y(val)+'" x2="'+(width-right)+'" y2="'+y(val)+'" stroke="#34505e" stroke-opacity=".5"/><text x="'+(left-9)+'" y="'+(y(val)+4)+'" text-anchor="end" fill="#93aab6" font-size="12">'+val+'</text>'}).join('');
 const dots=scores.map((n,i)=>'<circle cx="'+x(i)+'" cy="'+y(n)+'" r="4" fill="#e7fb67"><title>ゲーム '+(ordered.length-recent.length+i+1)+'：'+n+'点</title></circle>').join('');
 return '<div class="trend-chart" role="img" aria-label="直近'+scores.length+'ゲームのスコアと直近最大10ゲーム移動平均"><svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet">'+grid+'<path d="'+line(scores)+'" fill="none" stroke="#e7fb67" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="'+line(all)+'" fill="none" stroke="#67e9e5" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+dots+'</svg><div class="trend-legend"><span>● スコア</span><span>━ 直近最大10ゲーム移動平均</span></div><div class="tiny muted">古い順 → 新しい順 / 直近'+scores.length+'ゲーム</div></div>';
}
function sMetrics(ss){
 const latest=ss.slice(0,10),previous=ss.slice(10,20),avg=arr=>arr.length?Math.round(arr.reduce((n,s)=>n+runtime.sum(s.darts),0)/arr.length):null;
 const current=avg(latest),prior=avg(previous),delta=prior===null||current===null?null:current-prior;
 const darts=latest.flatMap(s=>s.darts),best=ss.length?Math.max(...ss.map(s=>runtime.sum(s.darts))):null;
 const metric=(label,value,detail)=>'<div class="panel metric"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="detail">'+detail+'</div></div>';
 return metric('直近10ゲーム平均',current??'—',latest.length+'ゲーム'+(delta===null?' / 比較データ待ち':(' / 前の10件比 '+(delta>=0?'+':'')+delta)))
 +metric('BULL率（直近10）',darts.length?runtime.rate(darts)+'%':'—',darts.filter(runtime.isBull).length+'/'+darts.length+'投')
 +metric('自己ベスト',best??'—','COUNT-UP / 24投')
 +metric('全期間平均',avg(ss)??'—',ss.length+'完走ゲーム');
}
Object.assign(runtime,{bullBars,chart});

return {};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectOverview=connectOverview;
})();

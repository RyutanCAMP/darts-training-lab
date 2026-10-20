// analysis/aim: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectAim(runtime){
let aimOrder;
function aimCenter(a){
 if(!a||a==='BULL')return {x:0,y:0};
 const idx=aimOrder.indexOf(Number(a.slice(1)));if(idx<0)return {x:0,y:0};
 const ang=(-90+idx*18)*Math.PI/180,r=a[0]==='T'?.54:.96;
 return {x:Math.cos(ang)*r,y:Math.sin(ang)*r};
}
function aimPoint(d){const p=aimPointRaw(d);if(!p)return null;const c=aimCenter(runtime.hitAim);return {x:p.x-c.x,y:p.y-c.y}}
function aimPointRaw(d){
 if(!d||d.segment==='MISS')return null;
 if(runtime.isBull(d))return {x:0,y:0};
 const n=Number(d.segment.slice(1)),idx=aimOrder.indexOf(n);
 if(idx<0)return null;
 if(d.segment[0]==='S'&&!/^S\d+[IO]$/.test(d.zone||''))return null; /* single without inner/outer zone: ring unknown, excluded from position estimates */
 const a=(-90+idx*18)*Math.PI/180;
 const r=d.segment[0]==='T'?.54:d.segment[0]==='D'?.96:d.zone?.endsWith('I')?.35:.79;
 return {x:Math.cos(a)*r,y:Math.sin(a)*r};
}
function renderAim(){
 const root=runtime.$('aimAnalysis');if(!root)return;
 const rounds=runtime.selectedRounds(),darts=rounds.flat(),pts=darts.map(aimPoint).filter(Boolean),rawPts=darts.map(aimPointRaw).filter(Boolean),tc=aimCenter(runtime.hitAim);
 const median=vals=>{const a=vals.sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):0};
 const missN=darts.filter(d=>d.segment==='MISS').length,unknownN=darts.length-pts.length-missN,excluded=[missN?'MISS '+missN:'',unknownN?'ZONE不明 '+unknownN:''].filter(Boolean);
 const mx=median(pts.map(p=>p.x)),my=median(pts.map(p=>p.y)),percent=f=>pts.length?Math.round(100*pts.filter(f).length/pts.length):0;
 const direction=pts.length?(((Math.abs(my)<.08?'':my>0?'下':'上')+(Math.abs(mx)<.08?'':mx>0?'右':'左'))||'中央'):'—';

 const ringOf=d=>{if(d.segment==='IB')return 'IB';if(d.segment==='OB')return 'OB';if(d.segment==='MISS')return null;if(d.segment[0]==='T'||d.segment[0]==='D')return d.segment[0];if(d.segment[0]==='S')return d.zone?.endsWith('I')?'SI':d.zone?.endsWith('O')?'SO':null;return null};
 const counts=new Map();
 for(const d of darts){const ring=ringOf(d);if(!ring)continue;const number=Number(d.segment.slice(1));const key=ring==='IB'||ring==='OB'?ring:(Number.isInteger(number)&&aimOrder.includes(number)?ring+number:null);if(key)counts.set(key,(counts.get(key)||0)+1)}
 const total=pts.length,maxCount=Math.max(1,...counts.values());
 const polar=(r,a)=>[130+r*Math.cos(a),130+r*Math.sin(a)];
 const sector=(idx,r0,r1)=>{const a=(-99+idx*18)*Math.PI/180,b=a+Math.PI/10,p1=polar(r1,a),p2=polar(r1,b),p3=polar(r0,b),p4=polar(r0,a);return 'M'+p1.join(' ')+' A'+r1+' '+r1+' 0 0 1 '+p2.join(' ')+' L'+p3.join(' ')+' A'+r0+' '+r0+' 0 0 0 '+p4.join(' ')+' Z'};
 const rings=[['SI',18,50,'INNER S'],['T',50,60,'TRIPLE'],['SO',60,91,'OUTER S'],['D',91,102,'DOUBLE']];
 const cells=rings.map(([ring,r0,r1,name])=>aimOrder.map((number,idx)=>{const count=counts.get(ring+number)||0,share=total?count/total*100:0,opacity=count?(.15+.8*count/maxCount):0;return '<path d="'+sector(idx,r0,r1)+'" fill="#67e9e5" fill-opacity="'+opacity.toFixed(3)+'" stroke="#254758" stroke-width=".7"><title>'+name+' '+number+'：'+share.toFixed(1)+'% ('+count+'投)</title></path>'}).join('')).join('');
 const bulls=[['OB',9,18],['IB',0,9]].map(([ring,r0,r1])=>{const count=counts.get(ring)||0,share=total?count/total*100:0,opacity=count?(.15+.8*count/maxCount):0;return '<circle cx="130" cy="130" r="'+r1+'" fill="#67e9e5" fill-opacity="'+opacity.toFixed(3)+'" stroke="#456477"><title>'+ring+'：'+share.toFixed(1)+'% ('+count+'投)</title></circle>'}).join('');
 const svg='<svg viewBox="0 0 260 260" role="img" aria-label="内外シングル・トリプル・ダブル別ヒートマップ">'+cells+bulls+'<circle cx="'+(130+tc.x*102).toFixed(1)+'" cy="'+(130+tc.y*102).toFixed(1)+'" r="11" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3"><title>AIM '+runtime.hitAim+'</title></circle>'+(pts.length?'<circle cx="'+(130+median(rawPts.map(p=>p.x))*102).toFixed(1)+'" cy="'+(130+median(rawPts.map(p=>p.y))*102).toFixed(1)+'" r="7" fill="#e7fb67" stroke="#091622" stroke-width="2"/>':'')+'<text x="130" y="14" text-anchor="middle" fill="#b5ccd4" font-size="12">上</text><text x="130" y="255" text-anchor="middle" fill="#b5ccd4" font-size="12">下</text><text x="12" y="135" text-anchor="middle" fill="#b5ccd4" font-size="12">左</text><text x="248" y="135" text-anchor="middle" fill="#b5ccd4" font-size="12">右</text></svg>';
 const stat=(label,num)=>'<div class="aim-stat"><span>'+label+'</span><strong>'+num+'%</strong></div>';
 root.innerHTML='<div class="aim-heat-key"><span>LOW</span><i></i><span>HIGH</span></div><div class="aim-layout"><div class="aim-visual">'+svg+'</div><div class="aim-results"><div class="aim-tendency">'+(direction==='中央'||direction==='—'?direction:direction+'寄り')+'</div><div class="tiny muted">'+rounds.length+'R · '+pts.length+'投 · AIM '+runtime.hitAim+' '+runtime.hitRate(darts)+'%'+(excluded.length?' · 除外 '+excluded.join(' / '):'')+'</div><div class="aim-stat-grid">'+stat('↑ 上',percent(p=>p.y<-.001))+stat('↓ 下',percent(p=>p.y>.001))+stat('← 左',percent(p=>p.x<-.001))+stat('→ 右',percent(p=>p.x>.001))+'</div></div></div><details class="aim-help"><summary>分析について</summary><p>色の濃さは内外シングル・T・D・BULL別の命中割合を最大エリア基準で表示。セグメント単位の推定であり、実際の着弾座標ではありません。MISSは位置不明として除外します。</p></details>';
}
Object.assign(runtime,{aimPoint,renderAim});
function initialize(){
runtime.aimPeriod='10';
aimOrder=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectAim=connectAim;
})();

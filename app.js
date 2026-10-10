
(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='dtl-data-v1',nums=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
let audioCtx=null;
let store={schemaVersion:1,sessions:[],active:null,bindings:{},roundDelay:8,soundEnabled:true},lastKey=null,keyLog=[],calibrationActive=false,calibrationIndex=0,calibrationLastIndex=-1,viewId=null,showResult=false,lastBoardEvent=0,roundBreakTimer=null,roundBreakUntil=0,saveOK=null,savedAt=null,justSaved=false;
try{const v=JSON.parse(localStorage.getItem(KEY));if(v&&v.schemaVersion===1&&Array.isArray(v.sessions))store={...store,...v}}catch(e){console.warn('Saved data invalid',e)}
function updateSaveIndicator(){const box=$('saveIndicator'),label=$('saveText');if(!box||!label)return;box.classList.toggle('save-error',saveOK===false);box.classList.toggle('save-pending',store.active.darts.length===24&&saveOK!==false);if(saveOK===false){label.textContent='保存失敗 — ブラウザの保存領域を確認';return}if(saveOK===null){label.textContent='未投球 — 投げると自動保存';return}const time=savedAt?new Date(savedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';label.textContent=store.active.darts.length===24?'入力保存済み · 確定待ち':'自動保存済み · '+time;}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(store));saveOK=true;savedAt=Date.now();updateSaveIndicator();return true}catch(e){saveOK=false;updateSaveIndicator();alert('保存に失敗しました。ブラウザの保存領域を確認してください。');return false}}
function id(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
function newSession(){return {id:id(),schemaVersion:1,gameType:'countup',startedAt:new Date().toISOString(),endedAt:null,status:'active',darts:[]}}
if(![5,8,10,15].includes(Number(store.roundDelay)))store.roundDelay=8;
if(!store.active)store.active=newSession();
if(localStorage.getItem(KEY)!==null){saveOK=true;savedAt=Date.now()}
if(store.active.darts.length===24)showResult=true;
const points=s=>s==='IB'?50:s==='OB'?50:s==='MISS'?0:Number(s.slice(1))*({S:1,D:2,T:3}[s[0]]||0);
const label=s=>s==='IB'?'INNER BULL':s==='OB'?'OUTER BULL':s==='MISS'?'MISS':({S:'SINGLE',D:'DOUBLE',T:'TRIPLE'}[s[0]]||'')+' '+s.slice(1);
const dartLabel=d=>d.zone&&/^S\\d+(I|O)$/.test(d.zone)?'SINGLE '+d.segment.slice(1)+(d.zone.endsWith('I')?'（内側）':'（外側）'):label(d.segment);
const isBull=d=>d.segment==='IB'||d.segment==='OB';
const sum=ds=>ds.reduce((a,d)=>a+d.score,0);
const all=()=>store.sessions.flatMap(s=>s.darts);
const finished=()=>store.sessions.filter(s=>s.status==='completed');
const completedDarts=()=>finished().flatMap(s=>s.darts);
const rate=ds=>ds.length?Math.round(ds.filter(isBull).length/ds.length*1000)/10:0;
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const date=s=>new Date(s).toLocaleString('ja-JP');
const soundVolumes=store.soundVolumes||{hit:75,fx:80,bgm:25};
function soundLevel(k){return Math.max(0,Math.min(1,Number((store.soundVolumes||{})[k]??({hit:75,fx:80,bgm:25}[k]))/100))}
function audioReady(){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!audioCtx)audioCtx=new A();if(audioCtx.state==='suspended')audioCtx.resume().catch(()=>{});return audioCtx}

/* RETRO DARTS original audio engine - 100% procedural Web Audio synthesis */
let retroBus=null,retroDelay=null,retroDelayGain=null,retroTone=null,retroNoiseCache=null;
function retroInit(){
 if(retroBus&&retroBus.context===audioCtx)return;
 const ctx=audioCtx,compress=ctx.createDynamicsCompressor(),bus=ctx.createGain(),delay=ctx.createDelay(.6),feedback=ctx.createGain(),wet=ctx.createGain();
 compress.threshold.value=-19;compress.knee.value=15;compress.ratio.value=4;compress.attack.value=.004;compress.release.value=.18;
 bus.gain.value=.82;bus.connect(compress);compress.connect(ctx.destination);
 delay.delayTime.value=.19;feedback.gain.value=.17;wet.gain.value=.13;
 bus.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compress);
 retroBus=bus;retroDelay=delay;retroDelayGain=wet;retroTone=compress;retroNoiseCache={};
}
function retroVoice(freq,at,dur,vol,type='triangle',endFreq=null,cutoff=4500){
 const ctx=audioCtx,o=ctx.createOscillator(),lp=ctx.createBiquadFilter(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),at);
 if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),at+dur);
 lp.type='lowpass';lp.frequency.value=cutoff;
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),at+.008);
 g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 o.connect(lp);lp.connect(g);g.connect(retroBus);o.start(at);o.stop(at+dur+.025);
}
function retroNoise(at,dur,vol,low=550,high=6000){
 const ctx=audioCtx,sr=ctx.sampleRate,key=Math.round(dur*100),len=Math.ceil(sr*dur);
 let buf=retroNoiseCache[key];
 if(!buf){buf=ctx.createBuffer(1,len,sr);const d=buf.getChannelData(0);for(let i=0;i<len;i++)d[i]=Math.random()*2-1;retroNoiseCache[key]=buf}
 const src=ctx.createBufferSource(),hp=ctx.createBiquadFilter(),lp=ctx.createBiquadFilter(),g=ctx.createGain();
 src.buffer=buf;hp.type='highpass';hp.frequency.value=low;lp.type='lowpass';lp.frequency.value=high;
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),at+.004);
 g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 src.connect(hp);hp.connect(lp);lp.connect(g);g.connect(retroBus);src.start(at);src.stop(at+dur+.005);
}
function retroHit(at,amount=1,pitch=1){
 const h=amount*soundLevel('hit');
 retroNoise(at,.052,.19*h,300,2400);
 retroVoice(145*pitch,at,.095,.26*h,'sine',59*pitch,1400);
 retroVoice(490*pitch,at,.034,.07*h,'triangle',210*pitch,3100);
}
function retroNote(freq,at,dur,volume=.1){
 const v=volume*soundLevel('fx');
 retroVoice(freq,at,dur,v,'triangle',freq*.994);
 retroVoice(freq*2,at,dur*.65,v*.16,'sine');
}
function retroChord(freqs,at,dur,volume=.1){
 freqs.forEach((f,i)=>retroVoice(f,at,dur,volume*soundLevel('fx')/(1+i*.22),'sawtooth',f*.998,2600));
}
function retroSpark(at,amount=1){
 const v=amount*soundLevel('fx');
 retroNoise(at,.12,.12*v,1800,9000);
 retroVoice(1900,at,.11,.075*v,'square',670,5200);
}
function retroFanfare(at,kind){
 const notes=kind==='hat'?[523.25,659.25,783.99,1046.5,1318.51]:[392,523.25,659.25,783.99,1046.5];
 const times=kind==='hat'?[0,.115,.23,.345,.54]:[0,.14,.28,.42,.61];
 for(let i=0;i<notes.length;i++){
  const d=i===4?.44:.15;
  retroChord([notes[i],notes[i]*1.25,notes[i]*1.5],at+times[i],d,.085);
  retroNote(notes[i]*2,at+times[i],d*.82,.045);
 }
 retroNoise(at+.36,.32,.035*soundLevel('fx'),750,5000);
}
function playSound(kind='hit'){
 if(store.soundEnabled===false)return;
 try{
  if(!audioReady())return;
  retroInit();
  const at=audioCtx.currentTime+.012,fx=soundLevel('fx');
  if(['hit','double','triple','bull','inner','miss'].includes(kind))retroHit(at,kind==='miss'?.28:kind==='inner'?1.25:1,kind==='inner'?.78:1);
  if(kind==='miss'||kind==='hit')return;
  if(kind==='double'){retroNote(523.25,at+.025,.13,.085);retroNote(783.99,at+.105,.19,.1);return}
  if(kind==='triple'){retroSpark(at+.02,.75);retroChord([392,587.33,783.99],at+.035,.22,.115);retroNote(1174.66,at+.18,.23,.08);return}
  if(kind==='bull'){
   retroSpark(at+.025,.7);retroVoice(105,at,.26,.25*fx,'sine',55,800);
   retroChord([392,493.88,587.33],at+.045,.26,.115);
   retroNote(987.77,at+.18,.31,.15);return;
  }
  if(kind==='inner'){
   retroSpark(at+.015,1.15);retroVoice(92,at,.36,.32*fx,'sine',42,750);
   retroChord([392,493.88,587.33,783.99],at+.035,.33,.12);
   retroNote(987.77,at+.16,.3,.15);retroNote(1318.51,at+.35,.45,.18);
   retroNoise(at+.28,.24,.08*fx,1200,8500);return;
  }
  if(kind==='nice'){retroNote(659.25,at,.11,.09);retroNote(987.77,at+.105,.18,.10);return}
  if(kind==='round'){retroNote(440,at,.10,.065);retroNote(659.25,at+.12,.18,.08);return}
  retroFanfare(at,kind);
  retroSpark(at+.49,kind==='hat'?1.1:.75);
 }catch(e){console.warn('Retro sound unavailable',e)}
}
let bgmTimer=null,bgmStep=0;
function bgmNote(freq,duration=.18){if(!audioCtx||audioCtx.state!=='running')return;const now=audioCtx.currentTime;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;const volume=.09*soundLevel('bgm');gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+duration+.02)}
function bgmStop(){if(bgmTimer!==null){clearInterval(bgmTimer);bgmTimer=null}const b=$('musicToggle');if(b){b.textContent='BGM OFF';b.setAttribute('aria-pressed','false')}}
function bgmStart(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!audioCtx)audioCtx=new Audio();audioCtx.resume().catch(()=>{});bgmStep=0;const notes=[261.63,329.63,392,523.25,392,329.63,293.66,392,440,587.33,440,392,329.63,392,261.63,0];const tick=()=>{const f=notes[bgmStep++%notes.length];if(f)bgmNote(f)};tick();bgmTimer=setInterval(tick,360);$('musicToggle').textContent='BGM ON';$('musicToggle').setAttribute('aria-pressed','true')}catch(e){console.warn('BGM unavailable',e)}}
$('musicToggle').onclick=()=>{if(bgmTimer!==null)bgmStop();else bgmStart()};


let gameFxTimer=null;
function gameEffect(title,sub='',kind='nice',duration=1100){const box=$('gameFx');if(!box)return;clearTimeout(gameFxTimer);box.className='game-fx '+kind;const t=$('gameFxTitle'),u=$('gameFxSub');t.textContent=title;u.textContent=sub;void box.offsetWidth;box.classList.add('show');gameFxTimer=setTimeout(()=>box.classList.remove('show'),duration)}
function dismissStartup(){const s=$('startupFx');if(s){s.style.animation='none';s.style.opacity='0';s.style.visibility='hidden'}}
window.addEventListener('keydown',dismissStartup,{once:true});
window.addEventListener('pointerdown',dismissStartup,{once:true});

let roundBreakTicker=null;
function finishRoundBreak(){if(roundBreakTimer!==null){clearTimeout(roundBreakTimer);roundBreakTimer=null}if(roundBreakTicker!==null){clearInterval(roundBreakTicker);roundBreakTicker=null}roundBreakUntil=0;$('roundBreak').classList.add('hidden')}
/* Single-shot and round achievements are deliberately separate. */
function shotPraise(d){
 if(!d||d.segment==='MISS')return null;
 if(isBull(d))return {title:d.segment==='IB'?'INNER BULL!':'BULL!',kind:d.segment==='IB'?'inner':'bull'};
 if(d.segment==='T20')return {title:'TON 60!',kind:'nice'};
 if(d.segment.startsWith('T'))return {title:'TRIPLE!',kind:'nice'};
 if(d.segment.startsWith('D'))return {title:'DOUBLE!',kind:'nice'};
 return null;
}
function roundPraise(darts,score){
 if(darts.length!==3)return 'GOOD ROUND!';
 if(darts.every(isBull))return 'HAT TRICK!';
 if(darts.every(d=>d.segment==='T20'))return 'TON 80!';
 if(score>=151)return 'HIGH TON!';
 if(score>=100)return 'LOW TON!';
 if(darts.filter(isBull).length>=2)return 'DOUBLE BULL!';
 if(darts.some(isBull))return 'NICE BULL!';
 if(darts.some(d=>d.segment&&d.segment.startsWith('T')))return 'GREAT SHOT!';
 if(score>=60)return 'NICE ONE!';
 return 'GOOD ROUND!';
}
function beginRoundBreak(round,score,darts=[]){
 finishRoundBreak();
 const duration=Math.max(1,Number(store.roundDelay)||8),ms=duration*1000;
 $('roundBreakLabel').textContent='ROUND '+round+' CLEAR';
 $('roundBreakScore').textContent='+'+score;
 $('roundBreakPraise').textContent=roundPraise(darts,score);
 const isSpecial=darts.length===3&&(darts.every(isBull)||score>=100);
 const box=$('roundBreak'),progress=box.querySelector('.cool-progress'),count=$('roundBreakCountdown');
 box.classList.toggle('cool-special',isSpecial);box.classList.remove('hidden');
 roundBreakUntil=Date.now()+ms;
 const tick=()=>{const remaining=Math.max(0,roundBreakUntil-Date.now());count.textContent=String(Math.ceil(remaining/1000));if(progress)progress.style.strokeDashoffset=String(320.44*(1-remaining/ms));if(remaining<=0)finishRoundBreak()};
 tick();roundBreakTicker=setInterval(tick,50);roundBreakTimer=setTimeout(finishRoundBreak,ms);
}
function toast(s,type=''){const t=$('toast');t.textContent=s;t.classList.remove('award','bull','miss');if(type)t.classList.add(type)}
function changeTab(name){finishRoundBreak();if(name!=='history')justSaved=false;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));render()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
function flashBoardHit(segment,zone){if(segment==='MISS')return;const matching=[...$('board').querySelectorAll('svg .hit')].filter(el=>el.dataset.segment===(zone||segment));matching.forEach(el=>{el.classList.remove('flash-hit','flash-outer-bull','flash-inner-bull');void el.getBoundingClientRect();const cls=segment==='IB'?'flash-inner-bull':segment==='OB'?'flash-outer-bull':'flash-hit';el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),950)})}
function add(segment,source='manual',zone=null){if(roundBreakUntil>Date.now())return;let s=store.active;if(s.darts.length>=24){toast('結果確認後に保存してください');return}let i=s.darts.length;s.darts.push({id:id(),sessionId:s.id,roundIndex:Math.floor(i/3)+1,dartIndex:i%3+1,timestamp:new Date().toISOString(),segment,zone:zone||null,score:points(segment),inputSource:source,corrected:false});if(s.darts.length===24){showResult=true;const total=sum(s.darts),past=finished(),best=past.length?Math.max(...past.map(x=>sum(x.darts))):null;const first=best===null,record=best!==null&&total>best;playSound(record||first?'hat':'finish');if(record){gameEffect('NEW RECORD!',''+total+' POINTS  /  +'+(total-best)+' BEST','record',3800);toast('NEW RECORD!  '+total+' POINTS','award')}else if(first){gameEffect('FIRST CLEAR!',''+total+' POINTS','record',3100);toast('FIRST CLEAR!  '+total+' POINTS','award')}else{gameEffect('GAME COMPLETE','TOTAL '+total+' POINTS','finish',2000);toast('GAME COMPLETE!  '+total+' POINTS','award')}}else {
 const round=s.darts.slice(Math.floor(i/3)*3),score=sum(round),last=s.darts.at(-1),shot=shotPraise(last);
 const completeRound=round.length===3,award=completeRound?roundPraise(round,score):null;
 if(completeRound&&['HAT TRICK!','TON 80!','HIGH TON!','LOW TON!'].includes(award)){
  playSound(award==='HAT TRICK!'?'hat':'round');
  toast(award+'  +'+score+' POINTS','award');
 }else if(segment==='MISS'){
  playSound('miss');toast('MISS — NEXT DART','miss');
 }else{
  playSound(segment==='IB'?'inner':segment==='OB'?'bull':segment.startsWith('T')?'triple':segment.startsWith('D')?'double':'hit');
  toast((shot?shot.title:dartLabel(last))+'  +'+points(segment),isBull(last)?'bull':'');
  if(shot&&!completeRound)gameEffect(shot.title,'+'+points(segment)+' POINTS',shot.kind,850);
 }
 }persist();render();flashBoardHit(segment,zone);if(s.darts.length>0&&s.darts.length<24&&s.darts.length%3===0){const completedRound=s.darts.length/3;beginRoundBreak(completedRound,sum(s.darts.slice(-3)),s.darts.slice(-3))}if(s.darts.length===24)requestAnimationFrame(()=>{$('resultpanel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'});})}
function complete(status){let s=store.active;if(!s.darts.length)return false;const next=newSession();s.status=status;s.endedAt=new Date().toISOString();store.sessions.unshift(s);store.active=next;if(!persist()){store.active=s;store.sessions.shift();s.status='active';s.endedAt=null;return false}return true}
function startNew(){finishRoundBreak();if(store.active.darts.length===24){if(!confirm('現在の24投を完走として保存し、新しいゲームを始めますか？'))return;if(!complete('completed'))return}else if(store.active.darts.length){if(!confirm('進行中のゲームを途中終了として保存し、新しいゲームを始めますか？'))return;if(!complete('abandoned'))return}else store.active=newSession();showResult=false;persist();toast('NEW GAME — GOOD LUCK!');changeTab('play')}
function undo(){finishRoundBreak();if(!store.active.darts.length)return;store.active.darts.pop();showResult=false;persist();toast('直前の投球を取り消しました');render()}
function finishEarly(){if(!store.active.darts.length)return;if(store.active.darts.length===24){confirmResult();return}if(confirm('このゲームを途中終了として保存しますか？（完走平均には含みません）')){if(!complete('abandoned'))return;showResult=false;toast('途中終了として保存しました');render()}}
function confirmResult(){finishRoundBreak();if(store.active.darts.length!==24)return;let score=sum(store.active.darts);if(!complete('completed'))return;showResult=false;viewId=store.sessions[0].id;justSaved=true;toast('完走 '+score+' POINTS を履歴に保存しました');render();changeTab('history')}
function drawBoard(){const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-230 -230 460 460');svg.setAttribute('role','img');svg.setAttribute('aria-label','着弾位置を選択するダーツボード');function el(t,a){let n=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));svg.appendChild(n);return n}function xy(r,a){return [r*Math.sin(a),-r*Math.cos(a)]}function wedge(r1,r2,a1,a2){let p=xy(r1,a1),q=xy(r2,a1),r=xy(r2,a2),s=xy(r1,a2);return 'M'+p+' L'+q+' A'+r2+' '+r2+' 0 0 1 '+r+' L'+s+' A'+r1+' '+r1+' 0 0 0 '+p+' Z'}el('circle',{r:225,fill:'#0a121b',stroke:'#4b6879','stroke-width':4});for(let i=0;i<20;i++){let a=i*Math.PI/10,n=nums[i];for(let [r1,r2,ring] of [[17,100,'S'],[100,113,'T'],[113,172,'S'],[172,185,'D']]){let col=ring==='S'?(i%2?'#ddd9c9':'#27323a'):(i%2?'#d64b55':'#2eb28d');let p=el('path',{d:wedge(r1,r2,a-Math.PI/20,a+Math.PI/20),fill:col,stroke:'#72828b','stroke-width':.65,class:'hit',tabindex:'0',role:'button','data-segment':ring+n+(ring==='S'?(r2===100?'I':'O'):''),'aria-label':label(ring+n)});p.addEventListener('click',()=>add(ring+n,'manual',ring+n+(ring==='S'?(r2===100?'I':'O'):'')));p.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add(ring+n,'manual',ring+n+(ring==='S'?(r2===100?'I':'O'):''))}})}let [x,y]=xy(206,a),t=el('text',{x,y,fill:'#edf3fa','font-size':15,'font-weight':700,'text-anchor':'middle','dominant-baseline':'central','pointer-events':'none'});t.textContent=n}let ob=el('circle',{r:17,fill:'#1d9b7b',stroke:'#d9e0d8','stroke-width':1.5,class:'hit',role:'button',tabindex:'0','data-segment':'OB','aria-label':'OUTER BULL 25'});ob.onclick=()=>add('OB');ob.onkeydown=e=>{if(e.key==='Enter')add('OB')};let ib=el('circle',{r:7.7,fill:'#d94e5c',stroke:'#f0d2c6','stroke-width':1.5,class:'hit',role:'button',tabindex:'0','data-segment':'IB','aria-label':'INNER BULL 50'});ib.onclick=e=>{e.stopPropagation();add('IB')};ib.onkeydown=e=>{if(e.key==='Enter'){e.stopPropagation();add('IB')}};$('board').appendChild(svg)}
function bullBars(ds){return [1,2,3].map(i=>{let a=ds.filter(d=>d.dartIndex===i),p=rate(a);return '<div class="barrow"><span class="tiny">'+i+'投目</span><div class="track"><div class="fill" style="width:'+p+'%"></div></div><span class="tiny">'+p+'% <span class="muted">('+a.filter(isBull).length+'/'+a.length+')</span></span></div>'}).join('')}
function chart(ss){
 if(!ss.length)return '<div class="empty">完走ゲームを保存するとスコア推移が表示されます。</div>';
 const ordered=ss.slice().reverse(),recent=ordered.slice(-20),scores=recent.map(s=>sum(s.darts));
 const width=640,height=215,left=44,right=16,top=20,bottom=30;
 const all=scores.map((_,i)=>{const absolute=ordered.length-recent.length+i;return Math.round(ordered.slice(Math.max(0,absolute-9),absolute+1).reduce((n,s)=>n+sum(s.darts),0)/Math.min(10,absolute+1))});
 const ceiling=Math.max(200,Math.ceil(Math.max(...scores,...all)/100)*100),step=(width-left-right)/Math.max(1,scores.length-1);
 const x=i=>left+i*step,y=score=>top+(height-top-bottom)*(1-score/ceiling);
 const line=values=>values.map((n,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(n).toFixed(1)).join(' ');
 const grid=[0,.25,.5,.75,1].map(t=>{let val=Math.round(ceiling*t);return '<line x1="'+left+'" y1="'+y(val)+'" x2="'+(width-right)+'" y2="'+y(val)+'" stroke="#34505e" stroke-opacity=".5"/><text x="'+(left-9)+'" y="'+(y(val)+4)+'" text-anchor="end" fill="#93aab6" font-size="12">'+val+'</text>'}).join('');
 const dots=scores.map((n,i)=>'<circle cx="'+x(i)+'" cy="'+y(n)+'" r="4" fill="#e7fb67"><title>ゲーム '+(ordered.length-recent.length+i+1)+'：'+n+'点</title></circle>').join('');
 return '<div class="trend-chart" role="img" aria-label="直近'+scores.length+'ゲームのスコアと直近最大10ゲーム移動平均"><svg viewBox="0 0 '+width+' '+height+'" preserveAspectRatio="xMidYMid meet">'+grid+'<path d="'+line(scores)+'" fill="none" stroke="#e7fb67" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/><path d="'+line(all)+'" fill="none" stroke="#67e9e5" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>'+dots+'</svg><div class="trend-legend"><span>● スコア</span><span>━ 直近最大10ゲーム移動平均</span></div><div class="tiny muted">古い順 → 新しい順 / 直近'+scores.length+'ゲーム</div></div>';
}
function sMetrics(ss){
 const latest=ss.slice(0,10),previous=ss.slice(10,20),avg=arr=>arr.length?Math.round(arr.reduce((n,s)=>n+sum(s.darts),0)/arr.length):null;
 const current=avg(latest),prior=avg(previous),delta=prior===null||current===null?null:current-prior;
 const darts=latest.flatMap(s=>s.darts),best=ss.length?Math.max(...ss.map(s=>sum(s.darts))):null;
 const metric=(label,value,detail)=>'<div class="panel metric"><div class="label">'+label+'</div><div class="value">'+value+'</div><div class="detail">'+detail+'</div></div>';
 return metric('直近10ゲーム平均',current??'—',latest.length+'ゲーム'+(delta===null?' / 比較データ待ち':(' / 前の10件比 '+(delta>=0?'+':'')+delta)))
 +metric('BULL率（直近10）',darts.length?rate(darts)+'%':'—',darts.filter(isBull).length+'/'+darts.length+'投')
 +metric('自己ベスト',best??'—','COUNT-UP / 24投')
 +metric('全期間平均',avg(ss)??'—',ss.length+'完走ゲーム');
}

let aimPeriod='10';
const aimOrder=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
function aimPoint(d){
 if(!d||d.segment==='MISS')return null;
 if(isBull(d))return {x:0,y:0};
 const n=Number(d.segment.slice(1)),idx=aimOrder.indexOf(n);
 if(idx<0)return null;
 const a=(-90+idx*18)*Math.PI/180;
 const r=d.segment[0]==='T'?.62:d.segment[0]==='D'?.96:d.zone?.endsWith('I')?.35:.79;
 return {x:Math.cos(a)*r,y:Math.sin(a)*r};
}
function renderAim(){
 const root=$('aimAnalysis');if(!root)return;
 const blocks=[];
 for(const s of finished().slice().reverse())for(let i=0;i+2<s.darts.length;i+=3)blocks.push(s.darts.slice(i,i+3));
 for(let i=0;i+2<store.active.darts.length;i+=3)blocks.push(store.active.darts.slice(i,i+3));
 const rounds=blocks.slice(-(aimPeriod==='all'?blocks.length:Number(aimPeriod))),darts=rounds.flat(),pts=darts.map(aimPoint).filter(Boolean);
 const median=vals=>{const a=vals.sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):0};
 const mx=median(pts.map(p=>p.x)),my=median(pts.map(p=>p.y)),percent=f=>pts.length?Math.round(100*pts.filter(f).length/pts.length):0;
 const direction=pts.length?((Math.abs(my)<.08?'':my>0?'下':'上')+(Math.abs(mx)<.08?'':mx>0?'右':'左')||'中央'):'記録なし';

 const ringOf=d=>{if(d.segment==='IB')return 'IB';if(d.segment==='OB')return 'OB';if(d.segment==='MISS')return null;if(d.segment[0]==='T'||d.segment[0]==='D')return d.segment[0];if(d.segment[0]==='S')return d.zone?.endsWith('I')?'SI':d.zone?.endsWith('O')?'SO':'S';return null};
 const counts=new Map();
 for(const d of darts){const ring=ringOf(d);if(!ring)continue;const number=Number(d.segment.slice(1));const key=ring==='IB'||ring==='OB'?ring:(Number.isInteger(number)&&aimOrder.includes(number)?ring+number:null);if(key)counts.set(key,(counts.get(key)||0)+1)}
 const total=pts.length,maxCount=Math.max(1,...counts.values());
 const polar=(r,a)=>[130+r*Math.cos(a),130+r*Math.sin(a)];
 const sector=(idx,r0,r1)=>{const a=(-99+idx*18)*Math.PI/180,b=a+Math.PI/10,p1=polar(r1,a),p2=polar(r1,b),p3=polar(r0,b),p4=polar(r0,a);return 'M'+p1.join(' ')+' A'+r1+' '+r1+' 0 0 1 '+p2.join(' ')+' L'+p3.join(' ')+' A'+r0+' '+r0+' 0 0 0 '+p4.join(' ')+' Z'};
 const rings=[['SI',18,50,'INNER S'],['T',50,60,'TRIPLE'],['SO',60,91,'OUTER S'],['D',91,102,'DOUBLE']];
 const cells=rings.map(([ring,r0,r1,name])=>aimOrder.map((number,idx)=>{const count=counts.get(ring+number)||0,share=total?count/total*100:0,opacity=count?(.15+.8*count/maxCount):0;return '<path d="'+sector(idx,r0,r1)+'" fill="#67e9e5" fill-opacity="'+opacity.toFixed(3)+'" stroke="#254758" stroke-width=".7"><title>'+name+' '+number+'：'+share.toFixed(1)+'% ('+count+'投)</title></path>'}).join('')).join('');
 const bulls=[['OB',9,18],['IB',0,9]].map(([ring,r0,r1])=>{const count=counts.get(ring)||0,share=total?count/total*100:0,opacity=count?(.15+.8*count/maxCount):0;return '<circle cx="130" cy="130" r="'+r1+'" fill="#67e9e5" fill-opacity="'+opacity.toFixed(3)+'" stroke="#456477"><title>'+ring+'：'+share.toFixed(1)+'% ('+count+'投)</title></circle>'}).join('');
 const svg='<svg viewBox="0 0 260 260" role="img" aria-label="内外シングル・トリプル・ダブル別ヒートマップ">'+cells+bulls+(pts.length?'<circle cx="'+(130+mx*102).toFixed(1)+'" cy="'+(130+my*102).toFixed(1)+'" r="7" fill="#e7fb67" stroke="#091622" stroke-width="2"/>':'')+'<text x="130" y="14" text-anchor="middle" fill="#b5ccd4" font-size="12">上</text><text x="130" y="255" text-anchor="middle" fill="#b5ccd4" font-size="12">下</text><text x="12" y="135" text-anchor="middle" fill="#b5ccd4" font-size="12">左</text><text x="248" y="135" text-anchor="middle" fill="#b5ccd4" font-size="12">右</text></svg>';
 const choices=[['1','1R'],['10','10R'],['20','20R'],['all','ALL']].map(([key,label])=>'<button type="button" data-aim-period="'+key+'" class="'+(aimPeriod===key?'selected':'')+'">'+label+'</button>').join('');
 const stat=(label,num)=>'<div class="aim-stat"><span>'+label+'</span><strong>'+num+'%</strong></div>';
 root.innerHTML='<div class="aim-periods">'+choices+'</div><div class="aim-layout"><div class="aim-visual">'+svg+'</div><div class="aim-results"><div class="aim-tendency">'+(direction==='中央'||direction==='記録なし'?direction:direction+'寄り')+'</div><div class="tiny muted">'+rounds.length+'R · '+pts.length+'投</div><div class="aim-stat-grid">'+stat('↑ 上',percent(p=>p.y<-.001))+stat('↓ 下',percent(p=>p.y>.001))+stat('← 左',percent(p=>p.x<-.001))+stat('→ 右',percent(p=>p.x>.001))+'</div></div></div><details class="aim-help"><summary>分析について</summary><p>色の濃さは内外シングル・T・D・BULL別の命中割合を最大エリア基準で表示。セグメント単位の推定であり、実際の着弾座標ではありません。MISSは位置不明として除外します。</p></details>';
}
document.addEventListener('click',e=>{const b=e.target.closest('[data-aim-period]');if(b){aimPeriod=b.dataset.aimPeriod;renderAim()}});
function achievementTotals(){
 const games=finished(),darts=games.flatMap(s=>s.darts),rounds=games.flatMap(s=>Array.from({length:8},(_,i)=>s.darts.slice(i*3,i*3+3))).filter(a=>a.length===3);
 const bulls=darts.filter(isBull).length,inner=darts.filter(d=>d.segment==='IB').length,hats=rounds.filter(a=>a.every(isBull)).length,ton80=rounds.filter(a=>a.every(d=>d.segment==='T20')).length,high=rounds.filter(a=>{const n=sum(a);return n>=151&&n<180}).length;
 const items=[['BULL',bulls],['INNER BULL',inner],['HAT TRICK',hats],['TON 80',ton80],['HIGH TON',high]];
 return items.map(([label,n])=>'<div class="achievement-tile"><span>'+label+'</span><strong>'+n+'</strong></div>').join('');
}
function insight(ds){if(ds.length<30)return '現在の記録は'+ds.length+'投。まずはCOUNT-UPを繰り返して、30投以上のデータを集めましょう。AI診断ではなく、測定結果に基づく練習ヒントを表示します。';let arr=[1,2,3].map(i=>rate(ds.filter(d=>d.dartIndex===i))),min=arr.indexOf(Math.min(...arr));return '記録済み'+ds.length+'投のブル率は'+rate(ds)+'%。投球順別では'+(min+1)+'投目が'+arr[min]+'%で最も低い値です。サンプル数や日ごとの変動も確認しながら、次の練習で改善するか検証しましょう。フォーム原因はこの数値だけでは断定できません。'}
function render(){$('soundToggle').textContent=store.soundEnabled===false?'効果音 OFF':'効果音 ON';$('soundToggle').setAttribute('aria-pressed',String(store.soundEnabled!==false));document.querySelectorAll('[data-delay]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.delay)===Number(store.roundDelay))});updateSaveIndicator();$('savedNotice').classList.toggle('hidden',!justSaved);const s=store.active,ds=s.darts,n=ds.length,ss=finished(),a=completedDarts(),average=ss.length?Math.round(ss.reduce((v,x)=>v+sum(x.darts),0)/ss.length):0,bulls=a.filter(isBull).length;
$('metrics').innerHTML=sMetrics(ss);$('achievementTotals').innerHTML=achievementTotals();
$('dashchart').innerHTML=chart(ss);$('analysischart').innerHTML=chart(ss);renderAim();$('insight').textContent=insight(a);$('analysisnote').textContent=insight(a);$('dashbull').innerHTML=bullBars(a);$('allbull').innerHTML=bullBars(a);$('livebull').innerHTML=bullBars(ds);
$('score').textContent=sum(ds);$('roundlabel').textContent='ROUND '+Math.min(8,Math.floor(n/3)+1)+' / 8';$('progress').textContent=n+' / 24';
$('rounds').innerHTML=Array.from({length:8},(_,i)=>{let d=ds.filter(x=>x.roundIndex===i+1);return '<div class="'+(d.length===3?'done':i===Math.min(7,Math.floor(n/3))?'active':'')+'">R'+(i+1)+'<br><b>'+(d.length?sum(d):'—')+'</b></div>'}).join('');
let r=n>0&&n%3===0?Math.min(7,n/3-1):Math.min(7,Math.floor(n/3));$('throws').innerHTML=Array.from({length:3},(_,i)=>{let d=ds[r*3+i];return '<div class="throw '+(!d&&i===n%3?'active':'')+'"><span class="tiny muted">DART '+(i+1)+'</span><b>'+(d?d.score:'—')+'</b><span class="tiny muted">'+(d?dartLabel(d):'READY')+'</span></div>'}).join('');
$('throwlog').innerHTML=ds.slice().reverse().map((d,i)=>'<tr><td>'+(n-i)+' (R'+d.roundIndex+'-'+d.dartIndex+')</td><td>'+dartLabel(d)+'</td><td class="num">'+d.score+'</td></tr>').join('')||'<tr><td colspan="3" class="muted">まだ投球記録がありません</td></tr>';
$('undo').disabled=!n;$('endgame').disabled=!n;
$('resultpanel').classList.toggle('hidden',n!==24);$('resultscore').textContent=sum(ds);$('resultbull').textContent=ds.filter(isBull).length+' / 24';$('saveResult').disabled=n!==24;
$('miss').disabled=n===24;
const latest=store.sessions[0];$('latestResult').innerHTML=latest?'<div class="latest-score">'+sum(latest.darts)+'</div><div class="latest-meta"><span>'+date(latest.startedAt)+'</span><span>'+(latest.status==='completed'?'24投 完走':'途中終了 '+latest.darts.length+'投')+'</span><span>BULL '+latest.darts.filter(isBull).length+' / '+latest.darts.length+'</span></div>':'<div class="empty">まだ記録がありません。PLAYで最初のゲームを始めましょう。</div>';
$('sessions').innerHTML=store.sessions.map(x=>'<tr><td>'+date(x.startedAt)+'</td><td>'+(x.status==='completed'?'完走':'途中終了')+'</td><td>'+sum(x.darts)+'</td><td>'+x.darts.filter(isBull).length+'</td><td>'+x.darts.length+'</td><td><button data-detail="'+esc(x.id)+'">詳細</button></td></tr>').join('')||'<tr><td colspan="6" class="muted">まだ履歴がありません。PLAYから練習を始めましょう。</td></tr>';
document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{viewId=b.dataset.detail;renderDetail()});if(store.sessions.length&&!store.sessions.some(x=>x.id===viewId))viewId=store.sessions[0].id;renderDetail();
$('bindinglog').textContent=Object.entries(store.bindings).map(([k,v])=>k+' → '+label(v)).join('\n')||'割当なし';
}
function renderDetail(){let s=store.sessions.find(x=>x.id===viewId);if(!s){$('sessiondetail').textContent='履歴の「詳細」を押してください。';return}$('sessiondetail').innerHTML='<div class="flex"><b>'+date(s.startedAt)+'</b><span class="pill">'+(s.status==='completed'?'完走':'途中終了')+'</span><strong class="accent">'+sum(s.darts)+' POINTS</strong></div><div class="minirows"><table><thead><tr><th>R</th><th>投球順</th><th>着弾</th><th>得点</th><th>時刻</th></tr></thead><tbody>'+s.darts.map(d=>'<tr><td>'+d.roundIndex+'</td><td>'+d.dartIndex+'</td><td>'+label(d.segment)+'</td><td>'+d.score+'</td><td>'+new Date(d.timestamp).toLocaleTimeString('ja-JP')+'</td></tr>').join('')+'</tbody></table></div>'}
function download(content,filename,type){let blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('exportjson').onclick=()=>download(JSON.stringify({schemaVersion:1,sessions:store.sessions,active:store.active},null,2),'darts-training-lab-backup.json','application/json');
$('exportcsv').onclick=()=>{let rows=[['session_id','started_at','status','round','dart','timestamp','segment','score','source'],...store.sessions.flatMap(s=>s.darts.map(d=>[s.id,s.startedAt,s.status,d.roundIndex,d.dartIndex,d.timestamp,d.segment,d.score,d.inputSource]))];download('\ufeff'+rows.map(r=>r.join(',')).join('\r\n'),'darts-training-lab-throws.csv','text/csv;charset=utf-8')};
function validDart(d){return d&&typeof d==='object'&&typeof d.id==='string'&&Number.isInteger(d.roundIndex)&&d.roundIndex>=1&&d.roundIndex<=8&&Number.isInteger(d.dartIndex)&&d.dartIndex>=1&&d.dartIndex<=3&&typeof d.segment==='string'&&/^(S|D|T)([1-9]|1[0-9]|20)$|^(OB|IB|MISS)$/.test(d.segment)&&d.score===points(d.segment)}
function validSession(s){return s&&typeof s.id==='string'&&typeof s.startedAt==='string'&&['completed','abandoned'].includes(s.status)&&Array.isArray(s.darts)&&s.darts.length<=24&&s.darts.every((d,i)=>validDart(d)&&d.roundIndex===Math.floor(i/3)+1&&d.dartIndex===i%3+1)&&(s.status!=='completed'||s.darts.length===24)}
$('importjson').onchange=async e=>{let file=e.target.files[0];if(!file)return;try{let v=JSON.parse(await file.text());if(v.schemaVersion!==1||!Array.isArray(v.sessions)||!v.sessions.every(validSession))throw Error('ファイル形式が違うか、投球データが不正です');let existing=new Set(store.sessions.map(s=>s.id)),newItems=v.sessions.filter(s=>!existing.has(s.id));if(!confirm(newItems.length+'件の履歴を追加しますか？現在の履歴は残ります。'))return;store.sessions=[...store.sessions,...newItems].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));persist();render();alert(newItems.length+'件を復元しました')}catch(err){alert('復元できませんでした：'+err.message)}finally{e.target.value=''}};
$('clearall').onclick=()=>{if(confirm('全履歴を削除します。JSONバックアップを保存しましたか？')&&confirm('本当に全履歴を削除しますか？')){store.sessions=[];viewId=null;persist();render()}};
$('miss').onclick=()=>add('MISS');$('undo').onclick=undo;$('newgame').onclick=startNew;$('startdash').onclick=()=>{changeTab('play')};$('endgame').onclick=finishEarly;$('saveResult').onclick=confirmResult;
const calibrationTargets=[...nums.flatMap(n=>['S'+n+'O','S'+n+'I','T'+n,'D'+n]),'OB','IB'];
function calibrationSegment(target){return target.endsWith('O')&&target.startsWith('S')?'S'+target.slice(1,-1):target.endsWith('I')&&target.startsWith('S')?'S'+target.slice(1,-1):target}
function calibrationName(target){if(target==='OB')return 'OUTER BULL（外側・25点）';if(target==='IB')return 'INNER BULL（中心・50点）';if(target.startsWith('S'))return 'S'+target.slice(1,-1)+(target.endsWith('O')?' 外側':' 内側');return target}
function calibrationKeys(){return store.calibrationKeys&&typeof store.calibrationKeys==='object'?store.calibrationKeys:{}}
function renderCalibration(){const keys=calibrationKeys();const count=calibrationTargets.filter(t=>keys[t]).length;$('calibrationProgress').textContent='登録済み '+count+' / '+calibrationTargets.length;$('calibrationTarget').textContent=calibrationActive&&calibrationIndex<calibrationTargets.length?'次は '+calibrationName(calibrationTargets[calibrationIndex])+' を1回押す':count===calibrationTargets.length?'全エリアの登録完了':'開始すると押す場所が表示されます';$('calibrationStart').textContent=calibrationActive?'登録中（押し直し不要）':'最初に1回だけ押す';$('calibrationStop').disabled=!calibrationActive;$('calibrationBack').disabled=calibrationLastIndex<0;$('calibrationSkip').disabled=!calibrationActive;$('calibrationExport').disabled=count===0}
function calibrationAdvance(){const keys=calibrationKeys();while(calibrationIndex<calibrationTargets.length&&keys[calibrationTargets[calibrationIndex]])calibrationIndex++;if(calibrationIndex>=calibrationTargets.length){calibrationActive=false;store.calibrationCompletedAt=new Date().toISOString();persist();$('calibrationStatus').textContent='登録完了・自動保存済み！ 対応表のバックアップも保存できます。'}renderCalibration()}
function receiveCalibration(k){if(!calibrationActive)return false;if(Date.now()-calibrationLastAt<350)return true;const target=calibrationTargets[calibrationIndex];if(!target){calibrationActive=false;renderCalibration();return true}const keys=calibrationKeys();const duplicate=Object.entries(keys).find(([t,key])=>t!==target&&key===k);if(duplicate){$('calibrationStatus').textContent='同じ信号を検出しました。'+calibrationName(target)+' をもう一度押してください（開始し直す必要はありません）';renderCalibration();return true}const previous=store.bindings[k];const segment=calibrationSegment(target);if(previous&&previous!==segment){$('calibrationStatus').textContent='既存の割当と異なる信号です。'+calibrationName(target)+' をもう一度押すか、スキップしてください';renderCalibration();return true}store.calibrationKeys={...keys,[target]:k};store.bindings[k]=segment;store.calibrationCompletedAt=null;calibrationLastIndex=calibrationIndex;calibrationLastAt=Date.now();if(!persist()){calibrationActive=false;renderCalibration();return}$('calibrationStatus').textContent=calibrationName(target)+' → '+k+' を保存しました';calibrationIndex++;calibrationAdvance();return true}

// Raw 200S capture: preserve all keyboard events per physical press without binding scores.
let rawRunning=false,rawTimer=null,rawLastEvent=0;
const rawTargets=[...nums.flatMap(n=>['S'+n+'O','S'+n+'I','T'+n,'D'+n]),'OB','IB'];
let rawData={format:'dtl-200s-raw-v1',steps:[],cursor:0};
try{const saved=JSON.parse(localStorage.getItem('dtl-200s-raw-v1'));if(saved&&Array.isArray(saved.steps)&&Number.isInteger(saved.cursor))rawData=saved}catch(_){}
rawData.cursor=Math.max(0,Math.min(82,rawData.cursor));
function rawSave(){try{localStorage.setItem('dtl-200s-raw-v1',JSON.stringify(rawData));return true}catch(_){$('rawStatus').textContent='保存失敗。JSONを書き出してください';return false}}
function rawRender(){const n=rawData.cursor;$('rawProgress').textContent=n+' / 82 エリア記録済み'+(rawRunning?' · 記録中':'');$('rawTarget').textContent=n>=82?'82か所の記録完了':rawRunning?'次は '+calibrationName(rawTargets[n])+' を1回押す':'記録開始を押してください';$('rawLog').textContent=rawData.steps.slice(-8).map(s=>calibrationName(s.target)+' : '+s.events.map(e=>e.code+' / '+e.key+(e.shift?' [Shift]':'')).join(' , ')).join('\n')||'記録なし';$('rawUndo').disabled=!rawData.steps.length;$('rawExport').disabled=!rawData.steps.length;$('rawSkip').disabled=!rawRunning}
function rawFinalize(){if(rawTimer){clearTimeout(rawTimer);rawTimer=null}const n=rawData.cursor;const step=rawData.steps[n];if(!step||!step.events.length)return;rawData.cursor=n+1;rawSave();if(rawData.cursor===82){rawRunning=false;$('rawStatus').textContent='全82か所の記録完了。JSONを保存してチャットに送ってください'}else $('rawStatus').textContent=calibrationName(step.target)+' の信号を記録しました';rawRender()}
function rawReceive(e){if(!rawRunning||rawData.cursor>=82)return false;const n=rawData.cursor;const now=Date.now();if(!rawData.steps[n]||rawData.steps[n].target!==rawTargets[n])rawData.steps[n]={target:rawTargets[n],events:[]};const step=rawData.steps[n];step.events.push({code:e.code,key:e.key,shift:e.shiftKey,ctrl:e.ctrlKey,alt:e.altKey,meta:e.metaKey,repeat:e.repeat,time:now});rawLastEvent=now;rawSave();if(rawTimer)clearTimeout(rawTimer);rawTimer=setTimeout(rawFinalize,800);$('rawStatus').textContent='信号を受信：'+e.code+' / '+e.key+'（次へ自動進行します）';rawRender();return true}
$('rawStart').onclick=()=>{calibrationActive=false;rawRunning=true;$('rawStatus').textContent='表示された場所を押してください。開始ボタンはもう押さなくて大丈夫です';rawRender()};
$('rawPause').onclick=()=>{rawRunning=false;if(rawTimer)rawFinalize();rawSave();$('rawStatus').textContent='一時停止・保存済み';rawRender()};
$('rawUndo').onclick=()=>{if(rawTimer){clearTimeout(rawTimer);rawTimer=null}const n=rawData.steps[rawData.cursor]?.events.length?rawData.cursor:Math.max(0,rawData.cursor-1);rawData.steps=rawData.steps.slice(0,n);rawData.cursor=n;rawRunning=true;rawSave();$('rawStatus').textContent='直前を消去しました。'+calibrationName(rawTargets[n])+' をもう一度押してください';rawRender()};
$('rawSkip').onclick=()=>{if(rawTimer){clearTimeout(rawTimer);rawTimer=null}rawData.steps[rawData.cursor]={target:rawTargets[rawData.cursor],events:[],skipped:true};rawData.cursor++;rawSave();if(rawData.cursor===82)rawRunning=false;$('rawStatus').textContent='スキップしました';rawRender()};
$('rawExport').onclick=()=>download(JSON.stringify({...rawData,exportedAt:new Date().toISOString()},null,2),'200s-raw-capture.json','application/json');


let specialMode=null,specialTimer=null,specialData={format:'dtl-200s-buttons-v1',START:[],CHANGE:[]};
try{const x=JSON.parse(localStorage.getItem('dtl-200s-buttons-v1'));if(x&&Array.isArray(x.START)&&Array.isArray(x.CHANGE))specialData=x}catch(_){}
function specialSave(){try{localStorage.setItem('dtl-200s-buttons-v1',JSON.stringify(specialData))}catch(_){}}
function specialRender(){$('specialLog').textContent=['START','CHANGE'].map(k=>k+': '+(specialData[k].length?specialData[k].map(e=>e.code+' / '+e.key).join(', '):'未記録')).join('\n')}
function specialBegin(k){rawRunning=false;calibrationActive=false;specialMode=k;specialData[k]=[];if(specialTimer)clearTimeout(specialTimer);$('specialStatus').textContent=k+'を本体で1回押してください';specialRender()}
function specialReceive(e){if(!specialMode)return false;const k=specialMode;specialData[k].push({code:e.code,key:e.key,shift:e.shiftKey,repeat:e.repeat,time:Date.now()});specialSave();if(specialTimer)clearTimeout(specialTimer);specialTimer=setTimeout(()=>{specialMode=null;$('specialStatus').textContent=k+'を保存しました。次のボタンへ進めます';specialRender()},900);$('specialStatus').textContent=k+' の信号を受信';specialRender();return true}
$('specialStart').onclick=()=>specialBegin('START');
$('specialChange').onclick=()=>specialBegin('CHANGE');
$('specialExport').onclick=()=>download(JSON.stringify(specialData,null,2),'200s-button-signals.json','application/json');


const board200sMap={"KeyA | A":"S20O","KeyW | W":"S20I","Digit7 | &":"T20","KeyY | Y":"D20","KeyQ | Q":"S1O","KeyH | h":"S1I","Minus | -":"T1","KeyJ | J":"D1","KeyZ | Z":"S18O","KeyR | r":"S18I","Quote | \"":"T18","KeyT | t":"D18","Slash | /":"S4O","KeyM | M":"S4I","Digit2 | @":"T4","KeyK | K":"D4","Digit2 | 2":"S13O","Digit5 | %":"S13I","KeyQ | q":"T13","Digit6 | ^":"D13","Period | .":"S6O","KeyU | U":"S6I","Digit4 | 4":"T6","KeyV | V":"D6","Equal | =":"S10O","KeyM | m":"S10I","KeyA | a":"T10","KeyL | l":"D10","KeyH | H":"S15O","Digit4 | $":"S15I","KeyE | e":"T15","BracketLeft | [":"D15","KeyR | R":"S2O","Comma | <":"S2I","KeyD | d":"T2","Digit9 | 9":"D2","KeyI | I":"S17O","KeyF | f":"S17I","Digit1 | 1":"T17","Comma | ,":"D17","KeyD | D":"S3O","KeyI | i":"S3I","Semicolon | ;":"T3","KeyS | S":"D3","Digit8 | 8":"S19O","KeyC | c":"S19I","Equal | +":"T19","KeyB | B":"D19","KeyO | O":"S7O","KeyN | N":"S7I","Slash | ?":"T7","Digit3 | 3":"D7","Digit3 | #":"S16O","Minus | _":"S16I","Period | >":"T16","KeyB | b":"D16","KeyP | p":"S8O","KeyC | C":"S8I","Digit8 | *":"T8","KeyK | k":"D8","Backslash | \\":"S11O","Digit5 | 5":"S11I","Digit7 | 7":"T11","KeyT | T":"D11","KeyL | L":"S14O","Digit0 | 0":"S14I","Digit6 | 6":"T14","KeyS | s":"D14","KeyG | g":"S9O","KeyF | F":"S9I","KeyE | E":"T9","Semicolon | :":"D9","Quote | '":"S12O","KeyN | n":"S12I","KeyP | P":"T12","KeyX | X":"D12","Digit9 | (":"S5O","BracketRight | ]":"S5I","KeyJ | j":"T5","Digit1 | !":"D5","KeyG | G":"OB","KeyO | o":"IB"};
let board200sEnabled=true,board200sLastKey='',board200sLastAt=0;
function board200sStatus(message){const el=$('board200sStatus');if(el)el.textContent=message}
function board200sInput(e){
 if(!board200sEnabled)return false;
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return false;
 if(e.ctrlKey||e.altKey||e.metaKey||e.repeat)return false;
 const k=keyName(e),now=Date.now();
 if(e.code==='Tab'&&!e.shiftKey){e.preventDefault();if(!$('play').classList.contains('active'))changeTab('play');if(store.active.darts.length===24){board200sStatus('START：結果確定');confirmResult()}else if(store.active.darts.length===0){board200sStatus('START：投球待機');toast('READY TO THROW')}else{board200sStatus('START：ゲーム進行中（リセットなし）')}return true}
 if(e.code==='Enter'&&!e.shiftKey){e.preventDefault();if(!$('play').classList.contains('active'))changeTab('play');if(roundBreakUntil>Date.now()){finishRoundBreak();board200sStatus('CHANGE：次のラウンドへ');toast('NEXT ROUND — READY')}else if(store.active.darts.length===24){board200sStatus('CHANGE：ゲーム終了（結果確認）');toast('GAME COMPLETE — 結果を確認してください')}else if(store.active.darts.length%3===0&&store.active.darts.length>0){board200sStatus('CHANGE：次のラウンド待機中');toast('NEXT ROUND — READY')}else{board200sStatus('CHANGE：3投完了後に使用できます')}return true}
 if(['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code))return false;
 const zone=board200sMap[k];if(!zone)return false;const segment=zone.startsWith('S')?zone.slice(0,-1):zone;
 e.preventDefault();
 if(!$('play').classList.contains('active'))changeTab('play');
 if(k===board200sLastKey&&now-board200sLastAt<180)return true;
 if(now-board200sLastAt<90)return true;
 board200sLastKey=k;board200sLastAt=now;
 if(roundBreakUntil>Date.now()){board200sStatus('ラウンド切替待ち：CHANGEで進めます');return true}
 if(store.active.darts.length>=24){board200sStatus('24投完了：STARTで結果確定');return true}
 add(segment,'board',zone);
 board200sStatus('受信：'+label(segment)+' / '+points(segment)+'点');
 return true;
}


function keyName(e){return e.code+' | '+e.key}document.addEventListener('keydown',e=>{if(specialMode){e.preventDefault();specialReceive(e);return}if(rawRunning){e.preventDefault();rawReceive(e);return}if(board200sInput(e))return;if(e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.target?.closest?.('button')&&(e.key==='Enter'||e.key===' '))return;if(['Shift','Control','Alt','Meta','CapsLock'].includes(e.key)||['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code))return;let k=keyName(e);if(calibrationActive){e.preventDefault();receiveCalibration(k);return}lastKey=k;$('lastkey').textContent=k;keyLog.unshift(new Date().toLocaleTimeString('ja-JP')+'  '+k);keyLog=keyLog.slice(0,30);$('keylog').textContent=keyLog.join('\n');if(store.bindings[k]&&document.getElementById('play').classList.contains('active')){e.preventDefault();let now=Date.now();if(now-lastBoardEvent<250){toast('重複入力を防止しました');return}lastBoardEvent=now;add(store.bindings[k],'board')}});
document.querySelectorAll('[data-delay]').forEach(b=>b.onclick=()=>{store.roundDelay=Number(b.dataset.delay);persist();render()});$('soundToggle').onclick=()=>{store.soundEnabled=store.soundEnabled===false;persist();render();if(store.soundEnabled)playSound('bull')};document.querySelectorAll('[data-sound-volume]').forEach(input=>{const k=input.dataset.soundVolume;input.value=Math.round(soundLevel(k)*100);const out=$(k+'VolumeValue');if(out)out.textContent=input.value+'%';input.oninput=()=>{store.soundVolumes={...(store.soundVolumes||{}),[k]:Number(input.value)};if(out)out.textContent=input.value+'%';persist()}});
async function testAudio(kind){const status=$('soundStatus');if(store.soundEnabled===false){status.textContent='効果音がOFFです。ONにしてください';return}try{const ctx=audioReady();if(!ctx){status.textContent='このブラウザは音声機能に対応していません';return}if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running'){status.textContent='音声がブロックされています。プレビューではなく通常のHTTPSページで開いてください';return}playSound(kind);status.textContent='再生中：'+kind+'（聞こえない場合は音量・消音モード・ページの音声許可を確認）'}catch(e){status.textContent='音声を開始できません：'+e.message}}
document.querySelectorAll('[data-sound-test]').forEach(b=>b.onclick=()=>testAudio(b.dataset.soundTest));
$('soundTest').onclick=()=>testAudio('inner');$('skipRoundBreak').onclick=finishRoundBreak;$('backFromSettings').onclick=()=>changeTab('play');$('againFromHistory').onclick=()=>changeTab('play');$('analyseFromHistory').onclick=()=>changeTab('analysis');
const select=$('targetselect');['OB','IB','MISS',...nums.flatMap(n=>['S'+n,'D'+n,'T'+n])].forEach(s=>{let o=document.createElement('option');o.value=s;o.textContent=label(s);select.appendChild(o)});
$('assignkey').onclick=()=>{if(!lastKey){alert('まず200Sからキーを受信してください');return}store.bindings[lastKey]=select.value;persist();render();alert(lastKey+' を '+label(select.value)+' に登録しました')};
$('clearbindings').onclick=()=>{if(confirm('登録済みキー割当を削除しますか？')){store.bindings={};persist();render()}};
$('calibrationStart').onclick=()=>{calibrationActive=true;calibrationIndex=0;calibrationLastIndex=-1,calibrationLastAt=0;calibrationAdvance();if(calibrationActive)$('calibrationStatus').textContent='ボードの指定位置を1回押してください'};
$('calibrationStop').onclick=()=>{calibrationActive=false;$('calibrationStatus').textContent='一時停止しました。登録データは保存されています';renderCalibration()};
$('calibrationSkip').onclick=()=>{if(!calibrationActive)return;calibrationIndex++;if(calibrationIndex>=calibrationTargets.length){calibrationActive=false;$('calibrationStatus').textContent='最後まで確認しました。未登録の場所は次回再開できます';renderCalibration();return}calibrationAdvance();if(calibrationActive)$('calibrationStatus').textContent='スキップしました。次の位置を押してください'};
function editCalibrationAt(i){if(i<0||i>=calibrationTargets.length)return;const t=calibrationTargets[i],k=calibrationKeys()[t];if(k){delete store.calibrationKeys[t];if(!Object.entries(store.calibrationKeys).some(([other,key])=>key===k&&calibrationSegment(other)===calibrationSegment(t))&&store.bindings[k]===calibrationSegment(t))delete store.bindings[k]}store.calibrationCompletedAt=null;calibrationIndex=i;calibrationActive=true;persist();$('calibrationStatus').textContent=calibrationName(t)+' を再登録してください';renderCalibration()}
$('calibrationBack').onclick=()=>editCalibrationAt(calibrationLastIndex);
$('calibrationEdit').onclick=()=>{const input=prompt('修正する登録番号（1〜82）を入力してください。1=S20外側、2=S20内側、3=T20、4=D20。');if(input===null)return;const i=Number(input)-1;if(!Number.isInteger(i)||i<0||i>=calibrationTargets.length){alert('1〜82の番号を入力してください');return}if(!confirm(calibrationName(calibrationTargets[i])+' を修正しますか？'))return;editCalibrationAt(i)};
$('calibrationExport').onclick=()=>download(JSON.stringify({format:'dtl-200s-calibration-v1',completedAt:store.calibrationCompletedAt||null,calibrationKeys:calibrationKeys(),bindings:store.bindings},null,2),'200s-keymap-backup.json','application/json');
$('board200sToggle').onchange=e=>{board200sEnabled=e.target.checked;board200sStatus(board200sEnabled?'200S自動得点 ON':'200S自動得点 OFF')};drawBoard();render();renderCalibration();rawRender();specialRender();
})();

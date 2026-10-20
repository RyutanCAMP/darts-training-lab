// game/rounds: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectRounds(runtime){
let roundBreakTicker;
function finishRoundBreak(){if(runtime.roundBreakTimer!==null){clearTimeout(runtime.roundBreakTimer);runtime.roundBreakTimer=null}if(roundBreakTicker!==null){clearInterval(roundBreakTicker);roundBreakTicker=null}runtime.roundBreakUntil=0;runtime.$('roundBreak').classList.add('hidden')}
function shotPraise(d){
 if(!d||d.segment==='MISS')return null;
 if(runtime.isBull(d))return {title:d.segment==='IB'?'INNER BULL!':'BULL!',kind:d.segment==='IB'?'inner':'bull'};
 if(d.segment==='T20')return {title:'TON 60!',kind:'nice'};
 if(d.segment.startsWith('T'))return {title:'TRIPLE!',kind:'nice'};
 if(d.segment.startsWith('D'))return {title:'DOUBLE!',kind:'nice'};
 return null;
}
function roundPraise(darts,score){
 if(darts.length!==3)return 'GOOD ROUND!';
 if(darts.every(runtime.isBull))return 'HAT TRICK!';
 if(darts.every(d=>d.segment==='T20'))return 'TON 80!';
 if(score>=151)return 'HIGH TON!';
 if(score>=100)return 'LOW TON!';
 if(darts.filter(runtime.isBull).length>=2)return 'DOUBLE BULL!';
 if(darts.some(runtime.isBull))return 'NICE BULL!';
 if(darts.some(d=>d.segment&&d.segment.startsWith('T')))return 'GREAT SHOT!';
 if(score>=60)return 'NICE ONE!';
 return 'GOOD ROUND!';
}
function drawCooldownPixels(score,darts){
 const cv=runtime.$('coolPixel');if(!cv)return;
 const g=cv.getContext('2d');if(!g)return;
 g.clearRect(0,0,128,60);
 const hat=darts.length===3&&darts.every(runtime.isBull);
 const ton=darts.length===3&&darts.every(d=>d.segment==='T20');
 const tier=hat||ton||score>=150?3:score>=100?2:score>=50?1:0;
 cv.dataset.tier=String(tier);
 const p=(x,y,w,h,color)=>{g.fillStyle=color;g.fillRect(x,y,w,h)};
 const star=(x,y,color)=>{p(x-1,y-6,3,15,color);p(x-6,y-1,15,3,color)};
 g.strokeStyle='#416578';g.lineWidth=4;g.beginPath();g.arc(64,36,20,0,Math.PI*2);g.stroke();
 g.strokeStyle=tier?'#e7fb67':'#6c97a5';g.lineWidth=5;g.beginPath();g.arc(64,36,12,0,Math.PI*2);g.stroke();
 p(60,32,8,8,'#69e9e3');p(64,35,16,3,'#e7fbef');p(78,31,5,11,'#ffb06d');
 if(tier>=1){star(20,19,'#e7fb67');star(109,17,'#69e9e3')}
 if(tier>=2){for(let i=0;i<7;i++){p(14+i*3,44-(i%3)*5,3,11+(i%3)*5,i%2?'#ffe475':'#ff7856')}star(109,46,'#ffb06d')}
 if(tier>=3){const crown=['100010001','110111011','111111111','011111110','001111100','001111100'];crown.forEach((row,y)=>[...row].forEach((v,x)=>{if(v==='1')p(50+x*3,3+y*3,3,3,'#e7fb67')}));star(18,48,'#69e9e3')}
 if(hat||ton){p(4,3,32,12,'#193c48');g.fillStyle='#e7fb67';g.font='bold 9px monospace';g.fillText(hat?'HAT':'180',8,12)}
}
function beginRoundBreak(round,score,darts=[]){
 finishRoundBreak();
 const duration=Math.max(1,Number(runtime.store.roundDelay)||8),ms=duration*1000;
 runtime.$('roundBreakLabel').textContent='ROUND '+round+' CLEAR';
 runtime.$('roundBreakScore').textContent='+'+score;
 runtime.$('roundBreakPraise').textContent=roundPraise(darts,score);
 drawCooldownPixels(score,darts);
 const isSpecial=darts.length===3&&(darts.every(runtime.isBull)||score>=100);
 const box=runtime.$('roundBreak'),progress=box.querySelector('.cool-progress'),count=runtime.$('roundBreakCountdown');
 box.classList.toggle('cool-special',isSpecial);box.classList.remove('hidden');
 runtime.roundBreakUntil=Date.now()+ms;
 const tick=()=>{const remaining=Math.max(0,runtime.roundBreakUntil-Date.now());count.textContent=String(Math.ceil(remaining/1000));if(progress)progress.style.strokeDashoffset=String(320.44*(1-remaining/ms));if(remaining<=0)finishRoundBreak()};
 tick();roundBreakTicker=setInterval(tick,50);runtime.roundBreakTimer=setTimeout(finishRoundBreak,ms);
}
Object.assign(runtime,{finishRoundBreak,shotPraise,roundPraise,beginRoundBreak});
function initialize(){
roundBreakTicker=null;
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectRounds=connectRounds;
})();

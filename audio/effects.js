// audio/effects: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectEffects(runtime){
let gameFxTimer,pixelFxFrame;
function pixelEffect(kind,duration){
 const canvas=runtime.$('pixelFx');if(!canvas)return;
 if(pixelFxFrame!==null){cancelAnimationFrame(pixelFxFrame);pixelFxFrame=null}
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const type=kind==='record'?'record':kind==='hat'?'hat':kind==='double'?'double':'bull';
 const ctx=canvas.getContext('2d');if(!ctx)return;
 const W=160,H=90,px=(x,y,w,h,color)=>{ctx.fillStyle=color;ctx.fillRect(Math.round(x),Math.round(y),Math.max(1,Math.round(w)),Math.max(1,Math.round(h)))};
 const trophy=['....YYYY....','...YYYYYY...','..YYYYYYYY..','YYY.YYYY.YYY','Y.Y.YYYY.Y.Y','YYY.YYYY.YYY','..YYYYYYYY..','...YYYYYY...','....YYYY....','.....YY.....','.....YY.....','....YYYY....','...YYYYYY...'];
 const dart=(x,y,angle,color)=>{ctx.save();ctx.translate(x,y);ctx.rotate(angle);px(-2,-2,19,3,color);px(15,-5,5,9,'#f6a96c');px(19,-8,2,15,'#79e8e3');ctx.restore()};
 const start=performance.now(),life=reduced?0:Math.min(duration,3800);
 const draw=(now)=>{
  const t=reduced?1:Math.min(1,(now-start)/Math.max(1,life)),tick=Math.floor((now-start)/85);
  ctx.clearRect(0,0,W,H);
  if(type==='record'){
   const colors=['#e7fb67','#69e9e3','#ffb86a','#ff7db3'];
   for(let i=0;i<42;i++){
    const a=i*2.399,dist=reduced?40:8+t*72+(i%5)*3;
    const x=80+Math.cos(a)*dist,y=42+Math.sin(a)*dist*.55+(t*t*15);
    if(y<H&&x>0&&x<W)px(x,y,2+(i%3),2,colors[i%4]);
   }
   trophy.forEach((row,ry)=>[...row].forEach((ch,rx)=>{if(ch==='Y')px(80+(rx-6)*3,42+(ry-7)*3,3,3,ry<9?'#e7fb67':'#ffb86a')}));
   if(tick%4<2){px(78,5,4,4,'#ffffff');px(18,40,3,3,'#e7fb67');px(139,40,3,3,'#69e9e3')}
  }else{
   const col=type==='hat'?'#ffb86a':type==='double'?'#e7fb67':'#69e9e3';
   ctx.strokeStyle='#31566b';ctx.lineWidth=5;ctx.beginPath();ctx.arc(80,44,30,0,Math.PI*2);ctx.stroke();
   ctx.strokeStyle='#e7fb67';ctx.lineWidth=6;ctx.beginPath();ctx.arc(80,44,19,0,Math.PI*2);ctx.stroke();
   px(74,38,12,12,'#69e9e3');
   const n=type==='hat'?3:type==='double'?2:1;
   for(let i=0;i<n;i++){
    const x=80+(i-(n-1)/2)*11,y=44+(i%2?5:-5),delay=i*.2;
    if(reduced||t>delay){const k=reduced?1:Math.min(1,(t-delay)*6);dart(x+(1-k)*55,y-(1-k)*28,-.7,col)}
   }
   for(let i=0;i<16;i++){const a=i*Math.PI/8,r=type==='hat'?28+36*t:type==='double'?24+30*t:18+27*t;px(80+Math.cos(a)*r,44+Math.sin(a)*r,2,2,i%2?'#e7fb67':col)}
  }
  if(!reduced&&t<1)pixelFxFrame=requestAnimationFrame(draw);else pixelFxFrame=null;
 };
 canvas.classList.add('active');draw(start);
}
function gameEffect(title,sub='',kind='nice',duration=1100){
 const box=runtime.$('gameFx');if(!box)return;clearTimeout(gameFxTimer);
 const type=kind==='record'?'record':title==='HAT TRICK!'?'hat':title==='DOUBLE BULL!'?'double':(kind==='bull'||kind==='inner')?'bull':null;
 box.className='game-fx '+kind+(type?' pixel-mode':'');
 runtime.$('gameFxTitle').textContent=title;runtime.$('gameFxSub').textContent=sub;
 const canvas=runtime.$('pixelFx');if(canvas)canvas.classList.toggle('active',!!type);
 if(pixelFxFrame!==null){cancelAnimationFrame(pixelFxFrame);pixelFxFrame=null}
 if(type)pixelEffect(type,duration);
 void box.offsetWidth;box.classList.add('show');
 gameFxTimer=setTimeout(()=>{box.classList.remove('show');if(canvas)canvas.classList.remove('active');if(pixelFxFrame!==null){cancelAnimationFrame(pixelFxFrame);pixelFxFrame=null}},duration);
}
function dismissStartup(){const s=runtime.$('startupFx');if(s){s.style.animation='none';s.style.opacity='0';s.style.visibility='hidden'}}
Object.assign(runtime,{gameEffect});
function initialize(){
gameFxTimer=null;
pixelFxFrame=null;
window.addEventListener('keydown',dismissStartup,{once:true});
window.addEventListener('pointerdown',dismissStartup,{once:true});
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectEffects=connectEffects;
})();

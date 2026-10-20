// audio/sound: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectSound(runtime){
let soundVolumes,retroBus,retroDelay,retroDelayGain,retroTone,retroNoiseCache,cooldownBuffer,cooldownLoading,bgmTimer,bgmStep;
function soundLevel(k){return Math.max(0,Math.min(1,Number((runtime.store.soundVolumes||{})[k]??({hit:75,fx:80,bgm:25}[k]))/100))}
function audioReady(){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;if(!runtime.audioCtx)runtime.audioCtx=new A();if(runtime.audioCtx.state==='suspended')runtime.audioCtx.resume().catch(()=>{});return runtime.audioCtx}
function retroInit(){
 if(retroBus&&retroBus.context===runtime.audioCtx)return;
 const ctx=runtime.audioCtx,compress=ctx.createDynamicsCompressor(),bus=ctx.createGain(),delay=ctx.createDelay(.6),feedback=ctx.createGain(),wet=ctx.createGain();
 compress.threshold.value=-19;compress.knee.value=15;compress.ratio.value=4;compress.attack.value=.004;compress.release.value=.18;
 bus.gain.value=.82;bus.connect(compress);compress.connect(ctx.destination);
 delay.delayTime.value=.19;feedback.gain.value=.17;wet.gain.value=.13;
 bus.connect(delay);delay.connect(feedback);feedback.connect(delay);delay.connect(wet);wet.connect(compress);
 retroBus=bus;retroDelay=delay;retroDelayGain=wet;retroTone=compress;retroNoiseCache={};
}
function retroVoice(freq,at,dur,vol,type='triangle',endFreq=null,cutoff=4500){
 const ctx=runtime.audioCtx,o=ctx.createOscillator(),lp=ctx.createBiquadFilter(),g=ctx.createGain();
 o.type=type;o.frequency.setValueAtTime(Math.max(30,freq),at);
 if(endFreq)o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),at+dur);
 lp.type='lowpass';lp.frequency.value=cutoff;
 g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,vol),at+.008);
 g.gain.exponentialRampToValueAtTime(.0001,at+dur);
 o.connect(lp);lp.connect(g);g.connect(retroBus);o.start(at);o.stop(at+dur+.025);
}
function retroNoise(at,dur,vol,low=550,high=6000){
 const ctx=runtime.audioCtx,sr=ctx.sampleRate,key=Math.round(dur*100),len=Math.ceil(sr*dur);
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
 retroNoise(at,.115,.46*h,420,7500);
 retroNoise(at+.018,.085,.24*h,1100,9000);
 retroVoice(185*pitch,at,.125,.33*h,'sine',65*pitch,1800);
 retroVoice(640*pitch,at,.055,.13*h,'triangle',220*pitch,3900);
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
function preloadCooldownAudio(){
 if(cooldownBuffer)return Promise.resolve(cooldownBuffer);
 if(cooldownLoading)return cooldownLoading;
 cooldownLoading=(async()=>{
  try{
   const res=await fetch('assets/cooldown.mp3');
   if(!res.ok)throw new Error('HTTP '+res.status);
   const ctx=audioReady();if(!ctx)return null;
   cooldownBuffer=await ctx.decodeAudioData(await res.arrayBuffer());
   return cooldownBuffer;
  }catch(err){console.warn('Next-stage sound load failed',err);return null}
  finally{cooldownLoading=null}
 })();
 return cooldownLoading;
}
function playSound(kind='hit',delay=0){
 if(runtime.store.soundEnabled===false)return;
 try{
  if(!audioReady())return;
  retroInit();
  const at=runtime.audioCtx.currentTime+.012+Math.max(0,delay),fx=soundLevel('fx');
  if(['hit','double','triple','bull','inner','miss'].includes(kind))retroHit(at,kind==='miss'?.28:kind==='inner'?1.25:1,kind==='inner'?.78:1);
  if(kind==='miss'||kind==='hit')return;
  if(kind==='cooldown'){
   if(cooldownBuffer){
    const src=runtime.audioCtx.createBufferSource(),gain=runtime.audioCtx.createGain();
    src.buffer=cooldownBuffer;gain.gain.value=.30*fx;
    src.connect(gain);gain.connect(retroBus);src.start(at);return;
   }
   // Light, playful three-second "te-tte-re-tte-re" arcade lever-inspired cue.
   // Original synthesis; no sampled machine audio.
   const phrase=[
    [659.25,0,.10],[783.99,.14,.10],[987.77,.28,.18],
    [783.99,.60,.10],[659.25,.74,.10],[783.99,.88,.20],
    [659.25,1.22,.10],[783.99,1.36,.10],[987.77,1.50,.18],
    [783.99,1.82,.10],[880,1.96,.10],[1046.5,2.10,.22],
    [987.77,2.47,.12],[1046.5,2.62,.23]
   ];
   phrase.forEach(([freq,offset,duration])=>{
    retroVoice(freq,at+offset,duration,.052*fx,'triangle',freq*.998,5200);
    retroVoice(freq*2,at+offset,duration*.55,.011*fx,'sine',freq*2,6500);
   });
   return;
  }
  if(kind==='finalRound'){retroSpark(at,.52);retroNote(523.25,at+.03,.14,.1);retroNote(659.25,at+.17,.14,.11);retroChord([783.99,1046.5],at+.33,.38,.105);return}
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
function bgmNote(freq,duration=.18){if(!runtime.audioCtx||runtime.audioCtx.state!=='running')return;const now=runtime.audioCtx.currentTime;const osc=runtime.audioCtx.createOscillator(),gain=runtime.audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;const volume=.09*soundLevel('bgm');gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(runtime.audioCtx.destination);osc.start(now);osc.stop(now+duration+.02)}
function bgmStop(){if(bgmTimer!==null){clearInterval(bgmTimer);bgmTimer=null}const b=runtime.$('musicToggle');if(b){b.textContent='BGM OFF';b.setAttribute('aria-pressed','false')}}
function bgmStart(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!runtime.audioCtx)runtime.audioCtx=new Audio();runtime.audioCtx.resume().catch(()=>{});bgmStep=0;const notes=[261.63,329.63,392,523.25,392,329.63,293.66,392,440,587.33,440,392,329.63,392,261.63,0];const tick=()=>{const f=notes[bgmStep++%notes.length];if(f)bgmNote(f)};tick();bgmTimer=setInterval(tick,360);runtime.$('musicToggle').textContent='BGM ON';runtime.$('musicToggle').setAttribute('aria-pressed','true')}catch(e){console.warn('BGM unavailable',e)}}
async function testAudio(kind){const status=runtime.$('soundStatus');if(runtime.store.soundEnabled===false){status.textContent='効果音がOFFです。ONにしてください';return}try{const ctx=audioReady();if(!ctx){status.textContent='このブラウザは音声機能に対応していません';return}if(ctx.state!=='running')await ctx.resume();if(ctx.state!=='running'){status.textContent='音声がブロックされています。プレビューではなく通常のHTTPSページで開いてください';return}if(kind==='cooldown')await preloadCooldownAudio();playSound(kind);status.textContent='再生中：'+kind+'（聞こえない場合は音量・消音モード・ページの音声許可を確認）'}catch(e){status.textContent='音声を開始できません：'+e.message}}
Object.assign(runtime,{soundLevel,playSound,testAudio});
function initialize(){
soundVolumes=runtime.store.soundVolumes||{hit:75,fx:80,bgm:25};
retroBus=null;
retroDelay=null;
retroDelayGain=null;
retroTone=null;
retroNoiseCache=null;
cooldownBuffer=null;
cooldownLoading=null;
window.addEventListener('pointerdown',()=>{audioReady();preloadCooldownAudio()},{once:true});
preloadCooldownAudio();
bgmTimer=null;
bgmStep=0;
runtime.$('musicToggle').onclick=()=>{if(bgmTimer!==null)bgmStop();else bgmStart()};
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectSound=connectSound;
})();

/* Optional user-provided sounds. Local to this browser; no third-party files bundled. */
(()=>{'use strict';
const DB='retro-darts-custom-sounds',STORE='audio',kinds=[['hit','シングル'],['bull','ブル'],['inner','インナーブル'],['round','ネクストラウンド'],['triple','トリプル']];
const urls=new Map();let dbPromise;
function db(){return dbPromise||(dbPromise=new Promise((resolve,reject)=>{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE)};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)}))}
async function read(k){const d=await db();return new Promise((ok,no)=>{const t=d.transaction(STORE,'readonly').objectStore(STORE).get(k);t.onsuccess=()=>ok(t.result);t.onerror=()=>no(t.error)})}
async function write(k,value){const d=await db();return new Promise((ok,no)=>{const t=d.transaction(STORE,'readwrite').objectStore(STORE);const r=value?t.put(value,k):t.delete(k);r.onsuccess=()=>ok();r.onerror=()=>no(r.error)})}
function setUrl(k,blob){if(urls.has(k))URL.revokeObjectURL(urls.get(k));urls.delete(k);if(blob)urls.set(k,URL.createObjectURL(blob));decoded.delete(k);if(blob)decode(k,blob)}
const ready=Promise.all(kinds.map(async ([k])=>{try{setUrl(k,await read(k))}catch(e){console.warn('Custom sound load',e)}}));
const decoded=new Map();let soundCtx=null;
function context(){const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;return soundCtx||(soundCtx=new A())}
async function decode(k,blob){const ctx=context();if(!ctx||!blob)return;try{const buffer=await ctx.decodeAudioData(await blob.arrayBuffer());if(urls.has(k))decoded.set(k,buffer)}catch(e){console.warn('Custom sound decode',k,e)}}
function play(kind,delay=0,volume=1){
 if(kind==='cooldown')kind='round';
 const u=urls.get(kind);if(!u)return false;
 const ctx=context(),buffer=decoded.get(kind);
 if(ctx&&buffer){
  if(ctx.state==='suspended')ctx.resume().catch(e=>console.warn('Audio resume',e));
  const src=ctx.createBufferSource(),gain=ctx.createGain();src.buffer=buffer;gain.gain.value=Math.max(0,Math.min(1,volume));src.connect(gain);gain.connect(ctx.destination);
  src.start(ctx.currentTime+Math.max(0,delay));return true;
 }
 // Never defer HTMLAudioElement.play() with setTimeout on iOS: it loses user activation.
 const audio=new Audio(u);audio.volume=Math.max(0,Math.min(1,volume));
 audio.play().catch(e=>console.warn('Custom sound playback',e));return true;
}
window.CustomDartSounds={play,ready};
document.addEventListener('DOMContentLoaded',()=>{
const panel=document.querySelector('#settings .sound-settings');if(!panel)return;
const box=document.createElement('div');box.style.cssText='margin-top:18px;padding-top:14px;border-top:1px solid #557';
const heading=document.createElement('h3');heading.textContent='カスタム効果音（端末内保存）';box.append(heading);
const info=document.createElement('p');info.className='tiny muted';info.textContent='MP3などの音声を割り当てるとオリジナル効果音の代わりに再生します。未登録の音は従来どおりです。別端末には同期されません。';box.append(info);
const status=document.createElement('p');status.className='tiny muted';status.setAttribute('role','status');box.append(status);
for(const [kind,name] of kinds){
const row=document.createElement('div');row.style.cssText='display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin:10px 0';
const label=document.createElement('strong');label.style.minWidth='115px';label.textContent=name;
const file=document.createElement('input');file.type='file';file.accept='audio/*,.mp3,.wav,.m4a';file.setAttribute('aria-label',name+'の音声を選択');file.style.maxWidth='200px';
const test=document.createElement('button');test.type='button';test.textContent='試聴';
const reset=document.createElement('button');reset.type='button';reset.textContent='解除';
const state=document.createElement('span');state.className='tiny muted';const update=()=>{state.textContent=urls.has(kind)?'登録済み':'標準音';test.disabled=!urls.has(kind)};
file.onchange=async()=>{const f=file.files&&file.files[0];if(!f)return;if(f.size>5*1024*1024){status.textContent='5MB以下の音声を選んでください';return}try{await write(kind,f);setUrl(kind,f);update();status.textContent=name+'を保存しました'}catch(e){status.textContent='保存失敗：'+e.message}};
test.onclick=()=>{if(!play(kind))status.textContent='先に音声を登録してください'};
reset.onclick=async()=>{try{await write(kind,null);setUrl(kind,null);file.value='';update();status.textContent=name+'を標準音に戻しました'}catch(e){status.textContent=e.message}};
row.append(label,file,test,reset,state);box.append(row);update();
}panel.append(box);ready.then(()=>{for(const row of box.querySelectorAll('div')){const s=row.querySelector('span');const label=row.querySelector('strong');if(!s||!label)continue;const found=kinds.find(x=>x[1]===label.textContent);if(found)s.textContent=urls.has(found[0])?'登録済み':'標準音';const b=row.querySelector('button');if(b&&found)b.disabled=!urls.has(found[0])}});
});
})();
// storage/rounds: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectRoundStorage(runtime){
function roundEntries(){const entries=[];for(const s of runtime.store.sessions.slice().reverse().concat([runtime.store.active])){if(!runtime.isCountup(s)||!Array.isArray(s.darts))continue;for(let i=0;i+3<=s.darts.length;i+=3){entries.push({key:runtime.roundKey(s,i/3),session:s,round:i/3+1,darts:s.darts.slice(i,i+3)})}}return entries}
function renderRoundManager(){const el=runtime.$('roundManager');if(!el)return;const entries=roundEntries(),excluded=new Set(runtime.excludedRounds),valid=new Set(entries.map(x=>x.key));if(runtime.excludedRounds.some(x=>!valid.has(x))){runtime.excludedRounds=runtime.excludedRounds.filter(x=>valid.has(x));try{localStorage.setItem(runtime.EXCLUDED_ROUNDS_KEY,JSON.stringify(runtime.excludedRounds))}catch(_){}}
const used=entries.filter(x=>!excluded.has(x.key));runtime.$('roundTotal').textContent='記録 '+entries.length+'R ／ 分析対象 '+used.length+'R ／ 除外 '+(entries.length-used.length)+'R';
el.innerHTML=entries.slice().reverse().map(x=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #31414B"><span style="font-size:12px">'+new Date(x.darts[0].timestamp).toLocaleString('ja-JP')+'　R'+x.round+'　'+x.darts.map(d=>runtime.label(d.segment)).join(' / ')+'　'+runtime.sum(x.darts)+'pt</span><button type="button" data-round-key="'+runtime.esc(x.key)+'" aria-pressed="'+excluded.has(x.key)+'">'+(excluded.has(x.key)?'元に戻す':'分析から除外')+'</button></div>').join('')||'<p class="muted">まだ3投そろったラウンドがありません。</p>';
}
function toggleRoundExclusion(key){const item=roundEntries().find(x=>x.key===key);if(!item)return;const was=runtime.excludedRounds.includes(key);if(!was&&!confirm('このラウンドを分析から除外しますか？\\n投球履歴は消えず、あとから元に戻せます。'))return;const next=was?runtime.excludedRounds.filter(x=>x!==key):runtime.excludedRounds.concat(key);try{localStorage.setItem(runtime.EXCLUDED_ROUNDS_KEY,JSON.stringify(next));runtime.excludedRounds=next;runtime.profTouch();runtime.renderAnalysis();renderRoundManager();runtime.toast(was?'分析対象に戻しました':'分析から除外しました')}catch(_){alert('変更を保存できませんでした')}}
Object.assign(runtime,{renderRoundManager});
function initialize(){
runtime.EXCLUDED_ROUNDS_KEY='dtl-excluded-rounds-v1';
runtime.excludedRounds=[];
try{const v=JSON.parse(localStorage.getItem(runtime.EXCLUDED_ROUNDS_KEY));if(Array.isArray(v))runtime.excludedRounds=v.filter(x=>typeof x==='string')}catch(_){}
runtime.roundKey=(s,index)=>s.id+':'+index;
document.addEventListener('click',e=>{const b=e.target.closest('[data-round-key]');if(b)toggleRoundExclusion(b.dataset.roundKey)});
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectRoundStorage=connectRoundStorage;
})();

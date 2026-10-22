// storage/local: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectLocalStorage(runtime){
let DATA_SCHEMA_VERSION,ERROR_LOG_KEY,recoveryNotice,recoveryReadOnly,RECOVERY_HISTORY_KEY;
function recordError(area,error){
 try{const raw=JSON.parse(localStorage.getItem(ERROR_LOG_KEY)||'[]'),rows=Array.isArray(raw)?raw:[];rows.push({at:new Date().toISOString(),area:String(area).slice(0,48),message:String(error&&error.message||error).slice(0,160)});localStorage.setItem(ERROR_LOG_KEY,JSON.stringify(rows.slice(-30)))}catch(_){}
}
function parseSavedState(raw){if(!raw)return null;try{const v=JSON.parse(raw);if(!v||v.schemaVersion!==DATA_SCHEMA_VERSION||!Array.isArray(v.sessions)||v.sessions.some(s=>!s||typeof s!=='object'||!Array.isArray(s.darts))|| (v.active!==null&&v.active!==undefined&&(!v.active||typeof v.active!=='object'||!Array.isArray(v.active.darts))))return null;return v}catch(_){return null}}
function updateSaveIndicator(){const box=runtime.$('saveIndicator'),label=runtime.$('saveText');if(!box||!label)return;box.classList.toggle('save-error',runtime.saveOK===false);box.classList.toggle('save-pending',runtime.sessionDone(runtime.store.active)&&runtime.saveOK!==false);if(runtime.saveOK===false){label.textContent='保存失敗 — ブラウザの保存領域を確認';return}if(runtime.saveOK===null){label.textContent='未投球 — 投げると自動保存';return}const time=runtime.savedAt?new Date(runtime.savedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';label.textContent=runtime.sessionDone(runtime.store.active)?'入力保存済み · 確定待ち':'自動保存済み · '+time;}
function recoveryCandidates(){
 const rows=[['現在の保存',runtime.KEY],['直前の保存',runtime.KEY+'-recovery']];
 try{const h=JSON.parse(localStorage.getItem(RECOVERY_HISTORY_KEY)||'[]');if(Array.isArray(h))h.forEach((v,i)=>{if(typeof v==='string')rows.push(['履歴 '+(i+1),null,v])})}catch(_){}
 return rows.map(([name,key,raw])=>({name,raw:raw===undefined?localStorage.getItem(key):raw})).filter(x=>parseSavedState(x.raw));
}
function recoveryRender(){
 const el=runtime.$('recoveryStatus');if(!el)return;
 const rows=recoveryCandidates();
 el.textContent=(recoveryReadOnly?'保存停止中。復旧操作を行ってください。':'通常モード。')+' 利用可能な正常データ: '+rows.map(x=>x.name).join(' / ');
 const sel=runtime.$('recoveryChoice');if(sel){sel.innerHTML='';rows.forEach((x,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=x.name;sel.appendChild(opt)})}
}
function recoveryExport(){
 const data={format:'retro-darts-recovery-v1',createdAt:new Date().toISOString(),entries:{}};
 for(const key of [runtime.KEY,runtime.KEY+'-recovery',RECOVERY_HISTORY_KEY,runtime.MY_KEY,runtime.MY_KEY+'-recovery',runtime.SYNC_KEY,runtime.EXCLUDED_ROUNDS_KEY,ERROR_LOG_KEY]){try{data.entries[key]=localStorage.getItem(key)}catch(_){}}
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='retro-darts-recovery-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function recoveryRestore(){
 const rows=recoveryCandidates(),sel=runtime.$('recoveryChoice'),item=rows[Number(sel&&sel.value)||0];
 if(!item||!parseSavedState(item.raw))return alert('復旧可能な正常データがありません');
 if(!confirm(item.name+'から練習記録を復旧します。現在の保存データは復旧用ファイルに書き出してから操作してください。続けますか？'))return;
 try{
  const previous=localStorage.getItem(runtime.KEY);
  if(previous!==null)localStorage.setItem(runtime.KEY+'-before-restore',previous);
  localStorage.setItem(runtime.KEY,item.raw);
  if(!parseSavedState(localStorage.getItem(runtime.KEY)))throw Error('復旧データの書き込み確認に失敗しました');
  recoveryReadOnly=false;
  location.reload();
 }catch(e){recordError('recoveryRestore',e);alert('復旧に失敗しました。元データを確認し、保存領域を確認してください。')}
}
function recoveryHistory(prior){
 try{const h=JSON.parse(localStorage.getItem(RECOVERY_HISTORY_KEY)||'[]'),list=Array.isArray(h)?h.filter(x=>typeof x==='string'&&parseSavedState(x)):[];if(list[0]!==prior)list.unshift(prior);localStorage.setItem(RECOVERY_HISTORY_KEY,JSON.stringify(list.slice(0,3)))}catch(_){}
}
function setupRecovery(){
 if(!runtime.$('recoveryStatus'))return;
 runtime.$('recoveryExport').onclick=recoveryExport;runtime.$('recoveryRestore').onclick=recoveryRestore;recoveryRender();
}
function persist(){if(recoveryReadOnly){runtime.saveOK=false;alert('保存データの異常を検出したため、自動保存を停止しています。先にデータを確認してバックアップを取得してください。');return false}try{const prior=localStorage.getItem(runtime.KEY);if(prior!==null&&parseSavedState(prior)){recoveryHistory(prior);try{localStorage.setItem(runtime.KEY+'-recovery',prior)}catch(_){}}localStorage.setItem(runtime.KEY,JSON.stringify(runtime.store));runtime.saveOK=true;runtime.savedAt=Date.now();updateSaveIndicator();try{runtime.cloudAuto()}catch(_){}return true}catch(e){recordError('persist',e);runtime.saveOK=false;updateSaveIndicator();alert('保存に失敗しました。ブラウザの保存領域を確認してください。');return false}}
function id(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}
Object.assign(runtime,{updateSaveIndicator,setupRecovery,persist,id});
function initialize(){
DATA_SCHEMA_VERSION=1;
ERROR_LOG_KEY='dtl-error-log-v1';
recoveryNotice=false;
recoveryReadOnly=false;
try{
 const primaryRaw=localStorage.getItem(runtime.KEY),primary=parseSavedState(primaryRaw);
 if(primary)runtime.store={...runtime.store,...primary};
 else if(primaryRaw!==null){
  const recovered=parseSavedState(localStorage.getItem(runtime.KEY+'-recovery'));
  if(recovered){runtime.store={...runtime.store,...recovered};recoveryNotice=true;recoveryReadOnly=true;console.warn('Primary save invalid; loaded recovery snapshot without overwriting either copy')}
  else{recoveryNotice=true;recoveryReadOnly=true;console.error('Saved data invalid and no valid recovery snapshot; original data retained')}
 }
}catch(e){recordError('loadSavedState',e);console.warn('Saved data unavailable',e)}
if(recoveryNotice)window.addEventListener('load',()=>setTimeout(()=>alert('保存データに異常を検出しました。復旧用データがあれば読み込みました。元データを保護するため自動保存を停止しました。データを確認し、バックアップを保存してください。'),0),{once:true});
RECOVERY_HISTORY_KEY=runtime.KEY+'-history';
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectLocalStorage=connectLocalStorage;
})();

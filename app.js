try{if(!/[?&]dev=1\b/.test(location.search))document.documentElement.classList.add('no-dev')}catch(e){}

(()=>{'use strict';
const $=id=>document.getElementById(id),KEY='dtl-data-v1',nums=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
let audioCtx=null;
let store={schemaVersion:1,sessions:[],active:null,bindings:{},roundDelay:8,soundEnabled:true},lastKey=null,keyLog=[],calibrationActive=false,calibrationIndex=0,calibrationLastIndex=-1,calibrationLastAt=0,viewId=null,showResult=false,lastBoardEvent=0,roundBreakTimer=null,roundBreakUntil=0,saveOK=null,savedAt=null,justSaved=false;
const DATA_SCHEMA_VERSION=1,ERROR_LOG_KEY='dtl-error-log-v1';
function recordError(area,error){
 try{const raw=JSON.parse(localStorage.getItem(ERROR_LOG_KEY)||'[]'),rows=Array.isArray(raw)?raw:[];rows.push({at:new Date().toISOString(),area:String(area).slice(0,48),message:String(error&&error.message||error).slice(0,160)});localStorage.setItem(ERROR_LOG_KEY,JSON.stringify(rows.slice(-30)))}catch(_){}
}
function parseSavedState(raw){if(!raw)return null;try{const v=JSON.parse(raw);if(!v||v.schemaVersion!==DATA_SCHEMA_VERSION||!Array.isArray(v.sessions)||v.sessions.some(s=>!s||typeof s!=='object'||!Array.isArray(s.darts))|| (v.active!==null&&v.active!==undefined&&(!v.active||typeof v.active!=='object'||!Array.isArray(v.active.darts))))return null;return v}catch(_){return null}}
let recoveryNotice=false,recoveryReadOnly=false;
try{
 const primaryRaw=localStorage.getItem(KEY),primary=parseSavedState(primaryRaw);
 if(primary)store={...store,...primary};
 else if(primaryRaw!==null){
  const recovered=parseSavedState(localStorage.getItem(KEY+'-recovery'));
  if(recovered){store={...store,...recovered};recoveryNotice=true;recoveryReadOnly=true;console.warn('Primary save invalid; loaded recovery snapshot without overwriting either copy')}
  else{recoveryNotice=true;recoveryReadOnly=true;console.error('Saved data invalid and no valid recovery snapshot; original data retained')}
 }
}catch(e){recordError('loadSavedState',e);console.warn('Saved data unavailable',e)}
if(recoveryNotice)window.addEventListener('load',()=>setTimeout(()=>alert('保存データに異常を検出しました。復旧用データがあれば読み込みました。元データを保護するため自動保存を停止しました。データを確認し、バックアップを保存してください。'),0),{once:true});
function updateSaveIndicator(){const box=$('saveIndicator'),label=$('saveText');if(!box||!label)return;box.classList.toggle('save-error',saveOK===false);box.classList.toggle('save-pending',store.active.darts.length===24&&saveOK!==false);if(saveOK===false){label.textContent='保存失敗 — ブラウザの保存領域を確認';return}if(saveOK===null){label.textContent='未投球 — 投げると自動保存';return}const time=savedAt?new Date(savedAt).toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';label.textContent=store.active.darts.length===24?'入力保存済み · 確定待ち':'自動保存済み · '+time;}
const RECOVERY_HISTORY_KEY=KEY+'-history';
function recoveryCandidates(){
 const rows=[['現在の保存',KEY],['直前の保存',KEY+'-recovery']];
 try{const h=JSON.parse(localStorage.getItem(RECOVERY_HISTORY_KEY)||'[]');if(Array.isArray(h))h.forEach((v,i)=>{if(typeof v==='string')rows.push(['履歴 '+(i+1),null,v])})}catch(_){}
 return rows.map(([name,key,raw])=>({name,raw:raw===undefined?localStorage.getItem(key):raw})).filter(x=>parseSavedState(x.raw));
}
function recoveryRender(){
 const el=$('recoveryStatus');if(!el)return;
 const rows=recoveryCandidates();
 el.textContent=(recoveryReadOnly?'保存停止中。復旧操作を行ってください。':'通常モード。')+' 利用可能な正常データ: '+rows.map(x=>x.name).join(' / ');
 const sel=$('recoveryChoice');if(sel){sel.innerHTML='';rows.forEach((x,i)=>{const opt=document.createElement('option');opt.value=String(i);opt.textContent=x.name;sel.appendChild(opt)})}
}
function recoveryExport(){
 const data={format:'retro-darts-recovery-v1',createdAt:new Date().toISOString(),entries:{}};
 for(const key of [KEY,KEY+'-recovery',RECOVERY_HISTORY_KEY,MY_KEY,MY_KEY+'-recovery',SYNC_KEY,EXCLUDED_ROUNDS_KEY,ERROR_LOG_KEY]){try{data.entries[key]=localStorage.getItem(key)}catch(_){}}
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='retro-darts-recovery-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function recoveryRestore(){
 const rows=recoveryCandidates(),sel=$('recoveryChoice'),item=rows[Number(sel&&sel.value)||0];
 if(!item||!parseSavedState(item.raw))return alert('復旧可能な正常データがありません');
 if(!confirm(item.name+'から練習記録を復旧します。現在の保存データは復旧用ファイルに書き出してから操作してください。続けますか？'))return;
 try{
  const previous=localStorage.getItem(KEY);
  if(previous!==null)localStorage.setItem(KEY+'-before-restore',previous);
  localStorage.setItem(KEY,item.raw);
  if(!parseSavedState(localStorage.getItem(KEY)))throw Error('復旧データの書き込み確認に失敗しました');
  recoveryReadOnly=false;
  location.reload();
 }catch(e){recordError('recoveryRestore',e);alert('復旧に失敗しました。元データを確認し、保存領域を確認してください。')}
}
function recoveryHistory(prior){
 try{const h=JSON.parse(localStorage.getItem(RECOVERY_HISTORY_KEY)||'[]'),list=Array.isArray(h)?h.filter(x=>typeof x==='string'&&parseSavedState(x)):[];if(list[0]!==prior)list.unshift(prior);localStorage.setItem(RECOVERY_HISTORY_KEY,JSON.stringify(list.slice(0,3)))}catch(_){}
}
function setupRecovery(){
 if(!$('recoveryStatus'))return;
 $('recoveryExport').onclick=recoveryExport;$('recoveryRestore').onclick=recoveryRestore;recoveryRender();
}
function persist(){if(recoveryReadOnly){saveOK=false;alert('保存データの異常を検出したため、自動保存を停止しています。先にデータを確認してバックアップを取得してください。');return false}try{const prior=localStorage.getItem(KEY);if(prior!==null&&parseSavedState(prior)){recoveryHistory(prior);try{localStorage.setItem(KEY+'-recovery',prior)}catch(_){}}localStorage.setItem(KEY,JSON.stringify(store));saveOK=true;savedAt=Date.now();updateSaveIndicator();try{cloudAuto()}catch(_){}return true}catch(e){recordError('persist',e);saveOK=false;updateSaveIndicator();alert('保存に失敗しました。ブラウザの保存領域を確認してください。');return false}}
function id(){return Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,10)}

/* ===== CLOUD SYNC state (optional; the app works fully without login) ===== */
const SYNC_KEY='dtl-sync-v1';
let syncMeta={pushed:[],myAt:0,myPushed:0,lastAt:0,on:false};try{const v=JSON.parse(localStorage.getItem(SYNC_KEY));if(v&&typeof v==='object')syncMeta={pushed:Array.isArray(v.pushed)?v.pushed.filter(x=>typeof x==='string'):[],myAt:+v.myAt||0,myPushed:+v.myPushed||0,lastAt:+v.lastAt||0,on:!!v.on}}catch(_){}
let cloud={user:null,api:null,busy:false,timer:0,applying:false,pending:false,autoBusy:false};
function profTouch(){if(cloud.applying)return;syncMeta.myAt=Date.now();syncMetaSave();try{cloudAuto()}catch(_){}}
function syncMetaSave(){try{localStorage.setItem(SYNC_KEY,JSON.stringify(syncMeta))}catch(_){}}
const MY_KEY='retro-my-darts-v1';const MY_BRANDS=['未指定','TARGET','TRiNiDAD','DYNASTY','COSMO DARTS','TIGA','その他'];const MY_COLORS=['未指定','シルバー','ブラック','ホワイト','レッド','ブルー','ゴールド','パープル','グリーン','クリア','その他'];const MY_FIELDS=['SetupName','BarrelBrand','BarrelModel','BarrelShape','BarrelWeight','BarrelColor','FlightShape','FlightColor','Shaft','Tip','TipColor','TipLength','Memo'];
function sanitizeMyDarts(data){if(!data||typeof data!=='object'||Array.isArray(data))return {nick:'',sets:[],current:''};const seen=new Set();const sets=(Array.isArray(data.sets)?data.sets:[]).filter(x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.id==='string'&&x.id.length>0&&x.id.length<100&&!seen.has(x.id)&&seen.add(x.id)).slice(0,10).map(x=>{const clean={id:x.id};for(const f of MY_FIELDS)clean[f]=typeof x[f]==='string'?x[f].slice(0,f==='Memo'?2000:120):'';return clean});return {nick:typeof data.nick==='string'?data.nick.slice(0,32):'',sets,current:typeof data.current==='string'&&sets.some(x=>x.id===data.current)?data.current:''}}
let myDarts={nick:'',sets:[],current:''};try{myDarts=sanitizeMyDarts(JSON.parse(localStorage.getItem(MY_KEY)))}catch(_){}

try{const raw=localStorage.getItem(MY_KEY);if(raw!==null){const data=JSON.parse(raw);if(!data||typeof data!=='object'||!Array.isArray(data.sets))throw Error('Invalid MY DARTS');} }catch(_){try{const backup=JSON.parse(localStorage.getItem(MY_KEY+'-recovery'));if(backup&&typeof backup==='object'&&Array.isArray(backup.sets))myDarts=sanitizeMyDarts(backup)}catch(__){}}
let myLast=JSON.stringify(myDarts);
function restampActive(){try{const a=store.active;if(!a||a.darts.length)return;const sid=myDarts.current||null,sn=myDarts.sets.find(x=>x.id===myDarts.current)?.SetupName||null,nk=myDarts.nick||null;if(a.setupId!==sid||a.setupName!==sn||a.nickname!==nk){a.setupId=sid;a.setupName=sn;a.nickname=nk;persist()}}catch(_){}}
function mySaveState(){try{const t=JSON.stringify(myDarts);const prior=localStorage.getItem(MY_KEY);if(prior!==null){try{const parsed=JSON.parse(prior);if(parsed&&typeof parsed==='object'&&!Array.isArray(parsed)&&Array.isArray(parsed.sets))localStorage.setItem(MY_KEY+'-recovery',prior)}catch(_){}}localStorage.setItem(MY_KEY,t);myLast=t;if(!cloud.applying){syncMeta.myAt=Date.now();syncMetaSave()}restampActive();try{cloudAuto()}catch(_){}return true}catch(_){try{myDarts=sanitizeMyDarts(JSON.parse(myLast))}catch(__){}alert('MY DARTSを保存できませんでした。変更は取り消しました');return false}}
const myFields=MY_FIELDS;let editingSetup='';
function myRender(){const current=$('myCurrent'),slot=$('mySlot');if(!current||!slot)return;const nick=$('myNick');if(document.activeElement!==nick)nick.value=myDarts.nick;const opts=myDarts.sets.map(x=>'<option value="'+esc(x.id)+'">'+esc(x.SetupName||'無題')+'</option>').join('');current.innerHTML='<option value="">未設定（お試し）</option>'+opts;current.value=myDarts.current;slot.innerHTML='<option value="">新しいセットを作る</option>'+opts;slot.value=editingSetup;const label=$('myDartsStatus');if(label)label.textContent=(myDarts.nick||'ゲスト')+' ／ '+(myDarts.sets.find(x=>x.id===myDarts.current)?.SetupName||'セッティング未設定');mySlotsRender();myChipsRender()}
function myChipsRender(){const cur=myDarts.sets.find(x=>x.id===myDarts.current);const c=$('setChip');if(c)c.textContent='SET '+(cur?(cur.SetupName||'無題'):'未設定');const t=$('myEditTitle');if(t){const i=myDarts.sets.findIndex(x=>x.id===editingSetup);t.textContent=i>=0?'SET '+(i+1)+' を編集中':'新しいセットを登録'}const l=$('setSheetList');if(l)l.innerHTML='<button type="button" data-use="" class="sheet-item'+(!cur?' on':'')+'">未設定（お試し）</button>'+myDarts.sets.map((x,i)=>'<button type="button" data-use="'+esc(x.id)+'" class="sheet-item'+(x.id===myDarts.current?' on':'')+'"><span>SET '+(i+1)+'</span> '+esc(x.SetupName||'無題')+'</button>').join('')}
function myUse(id){const c=$('myCurrent');c.value=id;c.onchange({target:c})}
function mySlotsRender(){const box=$('mySlots');if(!box)return;let h='';for(let i=0;i<10;i++){const x=myDarts.sets[i];if(!x){h+='<button type="button" class="my-slot empty" data-slot-new="1"><span class="my-slot-no">SET '+(i+1)+'</span><b>未設定</b><small>タップで新規登録</small></button>';continue}const using=x.id===myDarts.current,editing=x.id===editingSetup;h+='<div class="my-slot'+(using?' using':'')+(editing?' on':'')+'"><button type="button" class="my-slot-main" data-slot-edit="'+esc(x.id)+'"><span class="my-slot-no">SET '+(i+1)+(using?' · 使用中':'')+'</span><b>'+esc(x.SetupName||'無題')+'</b><small>'+esc(x.BarrelModel||x.BarrelBrand||'—')+'</small></button>'+(using?'<span class="my-slot-use is">USING</span>':'<button type="button" class="my-slot-use" data-slot-use="'+esc(x.id)+'">これを使う</button>')+'</div>'}box.innerHTML=h}
function myLoad(id){editingSetup=id;const x=myDarts.sets.find(s=>s.id===id)||{};for(const f of myFields){const el=$('my'+f);if(el)el.value=x[f]||((f==='BarrelBrand'||f.endsWith('Color'))?'未指定':'')}myRender()}

const BARREL_CATALOG=[{"brand":"TARGET","name":"RISING SUN G8 2BA","year":2024,"weight":20,"material":90,"length":45,"diameter":7.4,"color":"未指定","shape":"ストレート","note":"村松治樹モデル。スリムなシェイプとマットグリップ加工。","url":"https://top.target-darts.jp/news/151"},{"brand":"TARGET","name":"RISING SUN G9 2BA","year":2024,"weight":21.5,"material":95,"length":45,"diameter":7.4,"color":"パープル","shape":"ストレート","note":"村松治樹モデル。後方の繊細なリングカットとPVDパープル。","url":"https://top.target-darts.jp/news/193"},{"brand":"TARGET","name":"RISING SUN G9 NO GROOVE 2BA","year":2025,"weight":19,"material":95,"length":45,"diameter":7.4,"color":"ブルー","shape":"ストレート","note":"後方をノーグルーブ化したリアグリップ向けモデル。","url":"https://top.target-darts.jp/news/211"},{"brand":"TARGET","name":"RISING SUN G10 2BA","year":2025,"weight":21.5,"material":95,"length":45,"diameter":7.4,"color":"ブルー","shape":"ストレート","note":"村松治樹モデル。レーシングカー着想のリア重心設計。","url":"https://top.target-darts.jp/news/242"},{"brand":"TARGET","name":"RISING SUN G10.5 2BA","year":2026,"weight":21.5,"material":95,"length":45,"diameter":7.45,"color":"グリーン","shape":"ストレート","note":"高密度リングカットとグレイッシュグリーンのコーティング。","url":"https://top.target-darts.jp/news/278"},{"brand":"TARGET","name":"PYRO G10 2BA","year":2024,"weight":17,"material":95,"length":39,"diameter":7.6,"color":"未指定","shape":"トルピード","note":"星野光正モデル。トルピードとストレートを融合した形状。","url":"https://top.target-darts.jp/news/165"},{"brand":"COSMO DARTS","name":"Nami Iwasaki","year":2025,"weight":19,"material":90,"length":43,"diameter":7.6,"color":"未指定","shape":"トルピード","note":"岩崎奈美選手モデル。中央から後方の均一なリングカット。","url":"https://www.cosmodarts.jp/post-136345/"},{"brand":"COSMO DARTS","name":"Shunpei Noge v3","year":2025,"weight":19,"material":90,"length":43,"diameter":7.4,"color":"未指定","shape":"トルピード","note":"野毛駿平選手の第3作。中央に『の』の字を思わせるカット。","url":"https://www.cosmodarts.jp/new-product-announcement-3/"},{"brand":"TARGET","name":"RENEGADE 4.0 2BA","year":2025,"weight":19,"material":90,"length":46,"diameter":7.4,"color":"未指定","shape":"トルピード","note":"BLACK MARQUEシリーズ","url":"https://top.target-darts.jp/news/222"},{"brand":"TARGET","name":"DRAGON 3.0 2BA","year":2025,"weight":18,"material":90,"length":45,"diameter":7.2,"color":"未指定","shape":"ストレート","note":"BLACK MARQUEシリーズ","url":"https://top.target-darts.jp/news/222"},{"brand":"TARGET","name":"WARRIOR 2BA","year":2025,"weight":18.5,"material":90,"length":45,"diameter":7.2,"color":"未指定","shape":"ストレート","note":"BLACK MARQUEシリーズ","url":"https://top.target-darts.jp/news/222"},{"brand":"TARGET","name":"SMASH G3 2BA","year":2025,"weight":18,"material":90,"length":40,"diameter":8,"color":"ブラック","shape":"トルピード","note":"恋川純弥選手モデル","url":"https://top.target-darts.jp/news/200"},{"brand":"TARGET","name":"SIRIUS G4 2BA","year":2025,"weight":21.5,"material":90,"length":51,"diameter":6.7,"color":"未指定","shape":"ストレート","note":"SIRIUS第4世代","url":"https://top.target-darts.jp/news/225"},{"brand":"TARGET","name":"SIRIUS G4 2BA 限定版","year":2025,"weight":20.5,"material":90,"length":51,"diameter":6.7,"color":"未指定","shape":"ストレート","note":"公式オンラインショップ限定版","url":"https://top.target-darts.jp/news/225"},{"brand":"TARGET","name":"CHARIS G5 2BA","year":2025,"weight":19,"material":90,"length":45,"diameter":7,"color":"未指定","shape":"ストレート","note":"CHARIS第5世代","url":"https://top.target-darts.jp/news/220"},{"brand":"TARGET","name":"CHARIS G5 2BA 限定版","year":2025,"weight":18,"material":90,"length":45,"diameter":7,"color":"未指定","shape":"ストレート","note":"公式オンラインショップ限定版","url":"https://top.target-darts.jp/news/220"},{"brand":"TARGET","name":"CHARIS G5 2BA DARTS HIVE限定","year":2025,"weight":19,"material":90,"length":45,"diameter":7,"color":"未指定","shape":"ストレート","note":"DARTS HIVE限定版","url":"https://top.target-darts.jp/news/220"},{"brand":"TARGET","name":"DIAMOND G3 2BA","year":2025,"weight":18,"material":90,"length":42,"diameter":7,"color":"レッド","shape":"ストレート","note":"いわお小鈴選手モデル","url":"https://top.target-darts.jp/news/202"},{"brand":"TARGET","name":"THE MIRACLE G7 2BA","year":2025,"weight":21.5,"material":95,"length":50,"diameter":7,"color":"グリーン","shape":"ストレート","note":"鈴木未来選手モデル","url":"https://top.target-darts.jp/news/234"},{"brand":"TARGET","name":"THE MIRACLE G7 2BA 限定版","year":2025,"weight":21.5,"material":95,"length":50,"diameter":7,"color":"未指定","shape":"ストレート","note":"公式オンラインショップ限定版","url":"https://top.target-darts.jp/news/234"},{"brand":"TARGET","name":"ZENITH G2 2BA","year":2025,"weight":20,"material":90,"length":44,"diameter":7.45,"color":"未指定","shape":"トルピード","note":"ZENITH第2世代","url":"https://top.target-darts.jp/news/239"},{"brand":"TARGET","name":"ENDEAVOUR G2 2BA","year":2025,"weight":20,"material":90,"length":48,"diameter":6.8,"color":"パープル","shape":"ストレート","note":"佐藤かす美選手モデル","url":"https://top.target-darts.jp/news/212"},{"brand":"TARGET","name":"DRACO 2.0 2BA","year":2025,"weight":20,"material":90,"length":50,"diameter":6.4,"color":"未指定","shape":"ストレート","note":"BLACK MARQUEシリーズ","url":"https://top.target-darts.jp/news/203"},{"brand":"TARGET","name":"HERACLES 2BA","year":2025,"weight":18,"material":90,"length":42,"diameter":7.8,"color":"未指定","shape":"トルピード","note":"BLACK MARQUEシリーズ","url":"https://top.target-darts.jp/news/203"},{"brand":"TARGET","name":"REYN 2.0 2BA","year":2025,"weight":17.5,"material":90,"length":48,"diameter":6.4,"color":"ゴールド","shape":"ストレート","note":"BLACK MARQUEシリーズ","url":"https://top.target-darts.jp/news/203"},{"brand":"TARGET","name":"MAYO G7 2BA 限定版","year":2025,"weight":18,"material":90,"length":null,"diameter":null,"color":"未指定","shape":"トルピード","note":"森田真結子選手モデル。公式限定版","url":"https://www.target-darts.jp/shopdetail/000000002614/"},{"brand":"TRiNiDAD","name":"LAZY TYPE2.5","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"LAZY TYPE2 TORPEDO","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ZAPATA TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROMAN TYPE7","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GONZALEZ TYPE7","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"LAZY TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"LAZY ZERO","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"LAW TYPE4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GOMEZ TYPE17","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GOMEZ TYPE16 20g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GOMEZ TYPE16 EVO","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GOMEZ TYPE16","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GOMEZ TYPE15 20g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GOMEZ TYPE15","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RICARDO TYPE3.5","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RICARDO TYPE3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RICARDO TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RICARDO LOPEZ","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RICARDO α","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROMERO TYPE4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROMERO TYPE3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROMERO TYPE3 ST","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROMERO TYPE2 21g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROMERO TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"KID TYPE4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"KID TYPE3 EVO","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"KID TYPE2 EVO","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"KID TYPE3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"KID TYPE2 ST","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"KID TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"HUGO TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"BENITEZ TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"BAZOOKA TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"LOCCHE TYPE3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"EDER TYPE6","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"SANTANA","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RAUL","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"GUILLERMO","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"BASSA","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"JOHN TYPE2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"COTTO TYPE3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RAFAEL","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"SALDIVAR TYPE4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ROSA","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"RUIZ","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"ANSON","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"MARQUÊS TYPE3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"VICTOR","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"TRiNiDAD","name":"FREITAS TYPE4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://e-tri.jp/barrel/","verified":"name-only"},{"brand":"DYNASTY","name":"PERSEUS Blast 18g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"PERSEUS Blast 19g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"PERSEUS 滅","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"PERSEUS DR","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"PERSEUS 21g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"AK-7","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"Coral+","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"Riell8","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"DENIM","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"ARCTIC HAN2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"TOA2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"EDDIE4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"LISA ST","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"NUSH IV","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"Coral","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"LIBERTAS III","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"Marley","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"GARUDA","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"Kokopelli2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"LISA5 elysium","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"SCEPTER3","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"LISA4 plus","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"RIELL7 19g","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"I'LL4","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"ORTEGA2.2 2BA","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"DYNASTY","name":"STRAIGHT 7","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://maximnet.co.jp/shopbrand/dynasty_darts/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Youhi Watanabe","year":2026,"weight":19,"material":90,"length":40,"diameter":7.6,"color":"未指定","shape":"トルピード","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/post-137207/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Yoshihisa Baba v2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Yutaro Sato","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Kenichi Ajiki","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Daisuke Akamatsu","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Shinji Umeda","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Yoshihisa Baba v5","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Ami Komiyama v2","year":2025,"weight":20,"material":90,"length":48,"diameter":6.9,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/en/post-136701/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Shintaro Inoue v2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Shunpei Noge v2","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"COSMO DARTS","name":"Ayaka Okamoto","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://www.cosmodarts.jp/product/","verified":"name-only"},{"brand":"TIGA","name":"Hermit2","year":null,"weight":18,"material":90,"length":42,"diameter":7.6,"color":"未指定","shape":"その他・不明","note":"TIGA公式ショップ掲載モデル。発売日は商品ページで確認。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"Hermit2 初回限定カラー","year":null,"weight":18,"material":90,"length":42,"diameter":7.6,"color":"未指定","shape":"その他・不明","note":"TIGA公式ショップ掲載モデル。発売日は商品ページで確認。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"STAR QUEEN2","year":2026,"weight":18,"material":90,"length":45,"diameter":7,"color":"未指定","shape":"その他・不明","note":"TIGA公式ショップ掲載モデル。発売日は商品ページで確認。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"THE GUNFIGHTER","year":null,"weight":19,"material":null,"length":52,"diameter":7,"color":"未指定","shape":"その他・不明","note":"TIGA公式ショップ掲載モデル。発売日は商品ページで確認。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"THE GUNFIGHTER 初回限定カラー","year":null,"weight":19,"material":null,"length":52,"diameter":7,"color":"未指定","shape":"その他・不明","note":"TIGA公式ショップ掲載モデル。発売日は商品ページで確認。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"Samurai 18","year":null,"weight":16.5,"material":90,"length":40,"diameter":7.2,"color":"未指定","shape":"その他・不明","note":"TIGA公式ショップ掲載モデル。発売日は商品ページで確認。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"STAR QUEEN2 Fusion","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"Arabesque Fusion","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://tigadarts.base.shop/","verified":"name-only"},{"brand":"TIGA","name":"Samurai Fusion NOVA 蒼","year":null,"weight":null,"material":null,"length":null,"diameter":null,"color":"未指定","shape":"その他・不明","note":"メーカーまたは販売店の掲載を確認。発売年・詳細スペックは確認中。","url":"https://tigadarts.base.shop/","verified":"name-only"}];
function catalogSpec(value,unit=''){return value===null||value===undefined||value===''?'未確認':String(value)+unit}
let brandFilterOn=true;
function catalogSearch(){const brand=brandFilterOn?$('myBarrelBrand').value:'未指定',q=$('myModelSearch').value.trim().toLowerCase(),list=$('myModelResults');const hits=BARREL_CATALOG.filter(x=>(brand==='未指定'||brand==='その他'||x.brand===brand)&&(!q||[x.name,x.brand,x.year??''].join(' ').toLowerCase().includes(q)));list.innerHTML='<p class="tiny muted">'+hits.length+'件 / 全'+BARREL_CATALOG.length+'モデル</p>'+hits.map(x=>'<button type="button" data-catalog-index="'+BARREL_CATALOG.indexOf(x)+'" style="text-align:left;padding:10px;border:1px solid #31414B;border-radius:9px;background:#1C2A33;color:#E3E8EA"><b>'+esc(x.name)+'</b><br><small>'+esc(x.brand)+' · '+catalogSpec(x.year,'年')+' · '+catalogSpec(x.weight,'g')+' · '+catalogSpec(x.material,'% タングステン')+'</small></button>').join('');if(!hits.length)list.innerHTML+='<p class="tiny muted">候補がありません。メーカーを「未指定」にするか自由入力してください。</p>'}
function chooseCatalog(index){const x=BARREL_CATALOG[index];if(!x)return;$('myBarrelBrand').value=x.brand;$('myBarrelModel').value=x.name;if(!$('mySetupName').value.trim())$('mySetupName').value=String(x.name).slice(0,40);$('myBarrelWeight').value=x.weight??'';$('myBarrelShape').value=x.shape||'その他・不明';$('myBarrelColor').value=x.color||'未指定';$('myModelInfo').innerHTML='<b>'+esc(x.name)+'</b>（'+catalogSpec(x.year,'年')+'）<br>タングステン：'+catalogSpec(x.material,'%')+' ／ 重量：'+catalogSpec(x.weight,'g')+' ／ 全長：'+catalogSpec(x.length,'mm')+' ／ 最大径：'+catalogSpec(x.diameter,'mm')+'<br>'+esc(x.note||'')+'<br><a href="'+esc(x.url||'#')+'" target="_blank" rel="noopener noreferrer">製品情報を見る ↗</a>';$('myModelSearch').value='';brandFilterOn=true;catalogSearch()}
function setupMyDarts(){const brand=$('myBarrelBrand');if(!brand)return;brand.innerHTML=MY_BRANDS.map(x=>'<option>'+x+'</option>').join('');for(const id of ['BarrelColor','FlightColor','TipColor'])$('my'+id).innerHTML=MY_COLORS.map(x=>'<option>'+x+'</option>').join('');$('myModelSearch').oninput=()=>{brandFilterOn=!$('myModelSearch').value.trim();catalogSearch()};brand.addEventListener('change',()=>{brandFilterOn=true;catalogSearch()});$('myModelResults').addEventListener('click',e=>{const b=e.target.closest('[data-catalog-index]');if(b)chooseCatalog(Number(b.dataset.catalogIndex))});catalogSearch();$('setChip').onclick=()=>{myChipsRender();$('setSheet').classList.remove('hidden')};$('setSheetClose').onclick=()=>$('setSheet').classList.add('hidden');$('setSheet').addEventListener('click',e=>{if(e.target===$('setSheet'))$('setSheet').classList.add('hidden')});$('setSheetList').addEventListener('click',e=>{const b=e.target.closest('[data-use]');if(!b)return;$('setSheet').classList.add('hidden');myUse(b.dataset.use)});$('setSheetEdit').onclick=()=>{$('setSheet').classList.add('hidden');changeTab('settings');setTimeout(()=>{const p=$('myDartsPanel');p&&p.scrollIntoView({behavior:'smooth',block:'start'})},60)};$('authChip').onclick=()=>{changeTab('settings');setTimeout(()=>{const p=$('cloudPanel');p&&p.scrollIntoView({behavior:'smooth',block:'start'})},60)};$('myDuplicate').onclick=()=>{if(!editingSetup){alert('複製するセットを、先にカードから選んでください');return}if(myDarts.sets.length>=10){alert('登録できるのは10セットまでです');return}const x=myDarts.sets.find(y=>y.id===editingSetup);if(!x)return;myLoad(x.id);editingSetup='';$('mySetupName').value=(String(x.SetupName||'')+' コピー').slice(0,40);myRender();toast('複製しました。名前を変えて保存してください')};$('mySlots').addEventListener('click',e=>{const n=e.target.closest('[data-slot-new]'),ed=e.target.closest('[data-slot-edit]'),us=e.target.closest('[data-slot-use]');if(n)myLoad('');else if(ed)myLoad(ed.dataset.slotEdit);else if(us){const c=$('myCurrent');c.value=us.dataset.slotUse;c.onchange({target:c})}});$('myNick').onchange=e=>{myDarts.nick=e.target.value.trim().slice(0,32);mySaveState();myRender()};$('myCurrent').onchange=e=>{if(store.active&&store.active.darts.length&&!confirm('投球中のゲームは今のセッティングのまま記録します。次のゲームから切り替えますか？')){myRender();return}myDarts.current=e.target.value;mySaveState();myRender()};$('mySlot').onchange=e=>myLoad(e.target.value);$('myClear').onclick=()=>myLoad('');$('mySave').onclick=()=>{const x={id:editingSetup||id()};for(const f of myFields)x[f]=String($('my'+f).value||'').trim();if(!x.SetupName){alert('セット名を入力してください');return}if(!editingSetup&&myDarts.sets.length>=10){alert('登録できるのは10セットまでです');return}if(!confirm('「'+x.SetupName+'」を保存しますか？'))return;const i=myDarts.sets.findIndex(s=>s.id===x.id);if(i<0)myDarts.sets.push(x);else myDarts.sets[i]=x;const prevEdit=editingSetup;editingSetup=x.id;if(mySaveState()){myRender();toast('MY DARTSを保存しました')}else{editingSetup=prevEdit;myRender()}};$('myDelete').onclick=()=>{if(!editingSetup)return;if(!confirm('このセットを削除しますか？過去の投球記録は残ります。'))return;myDarts.sets=myDarts.sets.filter(x=>x.id!==editingSetup);if(myDarts.current===editingSetup)myDarts.current='';const prevEdit=editingSetup;editingSetup='';if(mySaveState())myLoad('');else{editingSetup=prevEdit;myRender()}};myLoad('')}

function newSession(){return {id:id(),schemaVersion:1,gameType:'countup',startedAt:new Date().toISOString(),endedAt:null,status:'active',setupId:myDarts.current||null,setupName:myDarts.sets.find(x=>x.id===myDarts.current)?.SetupName||null,nickname:myDarts.nick||null,darts:[]}}
if(![5,8,10,15].includes(Number(store.roundDelay)))store.roundDelay=8;
if(!store.active)store.active=newSession();
if(localStorage.getItem(KEY)!==null){saveOK=true;savedAt=Date.now()}
if(store.active.darts.length===24)showResult=true;
const points=s=>s==='IB'?50:s==='OB'?50:s==='MISS'?0:Number(s.slice(1))*({S:1,D:2,T:3}[s[0]]||0);
const label=s=>s==='IB'?'INNER BULL':s==='OB'?'OUTER BULL':s==='MISS'?'MISS':({S:'SINGLE',D:'DOUBLE',T:'TRIPLE'}[s[0]]||'')+' '+s.slice(1);
const dartLabel=d=>d.zone&&/^S\d+(I|O)$/.test(d.zone)?'SINGLE '+d.segment.slice(1)+(d.zone.endsWith('I')?'（内側）':'（外側）'):label(d.segment);
const isBull=d=>d.segment==='IB'||d.segment==='OB';
const AIMS=['BULL'].concat(Array.from({length:20},(_,i)=>'T'+(20-i)),Array.from({length:20},(_,i)=>'D'+(20-i)));
const validAim=a=>typeof a==='string'&&AIMS.includes(a);
const aimOf=d=>validAim(d&&d.aim)?d.aim:'BULL';
const curAim=()=>validAim(store.aimTarget)?store.aimTarget:'BULL';
const aimHit=(d,a)=>a==='BULL'?isBull(d):d.segment===a;
let hitAim='BULL',analysisAim=null;
const isHit=d=>aimHit(d,hitAim);
const hitRate=ds=>ds.length?Math.round(ds.filter(isHit).length/ds.length*1000)/10:0;
const AT=t=>hitAim==='BULL'?t:t.replace(/\b(INNER |OUTER |IN |OUT )?BULL(S?)\b/g,(m,p,pl)=>p?m:hitAim+pl).replace(/ブル/g,hitAim).replace('（HAT TRICK）','');
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
// The audio file must be committed separately at assets/cooldown.mp3.
const cooldownAudioUrl='https://raw.githubusercontent.com/RyutanCAMP/darts-training-lab/main/assets/cooldown.mp3';
let cooldownBuffer=null;
async function preloadCooldownAudio(){
 try{
  const res=await fetch(cooldownAudioUrl);
  if(!res.ok)throw new Error('HTTP '+res.status);
  if(!audioReady())return;
  cooldownBuffer=await audioCtx.decodeAudioData(await res.arrayBuffer());
 }catch(err){console.warn('Cooldown audio load failed',err)}
}
window.addEventListener('pointerdown',()=>{if(!cooldownBuffer)preloadCooldownAudio()},{once:true});
preloadCooldownAudio();
function playSound(kind='hit',delay=0){
 if(store.soundEnabled===false)return;
 try{
  if(!audioReady())return;
  retroInit();
  const at=audioCtx.currentTime+.012+Math.max(0,delay),fx=soundLevel('fx');
  if(['hit','double','triple','bull','inner','miss'].includes(kind))retroHit(at,kind==='miss'?.28:kind==='inner'?1.25:1,kind==='inner'?.78:1);
  if(kind==='miss'||kind==='hit')return;
  if(kind==='cooldown'){
   // Play the user-selected Sound Effect Lab MP3 instead of synthesizing a tune.
   if(cooldownBuffer){
    const src=audioCtx.createBufferSource(),gain=audioCtx.createGain();
    src.buffer=cooldownBuffer;gain.gain.value=.30*fx;
    src.connect(gain);gain.connect(retroBus);src.start(at);
   }else{
    console.warn('Cooldown MP3 not loaded yet; add assets/cooldown.mp3 to the repository');
   }
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
let bgmTimer=null,bgmStep=0;
function bgmNote(freq,duration=.18){if(!audioCtx||audioCtx.state!=='running')return;const now=audioCtx.currentTime;const osc=audioCtx.createOscillator(),gain=audioCtx.createGain();osc.type='sine';osc.frequency.value=freq;const volume=.09*soundLevel('bgm');gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),now+.02);gain.gain.exponentialRampToValueAtTime(.0001,now+duration);osc.connect(gain);gain.connect(audioCtx.destination);osc.start(now);osc.stop(now+duration+.02)}
function bgmStop(){if(bgmTimer!==null){clearInterval(bgmTimer);bgmTimer=null}const b=$('musicToggle');if(b){b.textContent='BGM OFF';b.setAttribute('aria-pressed','false')}}
function bgmStart(){try{const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;if(!audioCtx)audioCtx=new Audio();audioCtx.resume().catch(()=>{});bgmStep=0;const notes=[261.63,329.63,392,523.25,392,329.63,293.66,392,440,587.33,440,392,329.63,392,261.63,0];const tick=()=>{const f=notes[bgmStep++%notes.length];if(f)bgmNote(f)};tick();bgmTimer=setInterval(tick,360);$('musicToggle').textContent='BGM ON';$('musicToggle').setAttribute('aria-pressed','true')}catch(e){console.warn('BGM unavailable',e)}}
$('musicToggle').onclick=()=>{if(bgmTimer!==null)bgmStop();else bgmStart()};


let gameFxTimer=null;
/* Pixel-art arcade FX: drawn locally, no image assets, respects reduced motion. */
let pixelFxFrame=null;
function pixelEffect(kind,duration){
 const canvas=$('pixelFx');if(!canvas)return;
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
 const box=$('gameFx');if(!box)return;clearTimeout(gameFxTimer);
 const type=kind==='record'?'record':title==='HAT TRICK!'?'hat':title==='DOUBLE BULL!'?'double':(kind==='bull'||kind==='inner')?'bull':null;
 box.className='game-fx '+kind+(type?' pixel-mode':'');
 $('gameFxTitle').textContent=title;$('gameFxSub').textContent=sub;
 const canvas=$('pixelFx');if(canvas)canvas.classList.toggle('active',!!type);
 if(pixelFxFrame!==null){cancelAnimationFrame(pixelFxFrame);pixelFxFrame=null}
 if(type)pixelEffect(type,duration);
 void box.offsetWidth;box.classList.add('show');
 gameFxTimer=setTimeout(()=>{box.classList.remove('show');if(canvas)canvas.classList.remove('active');if(pixelFxFrame!==null){cancelAnimationFrame(pixelFxFrame);pixelFxFrame=null}},duration);
}
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
/* Cooldown pixel display: score tier and special round marker. */
function drawCooldownPixels(score,darts){
 const cv=$('coolPixel');if(!cv)return;
 const g=cv.getContext('2d');if(!g)return;
 g.clearRect(0,0,128,60);
 const hat=darts.length===3&&darts.every(isBull);
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
 const duration=Math.max(1,Number(store.roundDelay)||8),ms=duration*1000;
 $('roundBreakLabel').textContent='ROUND '+round+' CLEAR';
 $('roundBreakScore').textContent='+'+score;
 $('roundBreakPraise').textContent=roundPraise(darts,score);
 drawCooldownPixels(score,darts);
 const isSpecial=darts.length===3&&(darts.every(isBull)||score>=100);
 const box=$('roundBreak'),progress=box.querySelector('.cool-progress'),count=$('roundBreakCountdown');
 box.classList.toggle('cool-special',isSpecial);box.classList.remove('hidden');
 roundBreakUntil=Date.now()+ms;
 const tick=()=>{const remaining=Math.max(0,roundBreakUntil-Date.now());count.textContent=String(Math.ceil(remaining/1000));if(progress)progress.style.strokeDashoffset=String(320.44*(1-remaining/ms));if(remaining<=0)finishRoundBreak()};
 tick();roundBreakTicker=setInterval(tick,50);roundBreakTimer=setTimeout(finishRoundBreak,ms);
}
function toast(s,type=''){const t=$('toast');t.textContent=s;t.classList.remove('award','bull','miss');if(type)t.classList.add(type)}
function changeTab(name){cancelAchievementDelay();finishRoundBreak();if(name==='analysis'){aimPeriod='10';analysisAim=null;reportOn=false}if(name!=='history')justSaved=false;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));render()}
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
function flashBoardHit(segment,zone){if(segment==='MISS')return;const matching=[...$('board').querySelectorAll('svg .hit')].filter(el=>el.dataset.segment===(zone||segment));matching.forEach(el=>{el.classList.remove('flash-hit','flash-outer-bull','flash-inner-bull');void el.getBoundingClientRect();const cls=segment==='IB'?'flash-inner-bull':segment==='OB'?'flash-outer-bull':'flash-hit';el.classList.add(cls);setTimeout(()=>el.classList.remove(cls),950)})}
let achievementDelayTimer=null;
function cancelAchievementDelay(){if(achievementDelayTimer!==null){clearTimeout(achievementDelayTimer);achievementDelayTimer=null}}
function add(segment,source='manual',zone=null){if(roundBreakUntil>Date.now()||achievementDelayTimer!==null)return;let s=store.active;if(s.darts.length>=24){toast('結果確認後に保存してください');return}let i=s.darts.length;let hat=false;s.darts.push({id:id(),sessionId:s.id,roundIndex:Math.floor(i/3)+1,dartIndex:i%3+1,timestamp:new Date().toISOString(),segment,zone:zone||null,score:points(segment),inputSource:source,aim:curAim(),corrected:false});if(s.darts.length===24){hat=s.darts.slice(-3).every(isBull);showResult=false;const total=sum(s.darts),past=finished(),best=past.length?Math.max(...past.map(x=>sum(x.darts))):null;const first=best===null,record=best!==null&&total>best;playSound(record||first?'hat':'finish');if(record){if(!hat)gameEffect('NEW RECORD!',''+total+' POINTS  /  +'+(total-best)+' BEST','record',3800);toast('NEW RECORD!  '+total+' POINTS','award')}else if(first){if(!hat)gameEffect('FIRST CLEAR!',''+total+' POINTS','record',3100);toast('FIRST CLEAR!  '+total+' POINTS','award')}else{if(!hat)gameEffect('GAME COMPLETE','TOTAL '+total+' POINTS','finish',2000);toast('GAME COMPLETE!  '+total+' POINTS','award')}}else {
 const round=s.darts.slice(Math.floor(i/3)*3),score=sum(round),last=s.darts.at(-1),shot=shotPraise(last);
 
 const completeRound=round.length===3,award=completeRound?roundPraise(round,score):null;
 const bullStreak=round.length>=2&&round.every(isBull);hat=completeRound&&round.every(isBull);
 if(completeRound&&['HAT TRICK!','TON 80!','HIGH TON!','LOW TON!'].includes(award)){
  playSound(award==='HAT TRICK!'?'hat':'round');
  toast(award+'  +'+score+' POINTS','award');
  if(award==='HAT TRICK!')gameEffect('HAT TRICK!','3 BULLS IN A ROW','award',3000);
 }else if(segment==='MISS'){
  playSound('miss');toast('MISS — NEXT DART','miss');
 }else{
  playSound(segment==='IB'?'inner':segment==='OB'?'bull':segment.startsWith('T')?'triple':segment.startsWith('D')?'double':'hit');
  toast((shot?shot.title:dartLabel(last))+'  +'+points(segment),isBull(last)?'bull':'');
  if(bullStreak&&!completeRound)gameEffect('DOUBLE BULL!','2 BULLS IN A ROW','bull',1500);
  else if(shot&&!completeRound)gameEffect(shot.title,'+'+points(segment)+' POINTS',shot.kind,850);
 }
 }if(s.darts.length===21)playSound('finalRound',.25);
 if(s.darts.length>0&&s.darts.length<24&&s.darts.length%3===0){
  // Queue the jingle after BULL/INNER BULL or achievement fanfare.
  const cueDelay=hat?3.1:segment==='IB'?1.4:segment==='OB'?1.1:s.darts.length===21?1.15:segment.startsWith('T')?.65:.45;
  playSound('cooldown',cueDelay);
 }
 persist();render();flashBoardHit(segment,zone);if(s.darts.length>0&&s.darts.length<24&&s.darts.length%3===0){const completedRound=s.darts.length/3;const rd=s.darts.slice(-3),rs=sum(rd);if(hat){achievementDelayTimer=setTimeout(()=>{achievementDelayTimer=null;beginRoundBreak(completedRound,rs,rd)},3100)}else beginRoundBreak(completedRound,rs,rd)}if(s.darts.length===24){const showFinal=()=>{showResult=true;render();requestAnimationFrame(()=>{$('resultpanel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})})};if(hat){showResult=false;gameEffect('HAT TRICK!','3 BULLS IN A ROW','award',3000);achievementDelayTimer=setTimeout(()=>{achievementDelayTimer=null;showFinal()},3100)}else requestAnimationFrame(showFinal)}}
function complete(status){let s=store.active;if(!s.darts.length)return false;const next=newSession();s.status=status;s.endedAt=new Date().toISOString();store.sessions.unshift(s);store.active=next;if(!persist()){store.active=s;store.sessions.shift();s.status='active';s.endedAt=null;return false}return true}
function startNew(){cancelAchievementDelay();finishRoundBreak();if(store.active.darts.length===24){if(!confirm('現在の24投を完走として保存し、新しいゲームを始めますか？'))return;if(!complete('completed'))return}else if(store.active.darts.length){if(!confirm('進行中のゲームを途中終了として保存し、新しいゲームを始めますか？'))return;if(!complete('abandoned'))return}else store.active=newSession();showResult=false;persist();toast('NEW GAME — GOOD LUCK!');changeTab('play')}
function undo(){cancelAchievementDelay();finishRoundBreak();if(!store.active.darts.length)return;store.active.darts.pop();showResult=false;persist();toast('直前の投球を取り消しました');render()}
function finishEarly(){if(!store.active.darts.length)return;if(store.active.darts.length===24){confirmResult();return}if(confirm('このゲームを途中終了として保存しますか？（完走平均には含みません）')){if(!complete('abandoned'))return;showResult=false;toast('途中終了として保存しました');render()}}
function confirmResult(){finishRoundBreak();if(store.active.darts.length!==24)return;let score=sum(store.active.darts);if(!complete('completed'))return;showResult=false;viewId=store.sessions[0].id;justSaved=true;toast('完走 '+score+' POINTS を履歴に保存しました');render();changeTab('history')}
function drawBoard(){const NS='http://www.w3.org/2000/svg',svg=document.createElementNS(NS,'svg');svg.setAttribute('viewBox','-230 -230 460 460');svg.setAttribute('role','img');svg.setAttribute('aria-label','着弾位置を選択するダーツボード');function el(t,a){let n=document.createElementNS(NS,t);Object.entries(a).forEach(([k,v])=>n.setAttribute(k,v));svg.appendChild(n);return n}function xy(r,a){return [r*Math.sin(a),-r*Math.cos(a)]}function wedge(r1,r2,a1,a2){let p=xy(r1,a1),q=xy(r2,a1),r=xy(r2,a2),s=xy(r1,a2);return 'M'+p+' L'+q+' A'+r2+' '+r2+' 0 0 1 '+r+' L'+s+' A'+r1+' '+r1+' 0 0 0 '+p+' Z'}el('circle',{r:225,fill:'#0a121b',stroke:'#4b6879','stroke-width':4});for(let i=0;i<20;i++){let a=i*Math.PI/10,n=nums[i];for(let [r1,r2,ring] of [[17,100,'S'],[100,113,'T'],[113,172,'S'],[172,185,'D']]){let col=ring==='S'?(i%2?'#ddd9c9':'#27323a'):(i%2?'#d64b55':'#2eb28d');let p=el('path',{d:wedge(r1,r2,a-Math.PI/20,a+Math.PI/20),fill:col,stroke:'#72828b','stroke-width':.65,class:'hit',tabindex:'0',role:'button','data-segment':ring+n+(ring==='S'?(r2===100?'I':'O'):''),'aria-label':label(ring+n)});p.addEventListener('click',()=>add(ring+n,'manual',ring+n+(ring==='S'?(r2===100?'I':'O'):'')));p.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();add(ring+n,'manual',ring+n+(ring==='S'?(r2===100?'I':'O'):''))}})}let [x,y]=xy(206,a),t=el('text',{x,y,fill:'#edf3fa','font-size':15,'font-weight':700,'text-anchor':'middle','dominant-baseline':'central','pointer-events':'none'});t.textContent=n}let ob=el('circle',{r:17,fill:'#1d9b7b',stroke:'#d9e0d8','stroke-width':1.5,class:'hit',role:'button',tabindex:'0','data-segment':'OB','aria-label':'OUTER BULL 25'});ob.onclick=()=>add('OB');ob.onkeydown=e=>{if(e.key==='Enter')add('OB')};let ib=el('circle',{r:7.7,fill:'#d94e5c',stroke:'#f0d2c6','stroke-width':1.5,class:'hit',role:'button',tabindex:'0','data-segment':'IB','aria-label':'INNER BULL 50'});ib.onclick=e=>{e.stopPropagation();add('IB')};ib.onkeydown=e=>{if(e.key==='Enter'){e.stopPropagation();add('IB')}};$('board').appendChild(svg)}
function bullBars(ds,aim){const A=aim||hitAim;return [1,2,3].map(i=>{const a=ds.filter(d=>d.dartIndex===i),k=a.filter(d=>aimHit(d,A)).length,p=a.length?Math.round(k/a.length*1000)/10:null;return '<div class="barrow"><span class="tiny">DART '+i+'</span><div class="track"><div class="fill" style="width:'+(p??0)+'%"></div></div><span class="tiny">'+(p===null?'—':p+'%')+' <span class="muted">('+k+'/'+a.length+')</span></span></div>'}).join('')}
function chart(ss){
 if(!ss.length)return '<div class="empty">—</div>';
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
function aimCenter(a){
 if(!a||a==='BULL')return {x:0,y:0};
 const idx=aimOrder.indexOf(Number(a.slice(1)));if(idx<0)return {x:0,y:0};
 const ang=(-90+idx*18)*Math.PI/180,r=a[0]==='T'?.54:.96;
 return {x:Math.cos(ang)*r,y:Math.sin(ang)*r};
}
function aimPoint(d){const p=aimPointRaw(d);if(!p)return null;const c=aimCenter(hitAim);return {x:p.x-c.x,y:p.y-c.y}}
function aimPointRaw(d){
 if(!d||d.segment==='MISS')return null;
 if(isBull(d))return {x:0,y:0};
 const n=Number(d.segment.slice(1)),idx=aimOrder.indexOf(n);
 if(idx<0)return null;
 if(d.segment[0]==='S'&&!/^S\d+[IO]$/.test(d.zone||''))return null; /* single without inner/outer zone: ring unknown, excluded from position estimates */
 const a=(-90+idx*18)*Math.PI/180;
 const r=d.segment[0]==='T'?.54:d.segment[0]==='D'?.96:d.zone?.endsWith('I')?.35:.79;
 return {x:Math.cos(a)*r,y:Math.sin(a)*r};
}
function renderAim(){
 const root=$('aimAnalysis');if(!root)return;
 const rounds=selectedRounds(),darts=rounds.flat(),pts=darts.map(aimPoint).filter(Boolean),rawPts=darts.map(aimPointRaw).filter(Boolean),tc=aimCenter(hitAim);
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
 const svg='<svg viewBox="0 0 260 260" role="img" aria-label="内外シングル・トリプル・ダブル別ヒートマップ">'+cells+bulls+'<circle cx="'+(130+tc.x*102).toFixed(1)+'" cy="'+(130+tc.y*102).toFixed(1)+'" r="11" fill="none" stroke="#fff" stroke-width="1.6" stroke-dasharray="3 3"><title>AIM '+hitAim+'</title></circle>'+(pts.length?'<circle cx="'+(130+median(rawPts.map(p=>p.x))*102).toFixed(1)+'" cy="'+(130+median(rawPts.map(p=>p.y))*102).toFixed(1)+'" r="7" fill="#e7fb67" stroke="#091622" stroke-width="2"/>':'')+'<text x="130" y="14" text-anchor="middle" fill="#b5ccd4" font-size="12">上</text><text x="130" y="255" text-anchor="middle" fill="#b5ccd4" font-size="12">下</text><text x="12" y="135" text-anchor="middle" fill="#b5ccd4" font-size="12">左</text><text x="248" y="135" text-anchor="middle" fill="#b5ccd4" font-size="12">右</text></svg>';
 const stat=(label,num)=>'<div class="aim-stat"><span>'+label+'</span><strong>'+num+'%</strong></div>';
 root.innerHTML='<div class="aim-heat-key"><span>LOW</span><i></i><span>HIGH</span></div><div class="aim-layout"><div class="aim-visual">'+svg+'</div><div class="aim-results"><div class="aim-tendency">'+(direction==='中央'||direction==='—'?direction:direction+'寄り')+'</div><div class="tiny muted">'+rounds.length+'R · '+pts.length+'投 · AIM '+hitAim+' '+hitRate(darts)+'%'+(excluded.length?' · 除外 '+excluded.join(' / '):'')+'</div><div class="aim-stat-grid">'+stat('↑ 上',percent(p=>p.y<-.001))+stat('↓ 下',percent(p=>p.y>.001))+stat('← 左',percent(p=>p.x<-.001))+stat('→ 右',percent(p=>p.x>.001))+'</div></div></div><details class="aim-help"><summary>分析について</summary><p>色の濃さは内外シングル・T・D・BULL別の命中割合を最大エリア基準で表示。セグメント単位の推定であり、実際の着弾座標ではありません。MISSは位置不明として除外します。</p></details>';
}
const EXCLUDED_ROUNDS_KEY='dtl-excluded-rounds-v1';
let excludedRounds=[];try{const v=JSON.parse(localStorage.getItem(EXCLUDED_ROUNDS_KEY));if(Array.isArray(v))excludedRounds=v.filter(x=>typeof x==='string')}catch(_){}
const roundKey=(s,index)=>s.id+':'+index;
function roundEntries(){const entries=[];for(const s of store.sessions.slice().reverse().concat([store.active])){if(!s||!Array.isArray(s.darts))continue;for(let i=0;i+3<=s.darts.length;i+=3){entries.push({key:roundKey(s,i/3),session:s,round:i/3+1,darts:s.darts.slice(i,i+3)})}}return entries}
function renderRoundManager(){const el=$('roundManager');if(!el)return;const entries=roundEntries(),excluded=new Set(excludedRounds),valid=new Set(entries.map(x=>x.key));if(excludedRounds.some(x=>!valid.has(x))){excludedRounds=excludedRounds.filter(x=>valid.has(x));try{localStorage.setItem(EXCLUDED_ROUNDS_KEY,JSON.stringify(excludedRounds))}catch(_){}}
const used=entries.filter(x=>!excluded.has(x.key));$('roundTotal').textContent='記録 '+entries.length+'R ／ 分析対象 '+used.length+'R ／ 除外 '+(entries.length-used.length)+'R';
el.innerHTML=entries.slice().reverse().map(x=>'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid #31414B"><span style="font-size:12px">'+new Date(x.darts[0].timestamp).toLocaleString('ja-JP')+'　R'+x.round+'　'+x.darts.map(d=>label(d.segment)).join(' / ')+'　'+sum(x.darts)+'pt</span><button type="button" data-round-key="'+esc(x.key)+'" aria-pressed="'+excluded.has(x.key)+'">'+(excluded.has(x.key)?'元に戻す':'分析から除外')+'</button></div>').join('')||'<p class="muted">まだ3投そろったラウンドがありません。</p>';
}
function toggleRoundExclusion(key){const item=roundEntries().find(x=>x.key===key);if(!item)return;const was=excludedRounds.includes(key);if(!was&&!confirm('このラウンドを分析から除外しますか？\\n投球履歴は消えず、あとから元に戻せます。'))return;const next=was?excludedRounds.filter(x=>x!==key):excludedRounds.concat(key);try{localStorage.setItem(EXCLUDED_ROUNDS_KEY,JSON.stringify(next));excludedRounds=next;profTouch();renderAnalysis();renderRoundManager();toast(was?'分析対象に戻しました':'分析から除外しました')}catch(_){alert('変更を保存できませんでした')}}
document.addEventListener('click',e=>{const b=e.target.closest('[data-round-key]');if(b)toggleRoundExclusion(b.dataset.roundKey)});
function allRecordedRounds(raw){
 const blocks=[];
 const sessions=store.sessions.slice().reverse();
 /* Only complete 3-dart rounds count as a round (1R/10R/20R/ALL); an unfinished round never shrinks or skews the window. */
 for(const s of sessions)for(let i=0;i<s.darts.length;i+=3){const round=s.darts.slice(i,i+3);if(round.length===3&&!excludedRounds.includes(roundKey(s,i/3)))blocks.push(round)}
 for(let i=0;i<store.active.darts.length;i+=3){const round=store.active.darts.slice(i,i+3);if(round.length===3&&!excludedRounds.includes(roundKey(store.active,i/3)))blocks.push(round)}
 return raw?blocks:blocks.filter(r=>aimOf(r[0])===effectiveAim(blocks));
}
function effectiveAim(blocks){
 const aims=[...new Set(blocks.map(r=>aimOf(r[0])))];
 if(analysisAim&&aims.includes(analysisAim))return analysisAim;
 if(aims.includes(curAim()))return curAim();
 return aims.length?aimOf(blocks[blocks.length-1][0]):curAim();
}
function selectedRounds(){const blocks=allRecordedRounds();return aimPeriod==='all'?blocks:blocks.slice(-Number(aimPeriod))}
function selectedDarts(){return selectedRounds().flat()}
function renderAnalysis(){
 const rawBlocks=allRecordedRounds(true);hitAim=effectiveAim(rawBlocks);
 const rounds=selectedRounds(),ds=rounds.flat(),ss=finished(),prev=previousRounds();
 document.querySelectorAll('[data-aim-period]').forEach(b=>{const active=b.dataset.aimPeriod===aimPeriod;b.classList.toggle('selected',active);b.setAttribute('aria-pressed',String(active))});
 const aimsIn=AIMS.filter(a=>rawBlocks.some(r=>aimOf(r[0])===a));
 $('analysisScope').textContent=rounds.length+'R · '+ds.length+' DARTS'+(hitAim!=='BULL'||aimsIn.length>1?' · AIM '+hitAim:'');
 renderRoundManager();
 $('analysisAim').classList.toggle('hidden',aimsIn.length<2);
 $('analysisAim').innerHTML=aimsIn.length<2?'':'<span class="tiny muted">AIM</span>'+aimsIn.map(a=>'<button type="button" data-aim-sel="'+a+'" class="'+(a===hitAim?'selected':'')+'" aria-pressed="'+(a===hitAim)+'">'+a+'</button>').join('');
 $('metrics').innerHTML=scopeMetrics(ds,ss,prev);
 $('allbull').innerHTML=bullBars(ds);
 $('analysischart').innerHTML=chart(ss);
 $('achievementTotals').innerHTML=achievementTotals();$('personalRecords').innerHTML=personalRecords();
 renderAim();renderAdvanced();renderThrowOrder();renderMore(rounds,ds,prev);renderReportState();localizeAim();
}
const AIM_SKIP='#analysisAim,.card-help,.card-gloss,.help-btn,#achievementTotals,#advancedGoalBody,#advancedBestVsAvg,#advancedConditions,#advancedLog,#analysischart,#reportBody';
function localizeAim(){
 const root=$('analysis'),w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
 while(w.nextNode())nodes.push(w.currentNode);
 for(const n of nodes){if(n.parentElement&&n.parentElement.closest(AIM_SKIP))continue;if(n.__o===undefined)n.__o=n.nodeValue;const v=AT(n.__o);if(n.nodeValue!==v)n.nodeValue=v}
}
function scopeMetrics(ds,ss,prev){
 const best=ss.length?Math.max(...ss.map(s=>sum(s.darts))):null;
 const value=(name,n,detail,key)=>'<div class="panel metric"><div class="label">'+name+'</div>'+helpBtn(key)+'<div class="value">'+n+'</div><div class="detail">'+detail+'</div>'+helpBox(key,true)+'</div>';
 const diff=prev&&ds.length?Math.round((hitRate(ds)-hitRate(prev.flat()))*10)/10:null;
 return value('BULL RATE',ds.length?hitRate(ds)+'%':'—',ds.filter(isHit).length+' / '+ds.length+(diff===null?'':' · '+signed(diff,'pt')),'m-bull')
 +value('BULL HITS',ds.filter(isHit).length,'SELECTED','m-hits')
 +(hitAim==='BULL'?value('INNER BULL',ds.filter(d=>d.segment==='IB').length,'SELECTED','m-inner'):value('AVG / DART',ds.length?(sum(ds)/ds.length).toFixed(1):'—','SELECTED','m-inner'))
 +value('PERSONAL BEST',best??'—','ALL TIME','m-best');
}
function renderAdvanced(){
 const rounds=selectedRounds(),ds=rounds.flat(),pts=ds.map(aimPoint).filter(Boolean),nonbull=ds.filter(d=>aimPoint(d)&&!isHit(d)),np=nonbull.map(aimPoint);
 const directions=['↑','↗','→','↘','↓','↙','←','↖'],counts=Array(8).fill(0);
 for(const p of np){const deg=(Math.atan2(p.y,p.x)*180/Math.PI+450)%360;counts[Math.round(deg/45)%8]++}
 const bar=(label,value,max,extra='')=>advBar(label,value,max,extra);
 $('advancedDirection').innerHTML='<div class="direction-grid">'+counts.map((n,i)=>'<div class="direction-cell"><span>'+directions[i]+'</span><strong>'+(np.length?Math.round(n/np.length*100):0)+'%</strong></div>').join('')+'</div>';
 const median=a=>{a.sort((x,y)=>x-y);return a.length?(a.length%2?a[(a.length-1)/2]:(a[a.length/2-1]+a[a.length/2])/2):0};
 const mx=median(pts.map(p=>p.x)),my=median(pts.map(p=>p.y));
 const radii=pts.map(p=>Math.hypot(p.x-mx,p.y-my)),avg=radii.length?radii.reduce((a,b)=>a+b,0)/radii.length:0;
 const tight=pts.length?Math.round(pts.filter(p=>Math.hypot(p.x-mx,p.y-my)<=.45).length/pts.length*100):0;
 $('advancedConsistency').innerHTML='<div class="advanced-big">'+(pts.length?tight+'%':'—')+'</div><div class="tiny muted">CLUSTER · 0.45R</div>'+bar('SPREAD',Math.min(avg,1.5),1.5,pts.length?avg.toFixed(2):'—');
 const half=Math.floor(rounds.length/2),older=rounds.slice(0,half).flat(),newer=rounds.slice(half).flat(),newRate=newer.length?hitRate(newer):null,oldRate=older.length?hitRate(older):null;
 $('advancedBullTrend').innerHTML='<div class="advanced-big">'+(newRate===null?'—':newRate+'%')+'</div><div class="tiny muted">'+(oldRate===null?'BULL RATE':('PREV '+oldRate+'% · '+(newRate-oldRate>=0?'+':'')+(newRate-oldRate).toFixed(1)+'pt'))+'</div>'+bar('RECENT',newRate??0,100,'');
 const grouped=Array.from({length:8},()=>[]);
 for(const round of rounds){const d=round[0];if(d&&Number.isInteger(d.roundIndex)&&d.roundIndex>=1&&d.roundIndex<=8)grouped[d.roundIndex-1].push(round)}
 $('advancedRounds').innerHTML=grouped.map((arr,i)=>{const darts=arr.flat(),r=darts.length?hitRate(darts):0;return bar('R'+(i+1),r,100,darts.length?r+'%':'—')}).join('');
 let streak=0,best=0;for(const d of ds){streak=isHit(d)?streak+1:0;best=Math.max(best,streak)}
 $('advancedStreak').innerHTML='<div class="advanced-big">'+best+'</div><div class="tiny muted">CONSECUTIVE BULLS</div>';
}
document.addEventListener('click',e=>{const sb=e.target.closest('[data-aim-sel]');if(sb){analysisAim=sb.dataset.aimSel;renderAnalysis();return}const b=e.target.closest('[data-aim-period]');if(b){aimPeriod=b.dataset.aimPeriod;renderAnalysis()}});
/* Personal bests: completed COUNT-UP games only, all-time. */
function personalRecords(){
 const games=finished().filter(s=>Array.isArray(s.darts)&&s.darts.length===24);
 const rows=games.map(s=>{
  const ds=s.darts,rounds=Array.from({length:8},(_,i)=>ds.slice(i*3,i*3+3));
  let run=0,longest=0;
  for(const d of ds){run=isBull(d)?run+1:0;longest=Math.max(longest,run)}
  return {score:sum(ds),bulls:ds.filter(isBull).length,inner:ds.filter(d=>d.segment==='IB').length,
   round:Math.max(...rounds.map(sum)),streak:longest,hats:rounds.filter(r=>r.every(isBull)).length,
   ton80:rounds.filter(r=>r.every(d=>d.segment==='T20')).length};
 });
 const best=k=>rows.length?Math.max(...rows.map(r=>r[k])):null;
 const items=[
  ['HIGH SCORE',best('score'),'PTS'],
  ['BULL / GAME',best('bulls'),'HITS'],
  ['BULL RATE',best('bulls')===null?null:Math.round(best('bulls')/24*1000)/10,'%'],
  ['INNER / GAME',best('inner'),'HITS'],
  ['BEST ROUND',best('round'),'PTS'],
  ['BULL STREAK',best('streak'),'DARTS'],
  ['HAT / GAME',best('hats'),'TIMES'],
  ['TON 80 / GAME',best('ton80'),'TIMES']
 ];
 return items.map(([label,value,unit])=>'<div class="record-tile"><span>'+label+'</span><strong>'+(value===null?'—':value)+'</strong><small>'+unit+'</small></div>').join('');
}
function achievementTotals(){
 const games=finished(),darts=games.flatMap(s=>s.darts),rounds=games.flatMap(s=>Array.from({length:8},(_,i)=>s.darts.slice(i*3,i*3+3))).filter(a=>a.length===3);
 const bulls=darts.filter(isBull).length,inner=darts.filter(d=>d.segment==='IB').length,hats=rounds.filter(a=>a.every(isBull)).length,ton80=rounds.filter(a=>a.every(d=>d.segment==='T20')).length,high=rounds.filter(a=>{const n=sum(a);return n>=151&&n<180}).length;
 const items=[['BULL',bulls],['INNER BULL',inner],['HAT TRICK',hats],['TON 80',ton80],['HIGH TON',high]];
 return items.map(([label,n])=>'<div class="achievement-tile"><span>'+label+'</span><strong>'+n+'</strong></div>').join('');
}
/* ===== Analysis helpers (v0.5.28) =====
   All figures are derived from recorded segments only (not measured x/y), selected period unless marked ALL TIME. */
const REF_MIN=20; /* fewer throws than this are shown as REF (reference only) */
const mean=a=>a.reduce((x,y)=>x+y,0)/a.length;
const medianOf=a=>{const s=a.slice().sort((x,y)=>x-y);return s.length?(s.length%2?s[(s.length-1)/2]:(s[s.length/2-1]+s[s.length/2])/2):0};
const wilson=(k,n)=>{if(!n)return null;const z=1.96,p=k/n,d=1+z*z/n,c=p+z*z/(2*n),m=z*Math.sqrt(p*(1-p)/n+z*z/(4*n*n));return [Math.max(0,Math.round((c-m)/d*100)),Math.min(100,Math.round((c+m)/d*100))]};
const arrowOf=(x,y)=>{if(Math.hypot(x,y)<.08)return '●';const deg=(Math.atan2(y,x)*180/Math.PI+450)%360;return ['↑','↗','→','↘','↓','↙','←','↖'][Math.round(deg/45)%8]};
const driftWord=(x,y)=>{const w=(Math.abs(y)<.08?'':y>0?'下':'上')+(Math.abs(x)<.08?'':x>0?'右':'左');return w?w+'寄り':'中央'};
const badge=n=>n>0&&n<REF_MIN?'<em title="'+REF_MIN+'投未満は参考値">REF</em>':'';
const signed=(v,unit='')=>(v>0?'▲ +'+v:v<0?'▼ '+v:'＝ 0')+unit;
const advBar=(label,value,max,extra='',cls='')=>'<div class="advanced-bar '+cls+'"><span>'+label+'</span><div class="track"><div class="fill" style="width:'+(max?Math.min(100,value/max*100):0).toFixed(1)+'%"></div></div><strong>'+extra+'</strong></div>';
const statCard=(label,big,lines=[],ref='')=>'<div class="throw-order-card"><div class="throw-order-label">'+label+ref+'</div><strong>'+big+'</strong>'+lines.map(t=>'<span>'+t+'</span>').join('')+'</div>';
const dayKey=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
function previousRounds(){
 if(aimPeriod==='all')return null;
 const N=Number(aimPeriod),b=allRecordedRounds(),prev=b.slice(Math.max(0,b.length-2*N),Math.max(0,b.length-N));
 return prev.length===N?prev:null;
}
function orderStats(ds){
 return [1,2,3].map(i=>{const a=ds.filter(d=>d.dartIndex===i),b=a.filter(isHit).length;
  return {i,n:a.length,bulls:b,ib:a.filter(d=>d.segment==='IB').length,rate:a.length?Math.round(b/a.length*100):null,avg:a.length?Math.round(sum(a)/a.length*10)/10:null,ci:wilson(b,a.length)}});
}
function orderVerdict(data){
 const valid=data.filter(x=>x.n);
 if(valid.length<2)return {text:'—',best:null,weak:null,tag:''};
 const best=valid.reduce((a,b)=>b.rate>a.rate?b:a),weak=valid.reduce((a,b)=>b.rate<a.rate?b:a),anyRef=valid.some(x=>x.n<REF_MIN);
 if(best.rate===weak.rate)return {text:'EVEN',best,weak,tag:anyRef?'REF':''};
 return {text:'BEST · DART '+best.i+'　/　LOW · DART '+weak.i,best,weak,tag:anyRef?'REF':best.ci[0]>weak.ci[1]?'CLEAR DIFF':'NO CLEAR DIFF'};
}
function renderThrowOrder(){
 const data=orderStats(selectedDarts()),v=orderVerdict(data);
 const cards=data.map(d=>statCard('DART '+d.i,d.rate===null?'—':d.rate+'%',['BULL '+d.bulls+'/'+d.n,'RANGE '+(d.ci?d.ci[0]+'–'+d.ci[1]+'%':'—'),hitAim==='BULL'?'IB '+d.ib+'/'+d.bulls:'','AVG '+(d.avg===null?'—':d.avg)].filter(Boolean),badge(d.n))).join('');
 $('advancedThrowOrder').innerHTML='<div class="throw-order-grid">'+cards+'</div><div class="throw-order-verdict">'+v.text+(v.tag?'　·　'+v.tag:'')+'</div><div class="tiny muted">RANGE = 95% 信頼区間'+(hitAim==='BULL'?' · IB = BULLのうちINNER':'')+'</div>';
}
function dartStats(ds){
 return [1,2,3].map(i=>{
  const a=ds.filter(d=>d.dartIndex===i),pts=a.map(aimPoint).filter(Boolean),mx=medianOf(pts.map(p=>p.x)),my=medianOf(pts.map(p=>p.y));
  return {i,n:a.length,np:pts.length,mx,my,off:Math.hypot(mx,my),spread:pts.length?mean(pts.map(p=>Math.hypot(p.x-mx,p.y-my))):null};
 });
}
function renderDrift(){
 const st=dartStats(selectedDarts());
 const cards=st.map(s=>statCard('DART '+s.i,s.np?arrowOf(s.mx,s.my):'—',[s.np?driftWord(s.mx,s.my):'—','OFFSET '+(s.np?s.off.toFixed(2):'—'),'SPREAD '+(s.spread===null?'—':s.spread.toFixed(2))],badge(s.np))).join('');
 $('advancedDrift').innerHTML='<div class="throw-order-grid drift">'+cards+'</div><div class="tiny muted">セグメント推定 · MISS・ZONE不明は除外 · n '+st.map(s=>s.np).join(' / ')+'</div>';
}
function afterStats(rounds){
 const g={bull:[0,0],miss:[0,0],other:[0,0]};
 for(const r of rounds)for(let k=1;k<3;k++){const p=r[k-1],c=r[k];if(!p||!c)continue;const key=isHit(p)?'bull':p.segment==='MISS'?'miss':'other';g[key][1]++;if(isHit(c))g[key][0]++}
 return [['AFTER BULL','bull'],['AFTER MISS','miss'],['AFTER OTHER','other']].map(([label,key])=>({label,k:g[key][0],n:g[key][1],rate:g[key][1]?Math.round(g[key][0]/g[key][1]*100):null,ci:wilson(g[key][0],g[key][1])}));
}
function renderAfter(rounds){
 const st=afterStats(rounds);
 const cards=st.map(s=>statCard(s.label,s.rate===null?'—':s.rate+'%',['BULL '+s.k+'/'+s.n,'RANGE '+(s.ci?s.ci[0]+'–'+s.ci[1]+'%':'—')],badge(s.n))).join('');
 const b=st[0],m=st[1],gap=b.n&&m.n?b.rate-m.rate:null;
 $('advancedAfter').innerHTML='<div class="throw-order-grid">'+cards+'</div><div class="throw-order-verdict">'+(gap===null?'—':'BULL − MISS　'+(gap>0?'+':'')+gap+'pt'+(st.some(s=>s.n&&s.n<REF_MIN)?'　·　REF':''))+'</div><div class="tiny muted">同じラウンド内の次の1投 · OTHER = ブル以外の命中</div>';
 return st;
}
function roundStats(rounds){
 const by=Array.from({length:8},()=>[]);
 for(const r of rounds){const i=r[0]&&r[0].roundIndex;if(Number.isInteger(i)&&i>=1&&i<=8)by[i-1].push(sum(r))}
 const avg=a=>a.length?mean(a):null,first=by.slice(0,4).flat(),second=by.slice(4).flat(),all=by.flat();
 return {by,avgs:by.map(avg),first:{n:first.length,avg:avg(first)},second:{n:second.length,avg:avg(second)},all,avg:avg(all)};
}
function renderRoundScore(rs,prev){
 const max=Math.max(1,...rs.avgs.filter(x=>x!==null));
 const rows=rs.avgs.map((a,i)=>advBar('R'+(i+1),a||0,max,a===null?'—':Math.round(a)+' · '+rs.by[i].length+'R','wide'+(rs.by[i].length&&rs.by[i].length<3?' dim':''))).join('');
 const prevAvg=prev&&prev.length?mean(prev.map(sum)):null,d=rs.avg!==null&&prevAvg!==null?Math.round((rs.avg-prevAvg)*10)/10:null;
 const halves=rs.first.avg!==null&&rs.second.avg!==null?'R1–4 '+Math.round(rs.first.avg)+'　/　R5–8 '+Math.round(rs.second.avg)+'　('+(rs.second.avg-rs.first.avg>=0?'+':'')+Math.round(rs.second.avg-rs.first.avg)+')'+(Math.min(rs.first.n,rs.second.n)<12?'　·　REF':''):'—';
 const buckets=[['0–29',0,29],['30–59',30,59],['60–99',60,99],['100–149',100,149],['150+',150,180]].map(([l,lo,hi])=>[l,rs.all.filter(x=>x>=lo&&x<=hi).length]);
 const top=Math.max(1,...buckets.map(b=>b[1]));
 $('advancedRoundScore').innerHTML='<div class="advanced-big">'+(rs.avg===null?'—':rs.avg.toFixed(1))+'</div><div class="tiny muted">AVG / ROUND'+(d===null?'':' · '+signed(d)+' VS PREV')+'</div>'+rows+'<div class="advanced-sub">HALF</div><div class="throw-order-verdict">'+halves+'</div><div class="advanced-sub">DISTRIBUTION</div>'+buckets.map(([l,n])=>advBar(l,n,top,n+' · '+(rs.all.length?Math.round(n/rs.all.length*100):0)+'%','wide')).join('')+'<div class="tiny muted">薄い行 = 3R未満（参考）</div>';
}
function renderBreakdown(ds){
 const cats=[['IN BULL',d=>d.segment==='IB'],['OUT BULL',d=>d.segment==='OB'],['TRIPLE',d=>d.segment[0]==='T'],['DOUBLE',d=>d.segment[0]==='D'],['SINGLE',d=>d.segment[0]==='S'],['MISS',d=>d.segment==='MISS']];
 const total=sum(ds);
 $('advancedBreakdown').innerHTML='<div class="tiny muted">TOTAL '+total+' pt · '+ds.length+'投</div>'+cats.map(([l,f])=>{const a=ds.filter(f),p=sum(a);return advBar(l,p,total,(total?Math.round(p/total*100):0)+'% · '+a.length+'投','wide')}).join('');
}
function paceStats(rounds){
 const iv=[];
 for(const r of rounds)for(let k=1;k<3;k++){const dt=(Date.parse(r[k].timestamp)-Date.parse(r[k-1].timestamp))/1000;if(dt>0&&dt<=120)iv.push({dt,bull:isHit(r[k])})}
 if(iv.length<6)return null;
 const med=medianOf(iv.map(x=>x.dt)),f=a=>({n:a.length,k:a.filter(x=>x.bull).length});
 return {med,fast:f(iv.filter(x=>x.dt<=med)),slow:f(iv.filter(x=>x.dt>med))};
}
function renderPace(rounds){
 const p=paceStats(rounds);
 if(!p){$('advancedPace').innerHTML='<div class="advanced-big">—</div><div class="tiny muted">投球間隔が6区間以上たまると表示</div>';return}
 const rt=x=>x.n?Math.round(x.k/x.n*100)+'%':'—';
 $('advancedPace').innerHTML='<div class="throw-order-grid">'+statCard('MEDIAN',p.med.toFixed(1)+'s',['DART間隔'])+statCard('FAST',rt(p.fast),['BULL '+p.fast.k+'/'+p.fast.n,'≦ '+p.med.toFixed(1)+'s'],badge(p.fast.n))+statCard('SLOW',rt(p.slow),['BULL '+p.slow.k+'/'+p.slow.n,'> '+p.med.toFixed(1)+'s'],badge(p.slow.n))+'</div><div class="tiny muted">同じラウンド内、前の投球からの入力間隔 · 120秒超は除外</div>';
}
function renderLog(){
 const byDay=new Map();
 for(const d of all().concat(store.active.darts)){if(!d.timestamp||isNaN(Date.parse(d.timestamp)))continue;const k=dayKey(d.timestamp);byDay.set(k,(byDay.get(k)||0)+1)}
 const today=new Date(),cells=[];
 for(let i=34;i>=0;i--){const t=new Date(today.getFullYear(),today.getMonth(),today.getDate()-i),k=dayKey(t),n=byDay.get(k)||0;cells.push({k,n,t,today:i===0})}
 const level=n=>n===0?0:n<24?1:n<72?2:n<144?3:4;
 const days28=cells.slice(-28).filter(c=>c.n>0).length;
 let streak=0,i=cells.length-1;if(!cells[i].n)i--;while(i>=0&&cells[i].n>0){streak++;i--}
 const sinceMon=(today.getDay()+6)%7,week=cells.slice(-(sinceMon+1)).reduce((a,c)=>a+c.n,0);
 $('advancedLog').innerHTML='<div class="throw-order-grid">'+statCard('DAYS',days28+'/28',['LAST 28D'])+statCard('STREAK',streak,['DAYS'])+statCard('THIS WEEK',week,['DARTS'])+'</div><div class="practice-grid">'+cells.map(c=>'<div class="practice-cell l'+level(c.n)+(c.today?' today':'')+'" title="'+(c.t.getMonth()+1)+'/'+c.t.getDate()+'：'+c.n+'投"></div>').join('')+'</div><div class="tiny muted">直近35日 · 色の濃さ = 投数</div>';
}
function renderConditions(){
 const gs=finished().slice().sort((a,b)=>a.startedAt.localeCompare(b.startedAt));
 if(!gs.length){$('advancedConditions').innerHTML='<div class="advanced-big">—</div>';return}
 const seen={},rows=gs.map(s=>{const k=dayKey(s.startedAt);seen[k]=(seen[k]||0)+1;return {score:sum(s.darts),h:new Date(s.startedAt).getHours(),nth:seen[k]}});
 const group=(title,defs)=>{
  const stats=defs.map(([l,f])=>{const a=rows.filter(f);return {l,g:a.length,avg:a.length?mean(a.map(x=>x.score)):null}}),max=Math.max(1,...stats.map(s=>s.avg||0));
  return '<div class="advanced-sub">'+title+'</div>'+stats.map(s=>advBar(s.l,s.avg||0,max,s.avg===null?'—':Math.round(s.avg)+' · '+s.g+'G','wide'+(s.g&&s.g<3?' dim':''))).join('');
 };
 $('advancedConditions').innerHTML=group('TIME OF DAY',[['MORNING',x=>x.h>=5&&x.h<11],['DAY',x=>x.h>=11&&x.h<17],['EVENING',x=>x.h>=17&&x.h<22],['NIGHT',x=>x.h>=22||x.h<5]])+group('GAME OF THE DAY',[['1ST',x=>x.nth===1],['2ND',x=>x.nth===2],['3RD+',x=>x.nth>=3]])+'<div class="tiny muted">MORNING 5–11 · DAY 11–17 · EVENING 17–22 · NIGHT 22–5 / 平均スコア · G=ゲーム数 · 薄い行は3G未満(参考)</div>';
}
function renderGoal(){
 const input=$('goalInput');if(input&&document.activeElement!==input)input.value=store.goalScore||'';
 const gs=finished().slice().sort((a,b)=>a.startedAt.localeCompare(b.startedAt)),sc=gs.map(s=>sum(s.darts)),body=$('advancedGoalBody');
 if(!sc.length){body.innerHTML='<div class="advanced-big">—</div>';return}
 const last=sc.slice(-10),avg=mean(last),sd=Math.sqrt(mean(last.map(x=>(x-avg)*(x-avg)))),latest=sc[sc.length-1],rank=sc.filter(x=>x>latest).length+1,top=Math.ceil(rank/sc.length*100);
 const ref=last.length<5?'<em title="5ゲーム未満は参考値">REF</em>':'';
 let goal='';
 if(store.goalScore>0){const gap=Math.round(store.goalScore-avg);goal=advBar('GOAL',avg,store.goalScore,Math.round(avg/store.goalScore*100)+'%','wide')+'<div class="throw-order-verdict">'+(gap>0?'GAP '+gap+' pt':'REACHED +'+(-gap)+' pt')+'</div>'}
 body.innerHTML='<div class="throw-order-grid">'+statCard('AVG',Math.round(avg),['LAST '+last.length+'G'],ref)+statCard('SD',Math.round(sd),['ばらつき'])+statCard('BEST',Math.max(...last),['MIN '+Math.min(...last),'LAST '+last.length+'G'])+'</div><div class="tiny muted">LATEST '+latest+' · TOP '+top+'% of '+sc.length+'G</div>'+goal;
}
function renderBestVsAvg(){
 const gs=finished(),root=$('advancedBestVsAvg');
 if(gs.length<2){root.innerHTML='<div class="advanced-big">—</div><div class="tiny muted">2ゲーム以上で表示</div>';return}
 const per=s=>Array.from({length:8},(_,i)=>sum(s.darts.slice(i*3,i*3+3))),all=gs.map(per),best=gs.reduce((a,b)=>sum(b.darts)>sum(a.darts)?b:a),bestR=per(best);
 const avgR=bestR.map((_,i)=>mean(all.map(r=>r[i]))),max=Math.max(1,...avgR,...bestR);
 root.innerHTML='<div class="tiny muted">BEST '+sum(best.darts)+' vs AVG '+Math.round(mean(gs.map(s=>sum(s.darts))))+' · '+gs.length+'G</div><div class="tiny muted">棒 = 平均 / 黄線 = ベスト</div>'+bestR.map((b,i)=>{const diff=Math.round(b-avgR[i]);return '<div class="advanced-bar wide"><span>R'+(i+1)+'</span><div class="track has-mark"><div class="fill" style="width:'+(avgR[i]/max*100).toFixed(1)+'%"></div><i class="mark" style="left:'+(b/max*100).toFixed(1)+'%"></i></div><strong>'+(diff>=0?'+':'')+diff+'</strong></div>'}).join('');
}
/* Measured facts first; interpretations are labelled as possibilities (aim target is not recorded). */
function renderInsight(ctx){
 const items=[],{order,verdict:v,drift,after,rs}=ctx;
 if(v.best&&v.weak&&v.best.rate-v.weak.rate>=10)items.push({fact:'BULL  DART '+v.best.i+' '+v.best.rate+'%　/　DART '+v.weak.i+' '+v.weak.rate+'%',ref:v.tag==='REF',hyp:'DART '+v.weak.i+' の精度が下がっている可能性。サンプルが少ないうちは偶然の幅があります。',tryIt:'DART '+v.weak.i+' の前に構えを確認し、20R分ためて再確認。'});
 const dr=drift.filter(s=>s.np>=10&&s.off>=.2).sort((a,b)=>b.off-a.off)[0];
 if(dr)items.push({fact:'DART '+dr.i+'  '+driftWord(dr.mx,dr.my)+'  OFFSET '+dr.off.toFixed(2),ref:dr.np<REF_MIN,hyp:'その方向に着弾が偏っている可能性。狙いはブルとして見ています。',tryIt:'DART '+dr.i+' だけ、次の10投で反対方向を少し意識して変化を見る。'});
 const [ab,am]=after;
 if(ab.n>=10&&am.n>=10&&Math.abs(ab.rate-am.rate)>=15){const lower=am.rate<ab.rate;items.push({fact:'AFTER BULL '+ab.rate+'%　/　AFTER MISS '+am.rate+'%',ref:ab.n<REF_MIN||am.n<REF_MIN,hyp:lower?'外した直後に崩れやすい可能性。':'外した後のほうが集中している可能性。',tryIt:lower?'外した次の1投の前に一拍置く。':''})}
 if(rs.first.n>=6&&rs.second.n>=6&&Math.abs(rs.first.avg-rs.second.avg)>=8){const fade=rs.first.avg>rs.second.avg;items.push({fact:'R1–4 '+Math.round(rs.first.avg)+'　/　R5–8 '+Math.round(rs.second.avg),ref:Math.min(rs.first.n,rs.second.n)<12,hyp:fade?'後半に落ちやすい可能性。':'序盤が立ち上がりきっていない可能性。',tryIt:fade?'R4とR5の間に一呼吸入れて比較。':'R1の前に数投の素振りを入れて比較。'})}
 const top=items.slice(0,3),panel=$('insightPanel'),fp=items.find(x=>x.tryIt);
 $('focusPanel').classList.toggle('hidden',!fp);
 $('focusBody').innerHTML=fp?'<div class="focus-line">'+fp.tryIt+'</div><div class="focus-fact tiny muted">'+fp.fact+(fp.ref?' <em title="参考値">REF</em>':'')+'</div>':'';
 panel.classList.toggle('hidden',!top.length);
 $('insightBody').innerHTML=top.map(x=>'<div class="insight-fact"><span class="insight-tag">FACT</span><span>'+x.fact+(x.ref?' <em title="参考値">REF</em>':'')+'</span></div>').join('')+(top.length?'<details class="insight-next"><summary>NEXT</summary>'+top.map(x=>'<p><b>HYPOTHESIS</b> '+x.hyp+(x.tryIt?'<br><b>TRY</b> '+x.tryIt:'')+'</p>').join('')+'</details>':'');
}
function renderMore(rounds,ds,prev){
 const order=orderStats(ds),verdict=orderVerdict(order),drift=dartStats(ds),rs=roundStats(rounds);
 renderDrift();
 const after=renderAfter(rounds);
 renderRoundScore(rs,prev);renderBreakdown(ds);renderPace(rounds);
 renderGoal();renderBestVsAvg();renderConditions();renderLog();
 renderInsight({order,verdict,drift,after,rs});
}
document.addEventListener('change',e=>{if(e.target&&e.target.id==='goalInput'){const v=Math.round(Number(e.target.value));store.goalScore=v>0&&v<=1440?v:null;persist();profTouch();renderAnalysis()}});
/* ===== Coach report (v0.5.30): rule-based text from the selected period; not an AI model. ===== */
function buildReport(rounds,ds,prev){
 const R=rounds.length,N=ds.length,label=aimPeriod==='all'?'ALL':aimPeriod+'R',head=label+' · '+(aimPeriod!=='all'&&R===Number(aimPeriod)?'':R+'R / ')+N+'投';
 const order=orderStats(ds),v=orderVerdict(order),drift=dartStats(ds),after=afterStats(rounds),rs=roundStats(rounds);
 const anyRef=order.some(x=>x.n>0&&x.n<REF_MIN);
 const conf={k:'CONFIDENCE',label:'信頼度',lines:['データ量：'+N+'投。'+(N===0?'':anyRef?'投球順ごとに20投未満の項目があり、参考値として読んでください（REF）。':'投球順ごとに20投以上あります。'),'着弾位置はセグメントからの推定で、狙いはブル前提で見ています。','この文章は数値をもとにしたルール式の自動生成で、AIモデルによる判断ではありません。']};
 if(R<3)return {head,sections:[{k:'SUMMARY',label:'総評',lines:['まだデータが少なく（'+R+'R / '+N+'投）、傾向は読み取れません。','3ラウンド（9投）以上、できれば1ゲーム（24投）を完走すると、投球順の比較が見られます。']},conf]};
 const bulls=ds.filter(isHit).length,diff=prev?Math.round((hitRate(ds)-hitRate(prev.flat()))*10)/10:null;
 const trend=diff===null?'比較できる直前の期間はまだありません。':Math.abs(diff)<3?'直前の同じ長さの期間とほぼ同じです（'+(diff>=0?'+':'')+diff+'pt）。':diff>0?'直前の同じ長さの期間より '+diff+'pt 上がっています。':'直前の同じ長さの期間より '+(-diff)+'pt 下がっています。';
 const scores=finished().slice().sort((a,b)=>a.startedAt.localeCompare(b.startedAt)).map(s=>sum(s.darts)),latest=scores[scores.length-1];
 const summary=['ブル率は '+hitRate(ds)+'%（'+bulls+'/'+N+'投）。'+trend,'1ラウンドの平均は '+Math.round(mean(rounds.map(sum)))+' 点。'+(scores.length>=3?'直近のゲーム '+latest+' 点は、全 '+scores.length+' ゲーム中で上位 '+Math.ceil((scores.filter(x=>x>latest).length+1)/scores.length*100)+'% です。':'')];
 const strengths=[],focus=[],drills=[];
 const best=v.best,weak=v.weak,gap=best&&weak?best.rate-weak.rate:0;
 if(gap>=10)strengths.push('DART '+best.i+' のブル率が最も高く '+best.rate+'% です（DART '+weak.i+' は '+weak.rate+'%）。'+(v.tag==='CLEAR DIFF'?'':'差はまだ参考値です。'));
 if(diff!==null&&diff>=3)strengths.push('ブル率が直前の期間より '+diff+'pt 上がっています。');
 const hats=rounds.filter(r=>r.every(isHit)).length,tons=rounds.filter(r=>sum(r)>=100).length;
 if(hats)strengths.push('3投すべてブルのラウンド（HAT TRICK）が '+hats+' 回あります。');
 else if(tons)strengths.push('100点以上のラウンドが '+tons+' 回あります。');
 const pts=ds.map(aimPoint).filter(Boolean);
 if(pts.length>=20){const mx=medianOf(pts.map(p=>p.x)),my=medianOf(pts.map(p=>p.y)),tight=Math.round(pts.filter(p=>Math.hypot(p.x-mx,p.y-my)<=.45).length/pts.length*100);if(tight>=50)strengths.push('着弾のまとまりが良好です（中央値から近い範囲に '+tight+'%）。')}
 const [ab,am]=after;
 if(ab.n>=10&&am.n>=10&&am.rate>=ab.rate)strengths.push('外した直後のブル率（'+am.rate+'%）が、ブル直後（'+ab.rate+'%）と同程度以上で、崩れにくい傾向です。');
 if(gap>=10){const clear=v.tag==='CLEAR DIFF';focus.push('DART '+weak.i+' のブル率が低めです（'+weak.rate+'%、DART '+best.i+' は '+best.rate+'%）。'+(clear?'差は偶然の幅を超えています。':'差は偶然の幅に収まる可能性があります。')+'この投目で精度が下がっているのかもしれません。');drills.push('DART '+weak.i+' の前に構えと立ち位置を確認し、10ラウンド分を同じ条件で比べる。')}
 const dr=drift.filter(s=>s.np>=10&&s.off>=.2).sort((a,b)=>b.off-a.off)[0];
 if(dr){focus.push('DART '+dr.i+' は '+driftWord(dr.mx,dr.my)+' に着弾が偏っています（OFFSET '+dr.off.toFixed(2)+'）。狙いはブル前提です。');drills.push('DART '+dr.i+' だけ、10投のあいだ反対方向を少し意識して変化を見る。')}
 if(ab.n>=10&&am.n>=10&&am.rate<=ab.rate-15){focus.push('外した直後のブル率が低めです（AFTER MISS '+am.rate+'%、AFTER BULL '+ab.rate+'%）。外した後に力みやすいのかもしれません。');drills.push('外した次の1投の前に、一拍置いてから構える。')}
 if(rs.first.n>=6&&rs.second.n>=6){const d=rs.first.avg-rs.second.avg;
  if(d>=8){focus.push('後半が落ちています（R1–4 平均 '+Math.round(rs.first.avg)+'、R5–8 平均 '+Math.round(rs.second.avg)+'）。集中や体力が切れているのかもしれません。');drills.push('R4とR5のあいだに水分補給や深呼吸を入れて、後半を比べる。')}
  else if(d<=-8){focus.push('序盤が低めです（R1–4 平均 '+Math.round(rs.first.avg)+'、R5–8 平均 '+Math.round(rs.second.avg)+'）。立ち上がりに時間がかかっているのかもしれません。');drills.push('1ゲーム目の前に数投の素振りを入れて、R1–4 を比べる。')}}
 const miss=ds.filter(d=>d.segment==='MISS').length;
 if(N>=12&&miss/N>=.15){focus.push('MISS が '+miss+' 投あります（'+Math.round(miss/N*100)+'%）。場外やバウンスアウト、入力の取りこぼしが混ざっているかもしれません。');drills.push('MISS になった理由を数ゲームだけ思い出してメモする。')}
 if(!strengths.length)strengths.push('際立った強みは、まだデータから見つかっていません。');
 if(!focus.length){focus.push('大きな偏りや落ち込みは見つかっていません。');drills.push('同じ条件で投げ続けて、データをためてから見直す。')}
 if(anyRef&&drills.length<3)drills.push('20ラウンド（60投）以上ためると、REF が外れて比較しやすくなります。');
 const rep=a=>a.map(AT);
 return {head,sections:[{k:'SUMMARY',label:'総評',lines:rep(summary.filter(Boolean))},{k:'STRENGTHS',label:'強み',lines:rep(strengths.slice(0,3))},{k:'FOCUS',label:'課題',lines:rep(focus.slice(0,3))},{k:'NEXT DRILL',label:'次の練習',lines:rep(drills.slice(0,3))},conf]};
}
let reportOn=false,reportTimer=null,lastReport=null;
function showReport(animate){
 if(reportTimer){clearInterval(reportTimer);reportTimer=null}
 const rounds=selectedRounds(),ds=rounds.flat(),rep=buildReport(rounds,ds,previousRounds()),root=$('reportBody'),items=[];
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
 $('reportBody').classList.toggle('hidden',!reportOn);$('reportCopy').classList.toggle('hidden',!reportOn);
 $('reportBtn').textContent=reportOn?'REGENERATE':'GENERATE REPORT';
 if(reportOn)showReport(false);else{if(reportTimer){clearInterval(reportTimer);reportTimer=null}$('reportStatus').textContent=''}
}
$('reportBtn').onclick=()=>{reportOn=true;$('reportStatus').textContent='';$('reportBody').classList.remove('hidden');$('reportCopy').classList.remove('hidden');$('reportBtn').textContent='REGENERATE';showReport(true)};
$('reportCopy').onclick=async()=>{
 if(!lastReport)return;
 const text=[lastReport.head].concat(lastReport.sections.map(s=>'['+s.k+' '+s.label+']\n'+s.lines.map(l=>'・'+l).join('\n'))).join('\n\n');
 try{await navigator.clipboard.writeText(text);$('reportStatus').textContent='コピーしました'}catch(e){$('reportStatus').textContent='コピーできませんでした。文章を長押しして選択してください'}
};
/* ===== Per-card help (v0.5.31): a "?" in each card header opens a short note for that card only. ===== */
const HELP={
 period:['どの範囲の投げ方を分析するかを選びます。','10R＝直近10ラウンド（30投）。1Rは直近の1ラウンド、ALLはすべて。「全期間」と書かれたカード以外は、この選択に合わせて変わります。','途中のラウンド（3投そろっていない）は数えません。'],
 'm-bull':['投げた中で、ブルに入った割合です。','数字が大きいほど入っています。▲▼は、直前の同じ長さの期間との差です。','ALLでは差は出ません。'],
 'm-hits':['ブル（外側・中心どちらも）に入った回数です。','回数が増えるほど、安定して狙えています。','投数が少ない時は、偶然で上下します。'],
 'm-inner':['中心（INNER BULL・50点）に入った回数です。','ブルの中でも、より中心に近く入れられているかが分かります。狙いがブル以外のときは、1投の平均点を表示します。','投数が少ない時は、偶然で上下します。'],
 'm-best':['完走したゲームの最高得点です。','自己ベストの目安として見ます。','全期間の数字で、途中終了は含みません。'],
 focus:['今日、いちばん先に意識する1点です。','数字から選んだ「試すこと」を1つ出します。下の INSIGHT の NEXT と同じ内容です。','可能性にもとづく提案で、断定ではありません。投数が少ないうちは偶然のこともあります。'],
 insight:['今の期間で、数字から言えることを最大3つ並べます。','FACT は確認できた事実です。NEXT を開くと、考えられる原因と試すことが出ます。','NEXT は断定ではなく可能性です。データが少ないうちは偶然のこともあります。'],
 aim:['どこに多く入っているかを、ボードの色の濃さで見ます。','明るいほど多く入った場所です。黄色い丸は、入った場所の中央値の目安です。','実際の着弾位置ではなく、入ったセグメントからの推定です。MISSと内外が不明な記録は除き、件数を表示します。'],
 allbull:['1投目・2投目・3投目のうち、どれが入りやすいかです。','数字はブル率。括弧の中は 入った数/投数 です。','投数が少ないと差は参考です。'],
 trend:['ゲームごとの得点の流れです。','黄色が各ゲームの得点、水色が直近10ゲームの平均です。水色が右上がりなら、上達の傾向です。','期間の選択には連動しません。直近20ゲームまでを表示します。'],
 achievements:['これまでの記録の累計です。','HAT TRICK＝3投ともブル、TON 80＝3投ともT20、HIGH TON＝1ラウンド151〜179点の回数です。','完走したゲームだけを数えます（全期間）。'],
 report:['今の期間の数字を、文章にまとめます。','ボタンを押すと表示されます。期間を変えると書き換わります。','ルールによる自動生成で、AIモデルではありません。'],
 throw:['何投目が一番入っているかを比べます。','大きい数字がブル率。RANGE は95%の幅で、幅が重なる間は差が偶然かもしれません。CLEAR DIFF は幅が重ならず、差が出ている目安です。','IB＝ブルのうち中心の数、AVG＝1投の平均点です。'],
 drift:['投球順ごとに、どちらへ偏っているかを見ます。','矢印は向き、OFFSET は中心からのズレ（0＝中心、1＝ボードの端）、SPREAD は散らばりです。SPREAD が小さいほどまとまっています。','狙いは設定した狙い（初めはブル）から見たズレです。'],
 direction:['ブル以外に入った時、どの向きに多いかです。','割合が大きい向きほど、そちらへ外れやすい目安です。','狙いから見た向きです（狙いは設定で変更できます）。'],
 consistency:['どれだけ同じ場所にまとまっているかです。','CLUSTER は中央値の近くに入った割合で、高いほどまとまっています。SPREAD は小さいほど安定です。','MISSと内外が不明な記録は除きます。'],
 after:['ブルや外れた直後の1投が、どうなるかです。','ブルの後、外れた後、それぞれの次の1投のブル率を比べます。外れた後に下がるなら、切り替えが課題かもしれません。','同じラウンド内の流れだけを見ます。'],
 bulltrend:['期間の前半と後半で、ブル率が変わったかです。','大きい数字が後半、PREV が前半です。後半が高ければ、調子が上がっています。','期間が短いと偶然で動きます。'],
 rounds:['何ラウンド目に入りやすいかです。','R1〜R8 のブル率。高いラウンドが得意、低いラウンドは崩れやすい目安です。','ラウンドごとの投数が少ないと参考です。'],
 roundscore:['ラウンドごとの平均点です。','HALF は前半（R1–4）と後半（R5–8）の比較、DISTRIBUTION は得点の分布です。','薄い行は3ラウンド未満で、参考です。'],
 breakdown:['得点が、どこから来ているかです。','ブル・トリプル・ダブル・シングル・MISSのうち、点を稼いでいる場所が分かります。','右は得点の割合と投数です。'],
 pace:['投げる速さと、ブル率の関係です。','投球間隔の中央値と、速い時・遅い時のブル率を比べます。','120秒を超える間隔は除きます。'],
 streak:['ブルが連続した最大の回数です。','数字が大きいほど、波に乗れた場面があったことを示します。','選んだ期間の中での記録です。'],
 goal:['目標点と、今の実力の差です。','直近10ゲームの平均・SD・最高点を出します。SD は得点のばらつきで、小さいほど安定です。TOP は直近ゲームの順位です。','GOAL に目標点を入れると差を表示します。'],
 bestavg:['最高のゲームと平均の差を、ラウンドごとに見ます。','棒が平均、黄色い線がベスト、右の数字が差です。差が大きいラウンドが伸びしろです。','全期間のゲームが対象です。'],
 conditions:['いつ投げると調子が良いかです。','時間帯と、その日の何ゲーム目かで、平均点を比べます。G はゲーム数です。','3ゲーム未満の行は薄く表示し、参考です。'],
 log:['練習の量と続け方です。','濃いほど投数が多い日。DAYS＝直近28日の練習日数、STREAK＝連続日数、THIS WEEK＝今週の投数です。','直近35日を表示します。']
};
const HELP_EXAMPLES={"focus":"最初にここを見て、今日意識することを1つ決めましょう。","insight":"FACTは記録上の事実、NEXTは次に試す練習です。","aim":"明るい場所ほど多く入った位置。正確な着弾座標ではなく推定です。","allbull":"例：1投目40%、2投目25%なら、今回の記録では1投目の方がBULL率が高い結果です。","trend":"黄色が各ゲーム、水色が直近10ゲーム平均。水色が上向きなら平均点が伸びています。","achievements":"HAT TRICK 5回なら、3投連続BULLのラウンドが累計5回です。","report":"まず全体を文章で読み、気になる項目の詳しい分析を確認しましょう。","throw":"RANGEは数値の不確かさの目安。幅が重なる場合は差を断定できません。","drift":"OFFSETは狙いからのズレ、SPREADは散らばり。小さいほど狙いに近い・まとまる傾向です。","direction":"例：右40%なら、外れた投球が右に多い傾向です。","consistency":"CLUSTERはまとまり具合、SPREADは散らばり。まとまっていても狙いから外れる場合があります。","after":"例：BULL後40%、外した後20%なら、直前の結果で次のBULL率に差がある記録です。","bulltrend":"例：前半30%、後半40%なら、後半のBULL率が10ポイント高い記録です。","rounds":"例：R1が45%、R8が25%なら、終盤に下がる傾向が続くか確認しましょう。","roundscore":"前半R1〜4と後半R5〜8の平均点を比較し、どこで得点が変わるか確認します。","breakdown":"例：BULLが70%なら、得点の70%をBULLで稼いでいます。","pace":"例：MEDIAN 3.2秒、FAST 40%、SLOW 25%なら、今回は比較的速い投球間隔でBULL率が高い記録です。投球の入力時刻差を使い、6区間以上で表示します。","streak":"BEST STREAK 4なら、BULLが4投連続した記録です。","goal":"目標600点、平均520点なら平均ではあと80点。SDは得点のばらつきで小さいほど安定です。","bestavg":"最高と平均の差が大きいラウンドは、良い時と普段の差が大きい場所です。","conditions":"Gはゲーム数。少ないゲーム数の平均は偶然で上下しやすいです。","log":"色が濃いほど投数が多い日。練習量と継続状況を振り返れます。"};
const ANALYSIS_GROUPS=[["今の実力と次の一手",["focus","insight","goal","report"]],["上達の変化",["trend","bulltrend","bestavg"]],["着弾の傾向",["aim","direction","consistency","drift"]],["投げ方のクセ",["allbull","throw","pace","after","streak"]],["ラウンドと得点",["rounds","roundscore","breakdown"]],["練習の振り返り",["conditions","log","achievements"]]];
function arrangeAnalysis(){const metrics=$('metrics');if(!metrics||$('analysisGroups'))return;const root=document.createElement('div');root.id='analysisGroups';root.style.cssText='display:grid;gap:14px;margin-top:16px';metrics.after(root);ANALYSIS_GROUPS.forEach(([title,keys],i)=>{const section=document.createElement('details');section.open=i<2;section.style.cssText='border:1px solid #31414B;border-radius:12px;padding:12px;background:#15212B';const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;font-weight:bold;padding:8px 2px';summary.textContent=(i+1)+'. '+title;const body=document.createElement('div');body.style.cssText='display:grid;gap:12px;margin-top:12px';keys.forEach(key=>{const entry=HELP_CARDS.find(x=>x[0]===key);if(!entry)return;const target=$(entry[1]);const panel=target&&target.closest('.panel');if(panel)body.appendChild(panel)});section.append(summary,body);root.appendChild(section)})}
const HELP_CARDS=[['focus','focusBody'],['insight','insightBody'],['aim','aimAnalysis'],['allbull','allbull'],['trend','analysischart'],['achievements','achievementTotals'],['throw','advancedThrowOrder'],['drift','advancedDrift'],['direction','advancedDirection'],['consistency','advancedConsistency'],['after','advancedAfter'],['bulltrend','advancedBullTrend'],['rounds','advancedRounds'],['roundscore','advancedRoundScore'],['breakdown','advancedBreakdown'],['pace','advancedPace'],['streak','advancedStreak'],['goal','advancedGoalBody'],['bestavg','advancedBestVsAvg'],['conditions','advancedConditions'],['log','advancedLog'],['report','reportBody']];
const helpOpen=new Set();
const helpBtn=(key,cls='')=>'<button type="button" class="help-btn '+cls+'" data-help="'+key+'" aria-expanded="'+helpOpen.has(key)+'" aria-label="見方を開く"><span>?</span></button>';
const helpBox=(key,withWhat)=>{const h=HELP[key]||['','',''],example=HELP_EXAMPLES[key];return '<div class="card-help'+(helpOpen.has(key)?'':' hidden')+'" data-help-for="'+key+'"><p><b>何がわかる？</b> '+h[0]+'</p><p><b>数字の見方</b> '+h[1]+'</p>'+(example?'<p><b>具体例・活用方法</b> '+example+'</p>':'')+'<p><b>注意点</b> '+h[2]+'</p></div>'};
function setupHelp(){
 arrangeAnalysis();
 const row=document.createElement('div');row.className='period-help-row';row.innerHTML=helpBtn('period','inline')+'<span class="tiny muted">期間の見方</span>';
 $('analysisScope').after(row);row.insertAdjacentHTML('afterend',helpBox('period',true));
 for(const [key,id] of HELP_CARDS){const h=$(id).closest('.panel').querySelector('h3');h.classList.add('has-help');h.insertAdjacentHTML('beforeend',helpBtn(key));h.insertAdjacentHTML('afterend','<p class="card-gloss">'+HELP[key][0]+'</p>'+helpBox(key))}
}
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-help]');if(!b)return;
 const k=b.dataset.help,on=!helpOpen.has(k);on?helpOpen.add(k):helpOpen.delete(k);
 document.querySelectorAll('[data-help="'+k+'"]').forEach(x=>x.setAttribute('aria-expanded',String(on)));
 document.querySelectorAll('[data-help-for="'+k+'"]').forEach(x=>x.classList.toggle('hidden',!on));
});
setupHelp();
function renderAimSetting(){
 const sel=$('aimSelect');if(sel&&sel.value!==curAim())sel.value=curAim();
 const chip=$('aimChip');if(chip)chip.textContent='AIM '+curAim();
}
function render(){renderAimSetting();$('soundToggle').textContent=store.soundEnabled===false?'効果音 OFF':'効果音 ON';$('soundToggle').setAttribute('aria-pressed',String(store.soundEnabled!==false));document.querySelectorAll('[data-delay]').forEach(b=>{b.classList.toggle('selected',Number(b.dataset.delay)===Number(store.roundDelay))});updateSaveIndicator();$('savedNotice').classList.toggle('hidden',!justSaved);const s=store.active,ds=s.darts,n=ds.length,ss=finished(),a=completedDarts(),average=ss.length?Math.round(ss.reduce((v,x)=>v+sum(x.darts),0)/ss.length):0,bulls=a.filter(isBull).length;
renderAnalysis();$('livebull').innerHTML=bullBars(ds,curAim());
$('score').textContent=sum(ds);$('roundlabel').textContent='ROUND '+Math.min(8,Math.floor(n/3)+1)+' / 8';$('progress').textContent=n+' / 24';
$('rounds').innerHTML=Array.from({length:8},(_,i)=>{let d=ds.filter(x=>x.roundIndex===i+1);return '<div class="'+(d.length===3?'done':i===Math.min(7,Math.floor(n/3))?'active':'')+'">R'+(i+1)+'<br><b>'+(d.length?sum(d):'—')+'</b></div>'}).join('');
let r=n>0&&n%3===0?Math.min(7,n/3-1):Math.min(7,Math.floor(n/3));$('throws').innerHTML=Array.from({length:3},(_,i)=>{let d=ds[r*3+i];return '<div class="throw '+(!d&&i===n%3?'active':'')+'"><span class="tiny muted">DART '+(i+1)+'</span><b>'+(d?d.score:'—')+'</b><span class="tiny muted">'+(d?dartLabel(d):'READY')+'</span></div>'}).join('');
$('throwlog').innerHTML=ds.slice().reverse().map((d,i)=>'<tr><td>'+(n-i)+' (R'+d.roundIndex+'-'+d.dartIndex+')</td><td>'+dartLabel(d)+'</td><td class="num">'+d.score+'</td></tr>').join('')||'<tr><td colspan="3" class="muted">まだ投球記録がありません</td></tr>';
$('undo').disabled=!n;$('endgame').disabled=!n;
$('resultpanel').classList.toggle('hidden',n!==24||!showResult);$('resultCompare').innerHTML=n===24?resultCompare(ds,ss):'';$('resultscore').textContent=sum(ds);$('resultbull').textContent=ds.filter(isBull).length+' / 24';$('saveResult').disabled=n!==24;
$('miss').disabled=n===24;
const latest=store.sessions[0];$('latestResult').innerHTML=latest?'<div class="latest-score">'+sum(latest.darts)+'</div><div class="latest-meta"><span>'+date(latest.startedAt)+'</span><span>'+(latest.status==='completed'?'24投 完走':'途中終了 '+latest.darts.length+'投')+'</span><span>BULL '+latest.darts.filter(isBull).length+' / '+latest.darts.length+'</span></div>':'<div class="empty">まだ記録がありません。PLAYで最初のゲームを始めましょう。</div>';
$('sessions').innerHTML=store.sessions.map(x=>'<tr><td>'+date(x.startedAt)+'</td><td>'+(x.status==='completed'?'完走':'途中終了')+'</td><td>'+sum(x.darts)+'</td><td>'+x.darts.filter(isBull).length+'</td><td>'+x.darts.length+'</td><td><button data-detail="'+esc(x.id)+'">詳細</button></td></tr>').join('')||'<tr><td colspan="6" class="muted">まだ履歴がありません。PLAYから練習を始めましょう。</td></tr>';
document.querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>{viewId=b.dataset.detail;renderDetail()});if(store.sessions.length&&!store.sessions.some(x=>x.id===viewId))viewId=store.sessions[0].id;renderDetail();
$('bindinglog').textContent=Object.entries(store.bindings).map(([k,v])=>k+' → '+label(v)).join('\n')||'割当なし';
}
function resultCompare(ds,ss){
 if(!ss.length)return '<div class="cmp-first">FIRST GAME — ここが基準になります</div>';
 const sc=sum(ds),scores=ss.map(x=>sum(x.darts)),avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length),best=Math.max(...scores),rank=scores.filter(x=>x>sc).length+1,A=curAim(),rt=x=>x.length?x.filter(q=>aimHit(q,A)).length/x.length*100:0,br=rt(ds),pbr=Math.round(ss.reduce((a,x)=>a+rt(x.darts),0)/ss.length*10)/10;
 const d=(v,u)=>'<b class="'+(v>0?'up':v<0?'down':'')+'">'+(v>0?'▲ +':v<0?'▼ ':'± ')+(v<0?v:v===0?0:v)+(u||'')+'</b>';
 const r=Math.round((br-pbr)*10)/10;
 return '<div class="cmp-grid"><div><span>VS AVG '+avg+'</span>'+d(sc-avg)+'</div><div><span>VS BEST '+best+'</span>'+d(sc-best)+'</div><div><span>RANK</span><b>'+rank+' / '+(scores.length+1)+'</b></div><div><span>'+A+' RATE vs AVG</span>'+d(r,'pt')+'</div></div>'+(sc>best?'<div class="cmp-new">NEW PERSONAL BEST!</div>':'');
}
function renderDetail(){let s=store.sessions.find(x=>x.id===viewId);if(!s){$('sessiondetail').textContent='履歴の「詳細」を押してください。';return}$('sessiondetail').innerHTML='<div class="flex"><b>'+date(s.startedAt)+'</b><span class="pill">'+(s.status==='completed'?'完走':'途中終了')+'</span><strong class="accent">'+sum(s.darts)+' POINTS</strong></div><div class="minirows"><table><thead><tr><th>R</th><th>投球順</th><th>着弾</th><th>得点</th><th>時刻</th></tr></thead><tbody>'+s.darts.map(d=>'<tr><td>'+d.roundIndex+'</td><td>'+d.dartIndex+'</td><td>'+label(d.segment)+'</td><td>'+d.score+'</td><td>'+new Date(d.timestamp).toLocaleTimeString('ja-JP')+'</td></tr>').join('')+'</tbody></table></div>'}
function download(content,filename,type){let blob=new Blob([content],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
$('exportjson').onclick=()=>download(JSON.stringify({schemaVersion:1,sessions:store.sessions,active:store.active,settings:{bindings:store.bindings,calibrationKeys:calibrationKeys(),calibrationCompletedAt:store.calibrationCompletedAt||null,goalScore:store.goalScore||null,aimTarget:curAim()},myDarts:sanitizeMyDarts(myDarts)},null,2),'darts-training-lab-backup.json','application/json');
$('exportcsv').onclick=()=>{let rows=[['session_id','started_at','status','round','dart','timestamp','segment','score','source','zone','aim'],...store.sessions.flatMap(s=>s.darts.map(d=>[s.id,s.startedAt,s.status,d.roundIndex,d.dartIndex,d.timestamp,d.segment,d.score,d.inputSource,d.zone||'',aimOf(d)]))];download('\ufeff'+rows.map(r=>r.join(',')).join('\r\n'),'darts-training-lab-throws.csv','text/csv;charset=utf-8')};
function validDart(d){return d&&typeof d==='object'&&typeof d.id==='string'&&Number.isInteger(d.roundIndex)&&d.roundIndex>=1&&d.roundIndex<=8&&Number.isInteger(d.dartIndex)&&d.dartIndex>=1&&d.dartIndex<=3&&typeof d.segment==='string'&&/^(S|D|T)([1-9]|1[0-9]|20)$|^(OB|IB|MISS)$/.test(d.segment)&&d.score===points(d.segment)}
function validSession(s){return s&&typeof s.id==='string'&&typeof s.startedAt==='string'&&['completed','abandoned'].includes(s.status)&&Array.isArray(s.darts)&&s.darts.length<=24&&s.darts.every((d,i)=>validDart(d)&&d.roundIndex===Math.floor(i/3)+1&&d.dartIndex===i%3+1)&&(s.status!=='completed'||s.darts.length===24)}
function restoreSettings(st){
 if(!st||typeof st!=='object')return false;
 let did=false;
 const segOK=s=>typeof s==='string'&&/^(S|D|T)([1-9]|1[0-9]|20)$|^(OB|IB|MISS)$/.test(s);
 const b=st.bindings;
 if(b&&typeof b==='object'&&!Array.isArray(b)&&!Object.keys(store.bindings||{}).length){const clean=Object.fromEntries(Object.entries(b).filter(([k,v])=>k.length<64&&segOK(v)));if(Object.keys(clean).length){store.bindings=clean;did=true}}
 const ck=st.calibrationKeys;
 if(ck&&typeof ck==='object'&&!Array.isArray(ck)&&!Object.keys(calibrationKeys()).length){const clean=Object.fromEntries(Object.entries(ck).filter(([t,k])=>/^(S\d+[OI]|T\d+|D\d+|OB|IB)$/.test(t)&&typeof k==='string'&&k.length<64));if(Object.keys(clean).length){store.calibrationKeys=clean;store.calibrationCompletedAt=typeof st.calibrationCompletedAt==='string'?st.calibrationCompletedAt:null;did=true}}
 const g=Math.round(Number(st.goalScore));
 if(!(store.goalScore>0)&&g>0&&g<=1440){store.goalScore=g;did=true}
 if(!validAim(store.aimTarget)&&validAim(st.aimTarget)&&st.aimTarget!=='BULL'){store.aimTarget=st.aimTarget;did=true}
 return did;
}
$('importjson').onchange=async e=>{let file=e.target.files[0];if(!file)return;const snapSessions=store.sessions,snapMy=JSON.stringify(myDarts);try{let v=JSON.parse(await file.text());if(v.schemaVersion!==1||!Array.isArray(v.sessions)||!v.sessions.every(validSession))throw Error('ファイル形式が違うか、投球データが不正です');let existing=new Set(store.sessions.map(s=>s.id)),newItems=v.sessions.filter(s=>!existing.has(s.id));let merged=null,addedSets=0,skippedSets=0;if(v.myDarts!==undefined&&v.myDarts!==null){const imp=sanitizeMyDarts(v.myDarts);if(imp.sets.length||imp.nick){merged=sanitizeMyDarts(myDarts);for(const x of imp.sets){const i=merged.sets.findIndex(y=>y.id===x.id);if(i>=0)merged.sets[i]=x;else if(merged.sets.length<10){merged.sets.push(x);addedSets++}else skippedSets++}if(!merged.nick)merged.nick=imp.nick;if(!merged.current&&imp.current&&merged.sets.some(y=>y.id===imp.current))merged.current=imp.current}}if(!confirm(newItems.length+'件の履歴を追加しますか？現在の履歴は残ります。'+(merged?'\nMY DARTS：同じIDのセットは上書き、新規'+addedSets+'件を追加します（既存セットは残ります）。'+(skippedSets?'\n10セットを超える'+skippedSets+'件は取り込めません。':''):'')))return;store.sessions=[...store.sessions,...newItems].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));const restored=restoreSettings(v.settings);let myOk=true;if(merged){myDarts=merged;editingSetup='';myOk=mySaveState();myLoad('')}if(!persist()){store.sessions=snapSessions;if(merged&&myOk){myDarts=sanitizeMyDarts(JSON.parse(snapMy));mySaveState();myLoad('')}render();return}if(!myOk){render();return}render();alert(newItems.length+'件を復元しました'+(restored?'（200S設定・目標も復元）':'')+(merged?'（MY DARTSも復元）':''))}catch(err){alert('復元できませんでした：'+err.message)}finally{e.target.value=''}};
$('clearall').onclick=async()=>{if(confirm('全履歴を削除します。JSONバックアップを保存しましたか？')&&confirm('本当に全履歴を削除しますか？')){store.sessions=[];viewId=null;persist();render();if(cloud.user&&cloud.api&&confirm('クラウドの履歴も削除しますか？\n（削除しないと、次の同期で戻ります）')){try{cloudStatus('DELETING…');const uid=cloud.user.uid,l=await cloud.api.listSessions(uid);for(const x of l){if(x&&typeof x.id==='string')await cloud.api.deleteSession(uid,x.id)}syncMeta.pushed=[];syncMetaSave();cloudUi();toast('クラウドの履歴も削除しました')}catch(e){cloudStatus('DELETE FAILED · '+String(e&&(e.code||e.message)||e).slice(0,60))}}}};
$('aimSelect').innerHTML='<option value="BULL">BULL（ブル）</option><optgroup label="TRIPLE">'+AIMS.filter(x=>x[0]==='T').map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</optgroup><optgroup label="DOUBLE">'+AIMS.filter(x=>x[0]==='D').map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</optgroup>';$('aimSelect').onchange=e=>{const v=e.target.value;if(!validAim(v))return;store.aimTarget=v;persist();profTouch();render()};$('aimChip').onclick=()=>changeTab('settings');
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
$('board200sToggle').onchange=e=>{board200sEnabled=e.target.checked;board200sStatus(board200sEnabled?'200S自動得点 ON':'200S自動得点 OFF')};
/* ===== CLOUD SYNC (Firebase Auth + Firestore, Google login) =====
   Syncs finished games and MY DARTS. localStorage stays the source of truth; nothing here runs unless the user signs in.
   Profile (MY DARTS, round exclusions, goal, aim) is last-writer-wins; 200S key bindings are not synced; 'delete all history' offers to delete the cloud copy too. */
const CLOUD_CFG={apiKey:"AIzaSyCiPeb0A-_dCbRGSHtVM0yHLoNHray-iJ0",authDomain:"darts-training-lab.firebaseapp.com",projectId:"darts-training-lab",storageBucket:"darts-training-lab.firebasestorage.app",messagingSenderId:"99510735998",appId:"1:99510735998:web:a3f9046573e89cd031742f"};
const FB_BASE='https://www.gstatic.com/firebasejs/10.14.1/';
const docId=x=>String(x).replace(/[\/\s]/g,'_').slice(0,120);
function cloudStatus(t){const e=$('cloudStatus');if(e)e.textContent=t}
function cloudPendingCount(){const pushed=new Set(syncMeta.pushed);return store.sessions.filter(s=>validSession(s)&&!pushed.has(s.id)).length+(syncMeta.myAt>syncMeta.myPushed?1:0)}
function cloudQueue(){cloud.pending=true;clearTimeout(cloud.timer);cloud.timer=setTimeout(()=>{cloud.pending=false;if(cloud.user&&!cloud.busy&&!cloud.autoBusy)cloudAuto();else if(cloud.user)cloudQueue()},4500)}
function cloudUi(){const u=cloud.user,on=!!u;const ac=$('authChip');if(ac){ac.textContent=on?String(u.name||'LOGIN').slice(0,12):'GUEST';ac.classList.toggle('on',on)}const b=$('cloudLogin');if(!b)return;b.classList.toggle('hidden',on);$('cloudSync').classList.toggle('hidden',!on);$('cloudLogout').classList.toggle('hidden',!on);if(on&&!cloud.busy){const t=syncMeta.lastAt?new Date(syncMeta.lastAt).toTimeString().slice(0,5):'--:--';cloudStatus('ON · '+(u.name||'GOOGLE')+' · 未同期 '+cloudPendingCount()+'件 · LAST SYNC '+t)}}
async function cloudLoadApi(){
 if(window.__DTL_CLOUD_FAKE)return window.__DTL_CLOUD_FAKE;
 const [a,au,fs]=await Promise.all([import(FB_BASE+'firebase-app.js'),import(FB_BASE+'firebase-auth.js'),import(FB_BASE+'firebase-firestore.js')]);
 const app=a.initializeApp(CLOUD_CFG),auth=au.getAuth(app),db=fs.getFirestore(app);
 return{
  onUser(cb){return au.onAuthStateChanged(auth,u=>cb(u?{uid:u.uid,name:u.displayName||u.email||''}:null))},
  login(){return au.signInWithPopup(auth,new au.GoogleAuthProvider())},
  logout(){return au.signOut(auth)},
  async listSessions(uid){const q=await fs.getDocs(fs.collection(db,'users',uid,'sessions'));return q.docs.map(d=>{try{return JSON.parse(d.data().json)}catch(_){return null}})},
  deleteSession(uid,id){return fs.deleteDoc(fs.doc(db,'users',uid,'sessions',docId(id)))},
  putSession(uid,s){return fs.setDoc(fs.doc(db,'users',uid,'sessions',docId(s.id)),{json:JSON.stringify(s),startedAt:s.startedAt})},
  async getMeta(uid){const d=await fs.getDoc(fs.doc(db,'users',uid,'meta','profile'));return d.exists()?d.data():null},
  putMeta(uid,m){return fs.setDoc(fs.doc(db,'users',uid,'meta','profile'),m)}
 }}
async function cloudConnect(){
 if(cloud.api)return cloud.api;
 cloudStatus('LOADING…');cloud.api=await cloudLoadApi();
 cloud.api.onUser(u=>{cloud.user=u;cloudUi();if(u)cloudSync()});
 return cloud.api}
function cloudMergeSets(local,remote){const m=sanitizeMyDarts(local);for(const x of sanitizeMyDarts(remote).sets){if(!m.sets.some(y=>y.id===x.id)&&m.sets.length<10)m.sets.push(x)}const r=sanitizeMyDarts(remote);if(!m.nick)m.nick=r.nick;if(!m.current&&r.current&&m.sets.some(y=>y.id===r.current))m.current=r.current;return m}
async function cloudPushProfile(uid,api){const at=syncMeta.myAt||Date.now();await api.putMeta(uid,{json:JSON.stringify({myDarts:sanitizeMyDarts(myDarts),excluded:excludedRounds.slice(0,5000),goalScore:store.goalScore||null,aimTarget:curAim()}),updatedAt:at});syncMeta.myAt=at;syncMeta.myPushed=at;syncMetaSave()}
function cloudApplyProfile(rp,at){cloud.applying=true;try{
 if(rp.myDarts){myDarts=sanitizeMyDarts(rp.myDarts);editingSetup='';mySaveState();myLoad('')}
 if(Array.isArray(rp.excluded)){const ex=rp.excluded.filter(x=>typeof x==='string').slice(0,5000);try{localStorage.setItem(EXCLUDED_ROUNDS_KEY,JSON.stringify(ex));excludedRounds=ex}catch(_){}}
 if('goalScore' in rp){const g=Math.round(Number(rp.goalScore));store.goalScore=g>0&&g<=1440?g:null}
 if(validAim(rp.aimTarget))store.aimTarget=rp.aimTarget;
 persist()}finally{cloud.applying=false}
 syncMeta.myAt=at;syncMeta.myPushed=at;syncMetaSave()}
function cloudMergeProfile(rp){cloud.applying=true;try{
 myDarts=cloudMergeSets(myDarts,rp.myDarts||{});mySaveState();myLoad('');
 const ex=[...new Set([...excludedRounds,...(Array.isArray(rp.excluded)?rp.excluded.filter(x=>typeof x==='string'):[])])].slice(0,5000);try{localStorage.setItem(EXCLUDED_ROUNDS_KEY,JSON.stringify(ex));excludedRounds=ex}catch(_){}
 if(!(store.goalScore>0)){const g=Math.round(Number(rp.goalScore));if(g>0&&g<=1440)store.goalScore=g}
 if(!validAim(store.aimTarget)&&validAim(rp.aimTarget))store.aimTarget=rp.aimTarget;
 persist()}finally{cloud.applying=false}}
async function cloudSync(){
 if(!cloud.api||!cloud.user)return;if(cloud.busy||cloud.autoBusy){cloudQueue();return}cloud.busy=true;cloudStatus('SYNCING…');
 try{
  const uid=cloud.user.uid,api=cloud.api;
  const remote=(await api.listSessions(uid)).filter(s=>s&&typeof s.id==='string'&&validSession(s));
  const rids=new Set(remote.map(s=>s.id)),lids=new Set(store.sessions.map(s=>s.id));
  const add=remote.filter(s=>!lids.has(s.id)),up=store.sessions.filter(s=>!rids.has(s.id)&&validSession(s));
  for(const s of up)await api.putSession(uid,s);
  if(add.length){const before=store.sessions;store.sessions=[...store.sessions,...add].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));if(!persist()){store.sessions=before;throw Error('local save failed')}}
  syncMeta.pushed=[...new Set([...syncMeta.pushed,...rids,...up.map(s=>s.id)])];
  const m=await api.getMeta(uid);let rp=null,rAt=0;if(m){rAt=+m.updatedAt||0;try{rp=JSON.parse(m.json);if(!rp||typeof rp!=='object')rp=null}catch(_){rp=null}}
  const lAt=syncMeta.myAt;
  if(!rp)await cloudPushProfile(uid,api);
  else if(lAt===0){const hasLocal=myDarts.sets.length||myDarts.nick||excludedRounds.length||store.goalScore>0||store.aimTarget;if(hasLocal){cloudMergeProfile(rp);syncMeta.myAt=Date.now();await cloudPushProfile(uid,api)}else cloudApplyProfile(rp,rAt||1)}
  else if(rAt>lAt){if(syncMeta.myAt>syncMeta.myPushed){cloudStatus('CONFLICT · 別端末の変更を検出。同期を停止しました');throw Error('PROFILE_CONFLICT: 未同期の端末データを保護しました')}cloudApplyProfile(rp,rAt)}
  else if(lAt>rAt){if(rAt>syncMeta.myPushed&&syncMeta.myPushed>0){cloudStatus('CONFLICT · 別端末の変更を検出。同期を停止しました');throw Error('PROFILE_CONFLICT: 別端末のデータを保護しました')}await cloudPushProfile(uid,api)}
  if(!myDarts.nick&&cloud.user.name){myDarts.nick=String(cloud.user.name).slice(0,32);if(mySaveState()){myRender();await cloudPushProfile(uid,api)}}
  syncMeta.lastAt=Date.now();syncMetaSave();render();
  cloud.busy=false;cloudUi();if(cloud.pending)cloudQueue();toast('CLOUD SYNC OK'+(add.length?' · +'+add.length+'G':''))
 }catch(e){cloud.busy=false;if(!String(e&&e.message||'').includes('PROFILE_CONFLICT'))cloudQueue();cloudStatus((String(e&&e.message||'').includes('PROFILE_CONFLICT')?'CONFLICT · ':'SYNC FAILED · ')+String(e&&(e.code||e.message)||e).slice(0,60))}}
function cloudAuto(){
 if(!cloud.user||!cloud.api)return;
 if(cloud.busy||cloud.autoBusy){cloudQueue();return}
 clearTimeout(cloud.timer);
 cloud.timer=setTimeout(async()=>{
  if(!cloud.user||cloud.busy||cloud.autoBusy){cloudQueue();return}
  cloud.autoBusy=true;
  try{
   const uid=cloud.user.uid,api=cloud.api,done=new Set(syncMeta.pushed);
   const up=store.sessions.filter(s=>!done.has(s.id)&&validSession(s));
   for(const s of up){await api.putSession(uid,s);done.add(s.id)}
   syncMeta.pushed=[...done];syncMetaSave();
   if(syncMeta.myAt>syncMeta.myPushed)await cloudPushProfile(uid,api);
   syncMeta.lastAt=Date.now();syncMetaSave();cloudUi();
  }catch(e){cloudStatus('SYNC FAILED · '+String(e&&(e.code||e.message)||e).slice(0,60));cloud.pending=true}
  finally{cloud.autoBusy=false;if(cloud.pending){cloud.pending=false;cloudQueue()}else cloudUi()}
 },4000)
}
function setupCloud(){
 const b=$('cloudLogin');if(!b)return;
 if(location.protocol==='file:'&&!window.__DTL_CLOUD_FAKE){cloudStatus('公開URL(https)で使えます');b.disabled=true;return}
 b.onclick=async()=>{try{const api=await cloudConnect();cloudStatus('LOGIN…');await api.login();syncMeta.on=true;syncMetaSave()}catch(e){cloudStatus('LOGIN FAILED · '+String(e&&(e.code||e.message)||e).slice(0,60))}};
 $('cloudSync').onclick=()=>cloudSync();
 $('cloudLogout').onclick=async()=>{if(!confirm('ログアウトします。未同期の記録はこの端末に残り、他の端末では見られません。共有端末ではブラウザのデータ管理にも注意してください。'))return;try{if(cloud.api)await cloud.api.logout();cloud.user=null;syncMeta.on=false;syncMetaSave();cloudStatus('OFF');cloudUi()}catch(e){cloudStatus('LOGOUT FAILED')}};
 cloudStatus('OFF');if(syncMeta.on)cloudConnect().catch(e=>cloudStatus('OFFLINE'))}
try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}
setupMyDarts();setupCloud();setupRecovery();drawBoard();render();renderCalibration();rawRender();specialRender();
})();

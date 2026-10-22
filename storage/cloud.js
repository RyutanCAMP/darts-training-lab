// storage/cloud: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectCloud(runtime){
let CLOUD_CFG,FB_BASE,docId;
function profTouch(){if(runtime.cloud.applying)return;runtime.syncMeta.myAt=Date.now();syncMetaSave();try{cloudAuto()}catch(_){}}
function syncMetaSave(){try{localStorage.setItem(runtime.SYNC_KEY,JSON.stringify(runtime.syncMeta))}catch(_){}}
function cloudStatus(t){const e=runtime.$('cloudStatus');if(e)e.textContent=t}
function cloudPendingCount(){const pushed=new Set(runtime.syncMeta.pushed);return runtime.store.sessions.filter(s=>(runtime.validSession(s)&&!runtime.isMatch(s))&&!pushed.has(s.id)).length+(runtime.syncMeta.myAt>runtime.syncMeta.myPushed?1:0)}
function cloudQueue(){runtime.cloud.pending=true;clearTimeout(runtime.cloud.timer);runtime.cloud.timer=setTimeout(()=>{runtime.cloud.pending=false;if(runtime.cloud.user&&!runtime.cloud.busy&&!runtime.cloud.autoBusy)cloudAuto();else if(runtime.cloud.user)cloudQueue()},4500)}
function cloudUi(){runtime.renderMatchAccounts();const u=runtime.cloud.user,on=!!u;const ac=runtime.$('authChip');if(ac){ac.textContent=on?String(u.name||'LOGIN').slice(0,12):'GUEST';ac.classList.toggle('on',on)}const b=runtime.$('cloudLogin');if(!b)return;b.classList.toggle('hidden',on);runtime.$('cloudSync').classList.toggle('hidden',!on);runtime.$('cloudLogout').classList.toggle('hidden',!on);if(on&&!runtime.cloud.busy){const t=runtime.syncMeta.lastAt?new Date(runtime.syncMeta.lastAt).toTimeString().slice(0,5):'--:--';cloudStatus('ON · '+(u.name||'GOOGLE')+' · 未同期 '+cloudPendingCount()+'件 · LAST SYNC '+t)}}
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
 if(runtime.cloud.api)return runtime.cloud.api;
 cloudStatus('LOADING…');runtime.cloud.api=await cloudLoadApi();
 runtime.cloud.api.onUser(u=>{runtime.cloud.user=u;cloudUi();if(u)cloudSync()});
 return runtime.cloud.api}
function cloudMergeSets(local,remote){const m=runtime.sanitizeMyDarts(local);for(const x of runtime.sanitizeMyDarts(remote).sets){if(!m.sets.some(y=>y.id===x.id)&&m.sets.length<10)m.sets.push(x)}const r=runtime.sanitizeMyDarts(remote);if(!m.nick)m.nick=r.nick;if(!m.current&&r.current&&m.sets.some(y=>y.id===r.current))m.current=r.current;return m}
async function cloudPushProfile(uid,api){const at=runtime.syncMeta.myAt||Date.now();await api.putMeta(uid,{json:JSON.stringify({myDarts:runtime.sanitizeMyDarts(runtime.myDarts),excluded:runtime.excludedRounds.slice(0,5000),goalScore:runtime.store.goalScore||null,aimTarget:runtime.curAim()}),updatedAt:at});runtime.syncMeta.myAt=at;runtime.syncMeta.myPushed=at;syncMetaSave()}
function cloudApplyProfile(rp,at){runtime.cloud.applying=true;try{
 if(rp.myDarts){runtime.myDarts=runtime.sanitizeMyDarts(rp.myDarts);runtime.editingSetup='';runtime.mySaveState();runtime.myLoad('')}
 if(Array.isArray(rp.excluded)){const ex=rp.excluded.filter(x=>typeof x==='string').slice(0,5000);try{localStorage.setItem(runtime.EXCLUDED_ROUNDS_KEY,JSON.stringify(ex));runtime.excludedRounds=ex}catch(_){}}
 if('goalScore' in rp){const g=Math.round(Number(rp.goalScore));runtime.store.goalScore=g>0&&g<=1440?g:null}
 if(runtime.validAim(rp.aimTarget))runtime.store.aimTarget=rp.aimTarget;
 runtime.persist()}finally{runtime.cloud.applying=false}
 runtime.syncMeta.myAt=at;runtime.syncMeta.myPushed=at;syncMetaSave()}
function cloudMergeProfile(rp){runtime.cloud.applying=true;try{
 runtime.myDarts=cloudMergeSets(runtime.myDarts,rp.myDarts||{});runtime.mySaveState();runtime.myLoad('');
 const ex=[...new Set([...runtime.excludedRounds,...(Array.isArray(rp.excluded)?rp.excluded.filter(x=>typeof x==='string'):[])])].slice(0,5000);try{localStorage.setItem(runtime.EXCLUDED_ROUNDS_KEY,JSON.stringify(ex));runtime.excludedRounds=ex}catch(_){}
 if(!(runtime.store.goalScore>0)){const g=Math.round(Number(rp.goalScore));if(g>0&&g<=1440)runtime.store.goalScore=g}
 if(!runtime.validAim(runtime.store.aimTarget)&&runtime.validAim(rp.aimTarget))runtime.store.aimTarget=rp.aimTarget;
 runtime.persist()}finally{runtime.cloud.applying=false}}
async function cloudSync(){
 if(!runtime.cloud.api||!runtime.cloud.user)return;if(runtime.cloud.busy||runtime.cloud.autoBusy){cloudQueue();return}runtime.cloud.busy=true;cloudStatus('SYNCING…');
 try{
  const uid=runtime.cloud.user.uid,api=runtime.cloud.api;
  const remote=(await api.listSessions(uid)).filter(s=>s&&typeof s.id==='string'&&(runtime.validSession(s)&&!runtime.isMatch(s)));
  const rids=new Set(remote.map(s=>s.id)),lids=new Set(runtime.store.sessions.map(s=>s.id));
  const add=remote.filter(s=>!lids.has(s.id)),up=runtime.store.sessions.filter(s=>!rids.has(s.id)&&(runtime.validSession(s)&&!runtime.isMatch(s)));
  for(const s of up)await api.putSession(uid,s);
  if(add.length){const before=runtime.store.sessions;runtime.store.sessions=[...runtime.store.sessions,...add].sort((a,b)=>b.startedAt.localeCompare(a.startedAt));if(!runtime.persist()){runtime.store.sessions=before;throw Error('local save failed')}}
  runtime.syncMeta.pushed=[...new Set([...runtime.syncMeta.pushed,...rids,...up.map(s=>s.id)])];
  const m=await api.getMeta(uid);let rp=null,rAt=0;if(m){rAt=+m.updatedAt||0;try{rp=JSON.parse(m.json);if(!rp||typeof rp!=='object')rp=null}catch(_){rp=null}}
  const lAt=runtime.syncMeta.myAt;
  if(!rp)await cloudPushProfile(uid,api);
  else if(lAt===0){const hasLocal=runtime.myDarts.sets.length||runtime.myDarts.nick||runtime.excludedRounds.length||runtime.store.goalScore>0||runtime.store.aimTarget;if(hasLocal){cloudMergeProfile(rp);runtime.syncMeta.myAt=Date.now();await cloudPushProfile(uid,api)}else cloudApplyProfile(rp,rAt||1)}
  else if(rAt>lAt){if(runtime.syncMeta.myAt>runtime.syncMeta.myPushed){cloudStatus('CONFLICT · 別端末の変更を検出。同期を停止しました');throw Error('PROFILE_CONFLICT: 未同期の端末データを保護しました')}cloudApplyProfile(rp,rAt)}
  else if(lAt>rAt){if(rAt>runtime.syncMeta.myPushed&&runtime.syncMeta.myPushed>0){cloudStatus('CONFLICT · 別端末の変更を検出。同期を停止しました');throw Error('PROFILE_CONFLICT: 別端末のデータを保護しました')}await cloudPushProfile(uid,api)}
  if(!runtime.myDarts.nick&&runtime.cloud.user.name){runtime.myDarts.nick=String(runtime.cloud.user.name).slice(0,32);if(runtime.mySaveState()){runtime.myRender();await cloudPushProfile(uid,api)}}
  runtime.syncMeta.lastAt=Date.now();syncMetaSave();runtime.render();
  runtime.cloud.busy=false;cloudUi();if(runtime.cloud.pending)cloudQueue();runtime.toast('CLOUD SYNC OK'+(add.length?' · +'+add.length+'G':''))
 }catch(e){runtime.cloud.busy=false;if(!String(e&&e.message||'').includes('PROFILE_CONFLICT'))cloudQueue();cloudStatus((String(e&&e.message||'').includes('PROFILE_CONFLICT')?'CONFLICT · ':'SYNC FAILED · ')+String(e&&(e.code||e.message)||e).slice(0,60))}}
function cloudAuto(){
 if(!runtime.cloud.user||!runtime.cloud.api)return;
 if(runtime.cloud.busy||runtime.cloud.autoBusy){cloudQueue();return}
 clearTimeout(runtime.cloud.timer);
 runtime.cloud.timer=setTimeout(async()=>{
  if(!runtime.cloud.user||runtime.cloud.busy||runtime.cloud.autoBusy){cloudQueue();return}
  runtime.cloud.autoBusy=true;
  try{
   const uid=runtime.cloud.user.uid,api=runtime.cloud.api,done=new Set(runtime.syncMeta.pushed);
   const up=runtime.store.sessions.filter(s=>!done.has(s.id)&&(runtime.validSession(s)&&!runtime.isMatch(s)));
   for(const s of up){await api.putSession(uid,s);done.add(s.id)}
   runtime.syncMeta.pushed=[...done];syncMetaSave();
   if(runtime.syncMeta.myAt>runtime.syncMeta.myPushed)await cloudPushProfile(uid,api);
   runtime.syncMeta.lastAt=Date.now();syncMetaSave();cloudUi();
  }catch(e){cloudStatus('SYNC FAILED · '+String(e&&(e.code||e.message)||e).slice(0,60));runtime.cloud.pending=true}
  finally{runtime.cloud.autoBusy=false;if(runtime.cloud.pending){runtime.cloud.pending=false;cloudQueue()}else cloudUi()}
 },4000)
}
function setupCloud(){
 const b=runtime.$('cloudLogin');if(!b)return;
 if(location.protocol==='file:'&&!window.__DTL_CLOUD_FAKE){cloudStatus('公開URL(https)で使えます');b.disabled=true;return}
 b.onclick=async()=>{try{const api=await cloudConnect();cloudStatus('LOGIN…');await api.login();runtime.syncMeta.on=true;syncMetaSave()}catch(e){cloudStatus('LOGIN FAILED · '+String(e&&(e.code||e.message)||e).slice(0,60))}};
 runtime.$('cloudSync').onclick=()=>cloudSync();
 runtime.$('cloudLogout').onclick=async()=>{if(!confirm('ログアウトします。未同期の記録はこの端末に残り、他の端末では見られません。共有端末ではブラウザのデータ管理にも注意してください。'))return;try{if(runtime.cloud.api)await runtime.cloud.api.logout();runtime.cloud.user=null;runtime.syncMeta.on=false;syncMetaSave();cloudStatus('OFF');cloudUi()}catch(e){cloudStatus('LOGOUT FAILED')}};
 cloudStatus('OFF');if(runtime.syncMeta.on)cloudConnect().catch(e=>cloudStatus('OFFLINE'))}
Object.assign(runtime,{profTouch,syncMetaSave,cloudStatus,cloudUi,cloudAuto,setupCloud});
function initializeState(){
runtime.SYNC_KEY='dtl-sync-v1';
runtime.syncMeta={pushed:[],myAt:0,myPushed:0,lastAt:0,on:false};
try{const v=JSON.parse(localStorage.getItem(runtime.SYNC_KEY));if(v&&typeof v==='object')runtime.syncMeta={pushed:Array.isArray(v.pushed)?v.pushed.filter(x=>typeof x==='string'):[],myAt:+v.myAt||0,myPushed:+v.myPushed||0,lastAt:+v.lastAt||0,on:!!v.on}}catch(_){}
runtime.cloud={user:null,api:null,busy:false,timer:0,applying:false,pending:false,autoBusy:false};
}
function initializeConfig(){
CLOUD_CFG={apiKey:"AIzaSyCiPeb0A-_dCbRGSHtVM0yHLoNHray-iJ0",authDomain:"darts-training-lab.firebaseapp.com",projectId:"darts-training-lab",storageBucket:"darts-training-lab.firebasestorage.app",messagingSenderId:"99510735998",appId:"1:99510735998:web:a3f9046573e89cd031742f"};
FB_BASE='https://www.gstatic.com/firebasejs/10.14.1/';
docId=x=>String(x).replace(/[\/\s]/g,'_').slice(0,120);
}
return {initializeState,initializeConfig};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectCloud=connectCloud;
})();

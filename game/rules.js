// game/rules: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectRules(runtime){
function newSession(){
 const choice=runtime.store.gameChoice,zero=['301','501','701'].includes(choice);
 return {
  id:runtime.id(),schemaVersion:1,gameType:zero?'zero-one':'countup',
  ...(zero?{rules:{startScore:Number(choice),inRule:'straight',outRule:'open',bullMode:'fat',maxRounds:20}}:{}),
  startedAt:new Date().toISOString(),endedAt:null,status:'active',
  setupId:runtime.myDarts.current||null,
  setupName:runtime.myDarts.sets.find(x=>x.id===runtime.myDarts.current)?.SetupName||null,
  nickname:runtime.myDarts.nick||null,darts:[]
 };
}
Object.assign(runtime,{newSession});
function initialize(){
if(![5,8,10,15].includes(Number(runtime.store.roundDelay)))runtime.store.roundDelay=8;
if(!runtime.store.active)runtime.store.active=newSession();
if(localStorage.getItem(runtime.KEY)!==null){runtime.saveOK=true;runtime.savedAt=Date.now()}
runtime.points=s=>s==='IB'?50:s==='OB'?50:s==='MISS'?0:Number(s.slice(1))*({S:1,D:2,T:3}[s[0]]||0);
if(runtime.sessionDone(runtime.store.active))runtime.showResult=true;
if(runtime.isZero(runtime.store.active))runtime.store.gameChoice=String(runtime.store.active.rules.startScore);else runtime.store.gameChoice='countup';
runtime.label=s=>s==='IB'?'INNER BULL':s==='OB'?'OUTER BULL':s==='MISS'?'MISS':({S:'SINGLE',D:'DOUBLE',T:'TRIPLE'}[s[0]]||'')+' '+s.slice(1);
runtime.dartLabel=d=>d.zone&&/^S\d+(I|O)$/.test(d.zone)?'SINGLE '+d.segment.slice(1)+(d.zone.endsWith('I')?'（内側）':'（外側）'):runtime.label(d.segment);
runtime.isBull=d=>d.segment==='IB'||d.segment==='OB';
runtime.AIMS=['BULL'].concat(Array.from({length:20},(_,i)=>'T'+(20-i)),Array.from({length:20},(_,i)=>'D'+(20-i)));
runtime.validAim=a=>typeof a==='string'&&runtime.AIMS.includes(a);
runtime.aimOf=d=>runtime.validAim(d&&d.aim)?d.aim:'BULL';
runtime.curAim=()=>runtime.validAim(runtime.store.aimTarget)?runtime.store.aimTarget:'BULL';
runtime.aimHit=(d,a)=>a==='BULL'?runtime.isBull(d):d.segment===a;
runtime.hitAim='BULL';
runtime.analysisAim=null;
runtime.isHit=d=>runtime.aimHit(d,runtime.hitAim);
runtime.hitRate=ds=>ds.length?Math.round(ds.filter(runtime.isHit).length/ds.length*1000)/10:0;
runtime.AT=t=>runtime.hitAim==='BULL'?t:t.replace(/\b(INNER |OUTER |IN |OUT )?BULL(S?)\b/g,(m,p,pl)=>p?m:runtime.hitAim+pl).replace(/ブル/g,runtime.hitAim).replace('（HAT TRICK）','');
runtime.sum=ds=>ds.reduce((a,d)=>a+d.score,0);
runtime.all=()=>runtime.store.sessions.filter(runtime.isCountup).flatMap(s=>s.darts);
runtime.finished=()=>runtime.store.sessions.filter(s=>runtime.isCountup(s)&&s.status==='completed');
runtime.completedDarts=()=>runtime.finished().flatMap(s=>s.darts);
runtime.rate=ds=>ds.length?Math.round(ds.filter(runtime.isBull).length/ds.length*1000)/10:0;
runtime.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
runtime.date=s=>new Date(s).toLocaleString('ja-JP');
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectRules=connectRules;
})();

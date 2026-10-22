(()=>{'use strict';
function connectMatchAccounts(runtime){
const slots=[{name:'playerOneName',identity:'playerOneIdentity',fallback:'プレーヤー1'},{name:'playerTwoName',identity:'playerTwoIdentity',fallback:'プレーヤー2'}];
const user=()=>runtime.cloud.user&&typeof runtime.cloud.user.uid==='string'?runtime.cloud.user:null;
const displayName=u=>String(u.name||runtime.myDarts.nick||'ログインユーザー').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,20)||'ログインユーザー';
function renderMatchAccounts(){
 const u=user();
 for(const slot of slots){
  const select=runtime.$(slot.identity),input=runtime.$(slot.name);if(!select||!input)continue;
  if(select.dataset.source==='current'&&(!u||select.dataset.uid!==u.uid)){
   select.dataset.source='guest';input.value=input.dataset.guestName||slot.fallback;
  }
  const current=select.dataset.source==='current'&&!!u;
  select.replaceChildren();
  const guest=document.createElement('option');guest.value='guest';guest.textContent='ゲスト';select.appendChild(guest);
  if(u){const account=document.createElement('option');account.value='current';account.textContent=displayName(u)+'（ログイン中）';select.appendChild(account)}
  select.value=current?'current':'guest';input.readOnly=current;
  if(current)input.value=displayName(u);
 }
 runtime.$('matchAccountHint').textContent=u?'ログイン中のアカウントは、どちらか1人に選べます。':'未ログインでも、そのまま対戦できます。ログインするとアカウントを選べます。';
}
function openMatchSetup(){
 const s=runtime.store.active,u=user();runtime.$('matchNameError').textContent='';
 slots.forEach((slot,i)=>{
  const p=runtime.isMatch(s)?s.players[i]:null,input=runtime.$(slot.name),select=runtime.$(slot.identity);
  input.value=p?.name||slot.fallback;input.dataset.guestName=p?.account?slot.fallback:input.value;
  select.dataset.source=p?.account&&p.account.uid===u?.uid?'current':'guest';select.dataset.uid=u?.uid||'';
 });
 runtime.$('matchStartScore').value=runtime.isZero(s)?String(s.rules.startScore):'501';
 renderMatchAccounts();runtime.openSheet('matchSheet');
}
function matchAccountPlayers(){
 renderMatchAccounts();const u=user();
 return slots.map((slot,i)=>({id:'p'+(i+1),name:runtime.$(slot.name).value.trim(),...(u&&runtime.$(slot.identity).value==='current'?{account:{provider:'google',uid:u.uid}}:{})}));
}
function initialize(){
 slots.forEach(slot=>runtime.$(slot.identity).onchange=()=>{
  const input=runtime.$(slot.name),select=runtime.$(slot.identity),u=user();
  if(select.value==='current'&&u){
   if(!input.readOnly)input.dataset.guestName=input.value;
   for(const other of slots){if(other===slot)continue;const otherSelect=runtime.$(other.identity);if(otherSelect.dataset.source==='current'){otherSelect.dataset.source='guest';runtime.$(other.name).value=runtime.$(other.name).dataset.guestName||other.fallback}}
   select.dataset.source='current';select.dataset.uid=u.uid;
  }else{select.dataset.source='guest';input.value=input.dataset.guestName||slot.fallback}
  renderMatchAccounts();
 });
}
Object.assign(runtime,{openMatchSetup,matchAccountPlayers,renderMatchAccounts});
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectMatchAccounts=connectMatchAccounts;
})();

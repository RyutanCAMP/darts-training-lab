// Pure replay of actual throws. No fabricated darts after a bust or checkout.
(()=>{'use strict';
function connectZeroOne(runtime){
const starts=[301,501,701];
const isZero=s=>s?.gameType==='zero-one';
const validAccount=a=>a===undefined||a===null||(a.provider==='google'&&typeof a.uid==='string'&&a.uid.length>0&&a.uid.length<=128&&!/[\u0000-\u0020\u007f]/.test(a.uid));
const validPlayers=players=>Array.isArray(players)&&players.length===2&&players.every((p,i)=>p&&p.id==='p'+(i+1)&&typeof p.name==='string'&&p.name===p.name.trim()&&p.name.length>0&&p.name.length<=20&&!/[\u0000-\u001f\u007f]/.test(p.name)&&validAccount(p.account))&&players.filter(p=>p.account).length<=1;
const isMatch=s=>isZero(s)&&validPlayers(s.players);
const awaitingPlayer=s=>isMatch(s)&&!evaluateZero(s).ended&&(s.readyTurn??0)!==evaluateZero(s).turnIndex;
function newMatch(start,names){
 return {...runtime.newSession(),gameType:'zero-one',rules:{startScore:start,inRule:'straight',outRule:'open',bullMode:'fat',maxRounds:20},players:names.map((entry,i)=>({id:'p'+(i+1),name:typeof entry==='string'?entry:entry.name,...(entry.account?{account:{...entry.account}}:{})})),readyTurn:0};
}
const isCountup=s=>!!s&&(s.gameType===undefined||s.gameType==='countup');
const validRules=r=>!!r&&starts.includes(r.startScore)&&r.inRule==='straight'&&r.outRule==='open'&&r.bullMode==='fat'&&r.maxRounds===20;
// Open-out routes for this app's 50-point bull rules. Prefer fewer darts,
// then singles, bull, doubles and triples; these are candidates, not odds.
const checkoutCache=new Map();
function checkoutRoutes(remaining,available){
 if(!Number.isInteger(remaining)||remaining<1||remaining>180||!Number.isInteger(available)||available<1||available>3)return [];
 const key=remaining+':'+available;
 if(checkoutCache.has(key))return checkoutCache.get(key).map(route=>route.slice());
 const targets=['S','D','T'].flatMap((ring,i)=>Array.from({length:20},(_,j)=>({label:ring+(20-j),score:(20-j)*(i+1),cost:i===0?0:i+1}))).concat([{label:'BULL',score:50,cost:1}]);
 let candidates=[];
 function find(left,count,start,path,cost){
  if(count===0){if(left===0)candidates.push({path:path.slice().sort((a,b)=>b.score-a.score||a.cost-b.cost),cost});return}
  if(left<count||left>60*count)return;
  for(let i=start;i<targets.length;i++){const t=targets[i];if(t.score<=left)find(left-t.score,count-1,i,path.concat(t),cost+t.cost)}
 }
 for(let count=1;count<=available;count++){find(remaining,count,0,[],0);if(candidates.length)break}
 candidates.sort((a,b)=>a.cost-b.cost||a.path.reduce((cmp,t,i)=>cmp||b.path[i].score-t.score,0));
 const routes=candidates.slice(0,3).map(x=>x.path.map(t=>t.label));
 checkoutCache.set(key,routes);
 return routes.map(route=>route.slice());
}
function evaluateZero(s){
 const rules=s?.rules;
 if(!validRules(rules)||!Array.isArray(s.darts))return {valid:false};
 if(s.players!==undefined)return evaluateMatch(s);
 let remaining=rules.startScore,roundStart=remaining,round=1,dart=1,ended=false,reason=null;
 const frames=[],rounds=[];
 for(const d of s.darts){
  if(ended||!d||d.roundIndex!==round||d.dartIndex!==dart||typeof d.segment!=='string'||! /^(?:[SDT](?:[1-9]|1[0-9]|20)|OB|IB|MISS)$/.test(d.segment)||d.score!==runtime.points(d.segment))return {valid:false};
  const next=remaining-d.score,bust=next<0;
  remaining=bust?roundStart:next;
  const checkout=remaining===0,closed=bust||checkout||dart===3;
  frames.push({round,dart,bust,remaining});
  let row=rounds.at(-1);
  if(!row||row.round!==round){row={round,start:roundStart,remaining,score:0,bust:false,closed:false};rounds.push(row)}
  Object.assign(row,{remaining,score:roundStart-remaining,bust,closed});
  if(checkout){ended=true;reason='checkout'}
  else if(closed&&round===rules.maxRounds){ended=true;reason='round-limit'}
  if(closed){round++;dart=1;roundStart=remaining}else dart++;
 }
 return {valid:true,remaining,round:ended?frames.at(-1).round:Math.min(round,rules.maxRounds),dart,ended,reason,frames,rounds};
}
function evaluateMatch(s){
 if(!validPlayers(s.players))return {valid:false};
 const scores=[s.rules.startScore,s.rules.startScore],frames=[],rounds=[];
 let turn=0,dart=1,roundStart=scores[0],ended=false,reason=null,winner=null;
 for(const d of s.darts){
  const playerIndex=turn%2,round=Math.floor(turn/2)+1;
  if(ended||!d||d.playerIndex!==playerIndex||d.roundIndex!==round||d.dartIndex!==dart||typeof d.segment!=='string'||!/^(?:[SDT](?:[1-9]|1[0-9]|20)|OB|IB|MISS)$/.test(d.segment)||d.score!==runtime.points(d.segment))return {valid:false};
  const next=scores[playerIndex]-d.score,bust=next<0;
  scores[playerIndex]=bust?roundStart:next;
  const checkout=scores[playerIndex]===0,closed=bust||checkout||dart===3;
  frames.push({round,dart,playerIndex,turn,bust,remaining:scores[playerIndex]});
  let row=rounds.at(-1);
  if(!row||row.turn!==turn){row={round,turn,playerIndex,start:roundStart};rounds.push(row)}
  Object.assign(row,{remaining:scores[playerIndex],score:roundStart-scores[playerIndex],bust,closed});
  if(checkout){ended=true;reason='checkout';winner=playerIndex}
  else if(closed&&turn===39){ended=true;reason='round-limit'}
  if(closed&&!ended){turn++;dart=1;roundStart=scores[turn%2]}else if(!closed)dart++;
 }
 const playerIndex=turn%2;
 return {valid:true,remaining:scores[playerIndex],scores,playerIndex,turnIndex:turn,round:Math.floor(turn/2)+1,dart,ended,reason,winner,frames,rounds};
}
const sessionDone=s=>isZero(s)?evaluateZero(s).ended===true:isCountup(s)&&s.darts.length===24;
const roundReady=s=>isZero(s)?s.darts.length>0&&!sessionDone(s)&&evaluateZero(s).dart===1:s.darts.length>0&&s.darts.length%3===0;
function validZeroSession(s){
 if(!isZero(s)||typeof s.id!=='string'||typeof s.startedAt!=='string'||!['completed','abandoned'].includes(s.status)||!Array.isArray(s.darts)||!s.darts.length||s.darts.length>(isMatch(s)?120:60)||s.darts.some(d=>typeof d?.id!=='string'))return false;
 const state=evaluateZero(s);
 return state.valid&&(s.status==='completed'?state.ended:!state.ended)&&(!s.result||(s.result.reason===state.reason&&s.result.remaining===state.remaining&&(!isMatch(s)||(s.result.winner===state.winner&&JSON.stringify(s.result.scores)===JSON.stringify(state.scores)))));
}
function gameName(s){return isZero(s)?String(s.rules.startScore)+' / 01'+(isMatch(s)?' · 2P':''):'COUNT-UP'}
function gameOutcome(s){if(s.status==='abandoned')return '途中終了';if(!isZero(s))return '完走';const q=evaluateZero(s);return isMatch(s)?q.winner!==null?'P'+(q.winner+1)+' WIN':'DRAW / ROUND LIMIT':q.reason==='checkout'?'CHECKOUT':'ROUND LIMIT'}
function gameScore(s){return isMatch(s)?evaluateZero(s).scores.join(' / '):isZero(s)?evaluateZero(s).remaining:runtime.sum(s.darts)}
function matchSummary(s){return isMatch(s)?s.players.map((p,i)=>'P'+(i+1)+' '+p.name+' · 残り '+evaluateZero(s).scores[i]).join(' / '):''}
function initialize(){
 const countup={add:runtime.add,startNew:runtime.startNew,undo:runtime.undo,finishEarly:runtime.finishEarly,confirmResult:runtime.confirmResult};
 function commit(status,choice,names){
  const s=runtime.store.active,previousChoice=runtime.store.gameChoice;
  const previousResult=s.result;
  s.status=status;s.endedAt=new Date().toISOString();
  if(isZero(s)){const q=evaluateZero(s);s.result={reason:q.reason,remaining:q.remaining,...(isMatch(s)?{winner:q.winner,scores:q.scores}: {})}}
  runtime.store.sessions.unshift(s);
  if(choice!==undefined)runtime.store.gameChoice=choice;
  runtime.store.active=names?newMatch(Number(choice),names):choice===undefined&&isMatch(s)?newMatch(s.rules.startScore,s.players):runtime.newSession();
  if(!runtime.persist()){
   runtime.store.active=s;runtime.store.sessions.shift();runtime.store.gameChoice=previousChoice;
   s.status='active';s.endedAt=null;if(previousResult===undefined)delete s.result;else s.result=previousResult;
   return false;
  }
  return true;
 }
 function replaceEmpty(choice,names){
  const previous=runtime.store.active,previousChoice=runtime.store.gameChoice;
  runtime.store.gameChoice=choice;runtime.store.active=names?newMatch(Number(choice),names):runtime.newSession();
  if(!runtime.persist()){runtime.store.active=previous;runtime.store.gameChoice=previousChoice;return false}return true;
 }
 function selectGame(choice,forceSolo=false){
  if(!['countup','301','501','701'].includes(choice))return;
  const s=runtime.store.active,current=isZero(s)?String(s.rules.startScore):'countup';
  if(choice===current&&!forceSolo)return;
  if(s.darts.length){
   if(!confirm(sessionDone(s)?'現在の結果を保存してゲームを切り替えますか？':'進行中のゲームを途中終了として保存し、ゲームを切り替えますか？')){runtime.render();return}
   if(!commit(sessionDone(s)?'completed':'abandoned',choice)){runtime.render();return}
  }else if(!replaceEmpty(choice)){runtime.render();return}
  runtime.cancelAchievementDelay();runtime.finishRoundBreak();runtime.showResult=false;runtime.justSaved=false;runtime.render();runtime.toast('READY TO THROW');
 }
 function addZero(segment,source='manual',zone=null){
  if(runtime.roundBreakUntil>Date.now())return;
  const s=runtime.store.active,q=evaluateZero(s);
  if(!q.valid||q.ended||awaitingPlayer(s))return;
  s.darts.push({id:runtime.id(),sessionId:s.id,roundIndex:q.round,dartIndex:q.dart,...(isMatch(s)?{playerIndex:q.playerIndex}:{}),timestamp:new Date().toISOString(),segment,zone:zone||null,score:runtime.points(segment),inputSource:source,aim:runtime.curAim(),corrected:false});
  const next=evaluateZero(s);
  if(!next.valid){s.darts.pop();return}
  const last=next.frames.at(-1),row=next.rounds.at(-1);
  runtime.showResult=next.ended;runtime.persist();runtime.render();runtime.flashBoardHit(segment,zone);
  if(next.ended){
   runtime.playSound(next.reason==='checkout'?'finish':'round');
   const title=isMatch(s)?next.winner!==null?s.players[next.winner].name+' WIN!':'DRAW / ROUND LIMIT':next.reason==='checkout'?'CHECKOUT!':'ROUND LIMIT';
   runtime.toast(title);runtime.gameEffect(title,s.darts.length+' DARTS / 残り '+gameScore(s),'finish',1800);
  }else if(row.closed){
   if(isMatch(s)){runtime.playSound(last.bust?'miss':'round');runtime.toast((last.bust?'BUST · ':'')+s.players[next.playerIndex].name+'に交代');return}
   runtime.playSound(last.bust?'miss':'round');runtime.toast(last.bust?'BUST — ラウンド開始時の残点に戻ります':'NEXT ROUND');
   runtime.beginRoundBreak(row.round,row.score,s.darts.filter(d=>d.roundIndex===row.round));
   runtime.$('roundBreakLabel').textContent='ROUND '+row.round+(last.bust?' BUST':' CLEAR');
   runtime.$('roundBreakScore').textContent='残り '+next.remaining;
   runtime.$('roundBreakPraise').textContent=last.bust?'BUST!':runtime.roundPraise(s.darts.filter(d=>d.roundIndex===row.round),row.score);
   runtime.playSound('cooldown',.6);
  }else{
   runtime.playSound(segment==='MISS'?'miss':segment==='IB'?'inner':segment==='OB'?'bull':segment[0]==='T'?'triple':segment[0]==='D'?'double':'hit');
   runtime.toast(runtime.label(segment)+' — 残り '+next.remaining);
  }
 }
 runtime.add=(...args)=>isZero(runtime.store.active)?addZero(...args):countup.add(...args);
 runtime.undo=()=>{
  if(!isZero(runtime.store.active))return countup.undo();
  runtime.cancelAchievementDelay();runtime.finishRoundBreak();
  if(!runtime.store.active.darts.length)return;
  runtime.store.active.darts.pop();if(isMatch(runtime.store.active))runtime.store.active.readyTurn=evaluateZero(runtime.store.active).turnIndex;runtime.showResult=false;runtime.persist();runtime.render();runtime.toast('直前の投球を取り消しました');
 };
 runtime.confirmResult=()=>{
  if(!isZero(runtime.store.active))return countup.confirmResult();
  if(!sessionDone(runtime.store.active))return;
  runtime.finishRoundBreak();
  if(!commit('completed'))return;
  runtime.showResult=false;runtime.justSaved=true;runtime.viewId=runtime.store.sessions[0].id;
  runtime.toast('01の結果を保存しました');runtime.changeTab('history');
 };
 runtime.finishEarly=()=>{
  if(!isZero(runtime.store.active))return countup.finishEarly();
  if(sessionDone(runtime.store.active))return runtime.confirmResult();
  if(!runtime.store.active.darts.length||!confirm('この01を途中終了として保存しますか？'))return;
  if(!commit('abandoned'))return;
  runtime.finishRoundBreak();runtime.showResult=false;runtime.render();runtime.toast('途中終了として保存しました');
 };
 runtime.startNew=()=>{
  if(!isZero(runtime.store.active))return countup.startNew();
  const s=runtime.store.active;
  if(s.darts.length){if(!confirm(sessionDone(s)?'結果を保存して新しい01を始めますか？':'途中終了として保存し、新しい01を始めますか？'))return;if(!commit(sessionDone(s)?'completed':'abandoned'))return}
  else if(!replaceEmpty(String(s.rules.startScore),isMatch(s)?s.players:undefined))return;
  runtime.finishRoundBreak();runtime.showResult=false;runtime.changeTab('play');runtime.toast('NEW GAME — GOOD LUCK!');
 };
 runtime.$('gameSelect').onchange=e=>selectGame(e.target.value);
 runtime.$('soloMode').onclick=()=>selectGame(String(runtime.store.active.rules.startScore),true);
 runtime.$('matchSetup').onclick=()=>runtime.openMatchSetup();
 runtime.$('matchForm').onsubmit=e=>{
  e.preventDefault();const names=runtime.matchAccountPlayers(),start=runtime.$('matchStartScore').value;
  if(!validPlayers(names)){runtime.$('matchNameError').textContent='2人の名前を1〜20文字で入力してください';return}
  if(!['301','501','701'].includes(start))return;
  const s=runtime.store.active;
  if(s.darts.length){if(!confirm(sessionDone(s)?'現在の結果を保存して2人対戦を始めますか？':'現在のゲームを途中終了として保存し、2人対戦を始めますか？'))return;if(!commit(sessionDone(s)?'completed':'abandoned',start,names))return}
  else if(!replaceEmpty(start,names))return;
  runtime.cancelAchievementDelay();runtime.finishRoundBreak();runtime.showResult=false;runtime.justSaved=false;runtime.closeSheets();runtime.changeTab('play');runtime.toast(names[0].name+'からスタート');
 };
 runtime.$('confirmTurn').onclick=()=>runtime.confirmPlayerChange();
}
function confirmPlayerChange(){
 const s=runtime.store.active;if(!awaitingPlayer(s))return false;
 const old=s.readyTurn,q=evaluateZero(s);s.readyTurn=q.turnIndex;
 if(!runtime.persist()){if(old===undefined)delete s.readyTurn;else s.readyTurn=old;runtime.render();return false}
 runtime.render();runtime.toast(s.players[q.playerIndex].name+' · READY');return true;
}
Object.assign(runtime,{isZero,isMatch,isCountup,evaluateZero,sessionDone,roundReady,validZeroSession,gameName,gameOutcome,gameScore,matchSummary,checkoutRoutes,awaitingPlayer,confirmPlayerChange});
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectZeroOne=connectZeroOne;
})();

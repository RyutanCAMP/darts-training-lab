// game/countup: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectCountup(runtime){
let achievementDelayTimer;
function cancelAchievementDelay(){if(achievementDelayTimer!==null){clearTimeout(achievementDelayTimer);achievementDelayTimer=null}}
function add(segment,source='manual',zone=null){if(runtime.roundBreakUntil>Date.now()||achievementDelayTimer!==null)return;let s=runtime.store.active;if(s.darts.length>=24){runtime.toast('結果確認後に保存してください');return}let i=s.darts.length;let hat=false;s.darts.push({id:runtime.id(),sessionId:s.id,roundIndex:Math.floor(i/3)+1,dartIndex:i%3+1,timestamp:new Date().toISOString(),segment,zone:zone||null,score:runtime.points(segment),inputSource:source,aim:runtime.curAim(),corrected:false});if(s.darts.length===24){hat=s.darts.slice(-3).every(runtime.isBull);runtime.showResult=false;const total=runtime.sum(s.darts),past=runtime.finished(),best=past.length?Math.max(...past.map(x=>runtime.sum(x.darts))):null;const first=best===null,record=best!==null&&total>best;runtime.playSound(record||first?'hat':'finish');if(record){if(!hat)runtime.gameEffect('NEW RECORD!',''+total+' POINTS  /  +'+(total-best)+' BEST','record',3800);runtime.toast('NEW RECORD!  '+total+' POINTS','award')}else if(first){if(!hat)runtime.gameEffect('FIRST CLEAR!',''+total+' POINTS','record',3100);runtime.toast('FIRST CLEAR!  '+total+' POINTS','award')}else{if(!hat)runtime.gameEffect('GAME COMPLETE','TOTAL '+total+' POINTS','finish',2000);runtime.toast('GAME COMPLETE!  '+total+' POINTS','award')}}else {
 const round=s.darts.slice(Math.floor(i/3)*3),score=runtime.sum(round),last=s.darts.at(-1),shot=runtime.shotPraise(last);

 const completeRound=round.length===3,award=completeRound?runtime.roundPraise(round,score):null;
 const bullStreak=round.length>=2&&round.every(runtime.isBull);hat=completeRound&&round.every(runtime.isBull);
 if(completeRound&&['HAT TRICK!','TON 80!','HIGH TON!','LOW TON!'].includes(award)){
  runtime.playSound(award==='HAT TRICK!'?'hat':'round');
  runtime.toast(award+'  +'+score+' POINTS','award');
  if(award==='HAT TRICK!')runtime.gameEffect('HAT TRICK!','3 BULLS IN A ROW','award',3000);
 }else if(segment==='MISS'){
  runtime.playSound('miss');runtime.toast('MISS — NEXT DART','miss');
 }else{
  runtime.playSound(segment==='IB'?'inner':segment==='OB'?'bull':segment.startsWith('T')?'triple':segment.startsWith('D')?'double':'hit');
  runtime.toast((shot?shot.title:runtime.dartLabel(last))+'  +'+runtime.points(segment),runtime.isBull(last)?'bull':'');
  if(bullStreak&&!completeRound)runtime.gameEffect('DOUBLE BULL!','2 BULLS IN A ROW','bull',1500);
  else if(shot&&!completeRound)runtime.gameEffect(shot.title,'+'+runtime.points(segment)+' POINTS',shot.kind,850);
 }
 }
 if(s.darts.length>0&&s.darts.length<24&&s.darts.length%3===0){
  // Queue the jingle after BULL/INNER BULL or achievement fanfare.
  const cueDelay=hat?3.1:segment==='IB'?1.4:segment==='OB'?1.1:s.darts.length===21?1.15:segment.startsWith('T')?.65:.45;
  runtime.playSound('cooldown',cueDelay);
 }
 runtime.persist();runtime.render();runtime.flashBoardHit(segment,zone);if(s.darts.length>0&&s.darts.length<24&&s.darts.length%3===0){const completedRound=s.darts.length/3;const rd=s.darts.slice(-3),rs=runtime.sum(rd);if(hat){achievementDelayTimer=setTimeout(()=>{achievementDelayTimer=null;runtime.beginRoundBreak(completedRound,rs,rd)},3100)}else runtime.beginRoundBreak(completedRound,rs,rd)}if(s.darts.length===24){const showFinal=()=>{runtime.showResult=true;runtime.render();requestAnimationFrame(()=>{runtime.$('resultpanel').scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center'})})};if(hat){runtime.showResult=false;runtime.gameEffect('HAT TRICK!','3 BULLS IN A ROW','award',3000);achievementDelayTimer=setTimeout(()=>{achievementDelayTimer=null;showFinal()},3100)}else requestAnimationFrame(showFinal)}}
function complete(status){let s=runtime.store.active;if(!s.darts.length)return false;const next=runtime.newSession();s.status=status;s.endedAt=new Date().toISOString();runtime.store.sessions.unshift(s);runtime.store.active=next;if(!runtime.persist()){runtime.store.active=s;runtime.store.sessions.shift();s.status='active';s.endedAt=null;return false}return true}
function startNew(){cancelAchievementDelay();runtime.finishRoundBreak();if(runtime.store.active.darts.length===24){if(!confirm('現在の24投を完走として保存し、新しいゲームを始めますか？'))return;if(!complete('completed'))return}else if(runtime.store.active.darts.length){if(!confirm('進行中のゲームを途中終了として保存し、新しいゲームを始めますか？'))return;if(!complete('abandoned'))return}else runtime.store.active=runtime.newSession();runtime.showResult=false;runtime.persist();runtime.toast('NEW GAME — GOOD LUCK!');runtime.changeTab('play')}
function undo(){cancelAchievementDelay();runtime.finishRoundBreak();if(!runtime.store.active.darts.length)return;runtime.store.active.darts.pop();runtime.showResult=false;runtime.persist();runtime.toast('直前の投球を取り消しました');runtime.render()}
function finishEarly(){if(!runtime.store.active.darts.length)return;if(runtime.store.active.darts.length===24){confirmResult();return}if(confirm('このゲームを途中終了として保存しますか？（完走平均には含みません）')){if(!complete('abandoned'))return;runtime.showResult=false;runtime.toast('途中終了として保存しました');runtime.render()}}
function confirmResult(){runtime.finishRoundBreak();if(runtime.store.active.darts.length!==24)return;let score=runtime.sum(runtime.store.active.darts);if(!complete('completed'))return;runtime.showResult=false;runtime.viewId=runtime.store.sessions[0].id;runtime.justSaved=true;runtime.toast('完走 '+score+' POINTS を履歴に保存しました');runtime.render();runtime.changeTab('history')}
Object.assign(runtime,{cancelAchievementDelay,add,startNew,undo,finishEarly,confirmResult});
function initialize(){
achievementDelayTimer=null;
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectCountup=connectCountup;
})();

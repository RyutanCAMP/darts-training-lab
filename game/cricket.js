// Standard cricket: pure replay of actual throws (15-20 and BULL, 15 rounds).
// A dart's `score` holds the cricket points it earned, checked on replay.
(()=>{'use strict';
function connectCricket(runtime){
const TARGETS=['20','19','18','17','16','15','BULL'];
const SEGMENT=/^(?:[SDT](?:[1-9]|1[0-9]|20)|OB|IB|MISS)$/;
const validRules=r=>!!r&&r.mode==='standard'&&r.bullMode==='split'&&r.maxRounds===15;
const cricketRules=()=>({mode:'standard',bullMode:'split',maxRounds:15});
// Outer bull is one mark and inner bull two; each bull mark is worth 25.
function hitOf(segment){
 if(segment==='IB')return {target:'BULL',marks:2,value:25};
 if(segment==='OB')return {target:'BULL',marks:1,value:25};
 const n=Number(segment.slice(1));
 return n>=15&&n<=20?{target:String(n),marks:{S:1,D:2,T:3}[segment[0]],value:n}:null;
}
const emptyMarks=()=>Object.fromEntries(TARGETS.map(t=>[t,0]));
// Marks that close a number count; extra marks count only when they score.
function scoreDart(marks,playerIndex,segment,match){
 const hit=hitOf(segment);if(!hit)return {target:null,marks:0,points:0};
 const before=marks[playerIndex][hit.target],closing=Math.min(hit.marks,3-before),extra=hit.marks-closing;
 const open=!match||marks[1-playerIndex][hit.target]<3,points=open?extra*hit.value:0;
 return {target:hit.target,marks:closing+(points?extra:0),points};
}
const allClosed=m=>TARGETS.every(t=>m[t]>=3);
function evaluateCricket(s){
 if(!validRules(s?.rules)||!Array.isArray(s.darts))return {valid:false};
 const match=s.players!==undefined;
 if(match&&!runtime.isMatch(s))return {valid:false};
 const count=match?2:1,turnLimit=s.rules.maxRounds*count,marks=[emptyMarks(),emptyMarks()],points=[0,0],totals=[0,0],thrown=[0,0],frames=[],rounds=[];
 let turn=0,dart=1,ended=false,reason=null,winner=null;
 for(const d of s.darts){
  const playerIndex=turn%count,round=Math.floor(turn/count)+1;
  if(ended||!d||(match?d.playerIndex!==playerIndex:d.playerIndex!==undefined)||d.roundIndex!==round||d.dartIndex!==dart||typeof d.segment!=='string'||!SEGMENT.test(d.segment))return {valid:false};
  const hit=scoreDart(marks,playerIndex,d.segment,match);
  if(d.score!==hit.points)return {valid:false};
  if(hit.target)marks[playerIndex][hit.target]=Math.min(3,marks[playerIndex][hit.target]+hitOf(d.segment).marks);
  points[playerIndex]+=hit.points;totals[playerIndex]+=hit.marks;thrown[playerIndex]++;
  frames.push({round,dart,playerIndex,turn,target:hit.target,marks:hit.marks,points:hit.points});
  let row=rounds.at(-1);
  if(!row||row.turn!==turn){row={round,turn,playerIndex,marks:0,points:0,closed:false};rounds.push(row)}
  row.marks+=hit.marks;row.points+=hit.points;
  if(allClosed(marks[playerIndex])&&(!match||points[playerIndex]>=points[1-playerIndex])){ended=true;reason='closed';winner=match?playerIndex:null}
  const closed=ended||dart===3;row.closed=closed;
  if(closed&&!ended&&turn===turnLimit-1){ended=true;reason='round-limit';winner=match&&points[0]!==points[1]?(points[0]>points[1]?0:1):null}
  if(closed&&!ended){turn++;dart=1}else if(!closed)dart++;
 }
 const playerIndex=turn%count,mpr=thrown.map((n,i)=>n?Math.round(totals[i]/n*300)/100:0);
 return {valid:true,match,marks,points,totals,mpr,playerIndex,turnIndex:turn,round:Math.min(Math.floor(turn/count)+1,s.rules.maxRounds),dart,ended,reason,winner,frames,rounds};
}
function validCricketSession(s){
 if(!runtime.isCricket(s)||typeof s.id!=='string'||typeof s.startedAt!=='string'||!['completed','abandoned'].includes(s.status)||!Array.isArray(s.darts)||!s.darts.length||s.darts.length>(runtime.isMatch(s)?90:45)||s.darts.some(d=>typeof d?.id!=='string'))return false;
 const q=evaluateCricket(s);
 return q.valid&&(s.status==='completed'?q.ended:!q.ended)&&(!s.result||(s.result.reason===q.reason&&s.result.winner===q.winner&&JSON.stringify(s.result.points)===JSON.stringify(q.match?q.points:q.points.slice(0,1))));
}
const cricketResult=q=>({reason:q.reason,winner:q.winner,points:q.match?q.points:q.points.slice(0,1),mpr:q.match?q.mpr:q.mpr.slice(0,1)});
const cricketPreview=(s,segment)=>{const q=evaluateCricket(s);return q.valid?scoreDart(q.marks,q.playerIndex,segment,q.match):null};
function initialize(){
 runtime.addCricket=(segment,source='manual',zone=null)=>{
  if(runtime.roundBreakUntil>Date.now())return;
  const s=runtime.store.active,q=evaluateCricket(s);
  if(!q.valid||q.ended||runtime.awaitingPlayer(s))return;
  const hit=cricketPreview(s,segment);
  s.darts.push({id:runtime.id(),sessionId:s.id,roundIndex:q.round,dartIndex:q.dart,...(q.match?{playerIndex:q.playerIndex}:{}),timestamp:new Date().toISOString(),segment,zone:zone||null,score:hit.points,inputSource:source,aim:runtime.curAim(),corrected:false});
  const next=evaluateCricket(s);
  if(!next.valid){s.darts.pop();return}
  const row=next.rounds.at(-1);
  runtime.showResult=next.ended;runtime.persist();runtime.render();runtime.flashBoardHit(segment,zone);
  if(next.ended){
   runtime.playSound('finish');
   const title=q.match?next.winner!==null?s.players[next.winner].name+' WIN!':'DRAW / ROUND LIMIT':next.reason==='closed'?'ALL CLOSED!':'ROUND LIMIT';
   runtime.toast(title);runtime.gameEffect(title,s.darts.length+' DARTS / '+runtime.gameScore(s),'finish',1800);
  }else if(row.closed){
   runtime.playSound('round');
   if(q.match){runtime.toast(row.marks+' MARK · '+s.players[next.playerIndex].name+'に交代');return}
   runtime.toast('NEXT ROUND');
   const darts=s.darts.filter(d=>d.roundIndex===row.round);
   runtime.beginRoundBreak(row.round,row.points,darts);
   runtime.$('roundBreakScore').textContent=row.marks+' MARK'+(row.points?' · +'+row.points:'');
   runtime.$('roundBreakPraise').textContent=row.marks>=9?'WHITE HORSE!':row.marks>=5?'NICE MARKS!':runtime.roundPraise(darts,row.points);
   runtime.playSound('cooldown',.6);
  }else{
   runtime.playSound(segment==='MISS'?'miss':segment==='IB'?'inner':segment==='OB'?'bull':segment[0]==='T'?'triple':segment[0]==='D'?'double':'hit');
   runtime.toast(runtime.label(segment)+(hit.marks?' — '+hit.marks+' MARK':' — NO MARK')+(hit.points?' · +'+hit.points:''));
  }
 };
}
Object.assign(runtime,{CRICKET_TARGETS:TARGETS,cricketRules,evaluateCricket,validCricketSession,cricketResult,cricketPreview});
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectCricket=connectCricket;
})();

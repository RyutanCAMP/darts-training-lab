// board/input: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectInput(runtime){
let calibrationTargets,rawRunning,rawTimer,rawLastEvent,rawTargets,rawData,specialMode,specialTimer,specialData,board200sMap,board200sEnabled,board200sLastKey,board200sLastAt,select;
function calibrationSegment(target){return target.endsWith('O')&&target.startsWith('S')?'S'+target.slice(1,-1):target.endsWith('I')&&target.startsWith('S')?'S'+target.slice(1,-1):target}
function calibrationName(target){if(target==='OB')return 'OUTER BULL（外側・25点）';if(target==='IB')return 'INNER BULL（中心・50点）';if(target.startsWith('S'))return 'S'+target.slice(1,-1)+(target.endsWith('O')?' 外側':' 内側');return target}
function calibrationKeys(){return runtime.store.calibrationKeys&&typeof runtime.store.calibrationKeys==='object'?runtime.store.calibrationKeys:{}}
function renderCalibration(){const keys=calibrationKeys();const count=calibrationTargets.filter(t=>keys[t]).length;runtime.$('calibrationProgress').textContent='登録済み '+count+' / '+calibrationTargets.length;runtime.$('calibrationTarget').textContent=runtime.calibrationActive&&runtime.calibrationIndex<calibrationTargets.length?'次は '+calibrationName(calibrationTargets[runtime.calibrationIndex])+' を1回押す':count===calibrationTargets.length?'全エリアの登録完了':'開始すると押す場所が表示されます';runtime.$('calibrationStart').textContent=runtime.calibrationActive?'登録中（押し直し不要）':'最初に1回だけ押す';runtime.$('calibrationStop').disabled=!runtime.calibrationActive;runtime.$('calibrationBack').disabled=runtime.calibrationLastIndex<0;runtime.$('calibrationSkip').disabled=!runtime.calibrationActive;runtime.$('calibrationExport').disabled=count===0}
function calibrationAdvance(){const keys=calibrationKeys();while(runtime.calibrationIndex<calibrationTargets.length&&keys[calibrationTargets[runtime.calibrationIndex]])runtime.calibrationIndex++;if(runtime.calibrationIndex>=calibrationTargets.length){runtime.calibrationActive=false;runtime.store.calibrationCompletedAt=new Date().toISOString();runtime.persist();runtime.$('calibrationStatus').textContent='登録完了・自動保存済み！ 対応表のバックアップも保存できます。'}renderCalibration()}
function receiveCalibration(k){if(!runtime.calibrationActive)return false;if(Date.now()-runtime.calibrationLastAt<350)return true;const target=calibrationTargets[runtime.calibrationIndex];if(!target){runtime.calibrationActive=false;renderCalibration();return true}const keys=calibrationKeys();const duplicate=Object.entries(keys).find(([t,key])=>t!==target&&key===k);if(duplicate){runtime.$('calibrationStatus').textContent='同じ信号を検出しました。'+calibrationName(target)+' をもう一度押してください（開始し直す必要はありません）';renderCalibration();return true}const previous=runtime.store.bindings[k];const segment=calibrationSegment(target);if(previous&&previous!==segment){runtime.$('calibrationStatus').textContent='既存の割当と異なる信号です。'+calibrationName(target)+' をもう一度押すか、スキップしてください';renderCalibration();return true}runtime.store.calibrationKeys={...keys,[target]:k};runtime.store.bindings[k]=segment;runtime.store.calibrationCompletedAt=null;runtime.calibrationLastIndex=runtime.calibrationIndex;runtime.calibrationLastAt=Date.now();if(!runtime.persist()){runtime.calibrationActive=false;renderCalibration();return}runtime.$('calibrationStatus').textContent=calibrationName(target)+' → '+k+' を保存しました';runtime.calibrationIndex++;calibrationAdvance();return true}
function rawSave(){try{localStorage.setItem('dtl-200s-raw-v1',JSON.stringify(rawData));return true}catch(_){runtime.$('rawStatus').textContent='保存失敗。JSONを書き出してください';return false}}
function rawRender(){const n=rawData.cursor;runtime.$('rawProgress').textContent=n+' / 82 エリア記録済み'+(rawRunning?' · 記録中':'');runtime.$('rawTarget').textContent=n>=82?'82か所の記録完了':rawRunning?'次は '+calibrationName(rawTargets[n])+' を1回押す':'記録開始を押してください';runtime.$('rawLog').textContent=rawData.steps.slice(-8).map(s=>calibrationName(s.target)+' : '+s.events.map(e=>e.code+' / '+e.key+(e.shift?' [Shift]':'')).join(' , ')).join('\n')||'記録なし';runtime.$('rawUndo').disabled=!rawData.steps.length;runtime.$('rawExport').disabled=!rawData.steps.length;runtime.$('rawSkip').disabled=!rawRunning}
function rawFinalize(){if(rawTimer){clearTimeout(rawTimer);rawTimer=null}const n=rawData.cursor;const step=rawData.steps[n];if(!step||!step.events.length)return;rawData.cursor=n+1;rawSave();if(rawData.cursor===82){rawRunning=false;runtime.$('rawStatus').textContent='全82か所の記録完了。JSONを保存してチャットに送ってください'}else runtime.$('rawStatus').textContent=calibrationName(step.target)+' の信号を記録しました';rawRender()}
function rawReceive(e){if(!rawRunning||rawData.cursor>=82)return false;const n=rawData.cursor;const now=Date.now();if(!rawData.steps[n]||rawData.steps[n].target!==rawTargets[n])rawData.steps[n]={target:rawTargets[n],events:[]};const step=rawData.steps[n];step.events.push({code:e.code,key:e.key,shift:e.shiftKey,ctrl:e.ctrlKey,alt:e.altKey,meta:e.metaKey,repeat:e.repeat,time:now});rawLastEvent=now;rawSave();if(rawTimer)clearTimeout(rawTimer);rawTimer=setTimeout(rawFinalize,800);runtime.$('rawStatus').textContent='信号を受信：'+e.code+' / '+e.key+'（次へ自動進行します）';rawRender();return true}
function specialSave(){try{localStorage.setItem('dtl-200s-buttons-v1',JSON.stringify(specialData))}catch(_){}}
function specialRender(){runtime.$('specialLog').textContent=['START','CHANGE'].map(k=>k+': '+(specialData[k].length?specialData[k].map(e=>e.code+' / '+e.key).join(', '):'未記録')).join('\n')}
function specialBegin(k){rawRunning=false;runtime.calibrationActive=false;specialMode=k;specialData[k]=[];if(specialTimer)clearTimeout(specialTimer);runtime.$('specialStatus').textContent=k+'を本体で1回押してください';specialRender()}
function specialReceive(e){if(!specialMode)return false;const k=specialMode;specialData[k].push({code:e.code,key:e.key,shift:e.shiftKey,repeat:e.repeat,time:Date.now()});specialSave();if(specialTimer)clearTimeout(specialTimer);specialTimer=setTimeout(()=>{specialMode=null;runtime.$('specialStatus').textContent=k+'を保存しました。次のボタンへ進めます';specialRender()},900);runtime.$('specialStatus').textContent=k+' の信号を受信';specialRender();return true}
function board200sStatus(message){const el=runtime.$('board200sStatus');if(el)el.textContent=message}
function board200sInput(e){
 if(!board200sEnabled)return false;
 if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return false;
 if(e.ctrlKey||e.altKey||e.metaKey||e.repeat)return false;
 const k=keyName(e),now=Date.now();
 if(e.code==='Tab'&&!e.shiftKey){e.preventDefault();if(!runtime.$('play').classList.contains('active'))runtime.changeTab('play');if(runtime.store.active.darts.length===24){board200sStatus('START：結果確定');runtime.confirmResult()}else if(runtime.store.active.darts.length===0){board200sStatus('START：投球待機');runtime.toast('READY TO THROW')}else{board200sStatus('START：ゲーム進行中（リセットなし）')}return true}
 if(e.code==='Enter'&&!e.shiftKey){e.preventDefault();if(!runtime.$('play').classList.contains('active'))runtime.changeTab('play');if(runtime.roundBreakUntil>Date.now()){runtime.finishRoundBreak();board200sStatus('CHANGE：次のラウンドへ');runtime.toast('NEXT ROUND — READY')}else if(runtime.store.active.darts.length===24){board200sStatus('CHANGE：ゲーム終了（結果確認）');runtime.toast('GAME COMPLETE — 結果を確認してください')}else if(runtime.store.active.darts.length%3===0&&runtime.store.active.darts.length>0){board200sStatus('CHANGE：次のラウンド待機中');runtime.toast('NEXT ROUND — READY')}else{board200sStatus('CHANGE：3投完了後に使用できます')}return true}
 if(['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code))return false;
 const zone=board200sMap[k];if(!zone)return false;const segment=zone.startsWith('S')?zone.slice(0,-1):zone;
 e.preventDefault();
 if(!runtime.$('play').classList.contains('active'))runtime.changeTab('play');
 if(k===board200sLastKey&&now-board200sLastAt<180)return true;
 if(now-board200sLastAt<90)return true;
 board200sLastKey=k;board200sLastAt=now;
 if(runtime.roundBreakUntil>Date.now()){board200sStatus('ラウンド切替待ち：CHANGEで進めます');return true}
 if(runtime.store.active.darts.length>=24){board200sStatus('24投完了：STARTで結果確定');return true}
 runtime.add(segment,'board',zone);
 board200sStatus('受信：'+runtime.label(segment)+' / '+runtime.points(segment)+'点');
 return true;
}
function keyName(e){return e.code+' | '+e.key}
function editCalibrationAt(i){if(i<0||i>=calibrationTargets.length)return;const t=calibrationTargets[i],k=calibrationKeys()[t];if(k){delete runtime.store.calibrationKeys[t];if(!Object.entries(runtime.store.calibrationKeys).some(([other,key])=>key===k&&calibrationSegment(other)===calibrationSegment(t))&&runtime.store.bindings[k]===calibrationSegment(t))delete runtime.store.bindings[k]}runtime.store.calibrationCompletedAt=null;runtime.calibrationIndex=i;runtime.calibrationActive=true;runtime.persist();runtime.$('calibrationStatus').textContent=calibrationName(t)+' を再登録してください';renderCalibration()}
Object.assign(runtime,{calibrationKeys,renderCalibration,rawRender,specialRender});
function initialize(){
calibrationTargets=[...runtime.nums.flatMap(n=>['S'+n+'O','S'+n+'I','T'+n,'D'+n]),'OB','IB'];
rawRunning=false;
rawTimer=null;
rawLastEvent=0;
rawTargets=[...runtime.nums.flatMap(n=>['S'+n+'O','S'+n+'I','T'+n,'D'+n]),'OB','IB'];
rawData={format:'dtl-200s-raw-v1',steps:[],cursor:0};
try{const saved=JSON.parse(localStorage.getItem('dtl-200s-raw-v1'));if(saved&&Array.isArray(saved.steps)&&Number.isInteger(saved.cursor))rawData=saved}catch(_){}
rawData.cursor=Math.max(0,Math.min(82,rawData.cursor));
runtime.$('rawStart').onclick=()=>{runtime.calibrationActive=false;rawRunning=true;runtime.$('rawStatus').textContent='表示された場所を押してください。開始ボタンはもう押さなくて大丈夫です';rawRender()};
runtime.$('rawPause').onclick=()=>{rawRunning=false;if(rawTimer)rawFinalize();rawSave();runtime.$('rawStatus').textContent='一時停止・保存済み';rawRender()};
runtime.$('rawUndo').onclick=()=>{if(rawTimer){clearTimeout(rawTimer);rawTimer=null}const n=rawData.steps[rawData.cursor]?.events.length?rawData.cursor:Math.max(0,rawData.cursor-1);rawData.steps=rawData.steps.slice(0,n);rawData.cursor=n;rawRunning=true;rawSave();runtime.$('rawStatus').textContent='直前を消去しました。'+calibrationName(rawTargets[n])+' をもう一度押してください';rawRender()};
runtime.$('rawSkip').onclick=()=>{if(rawTimer){clearTimeout(rawTimer);rawTimer=null}rawData.steps[rawData.cursor]={target:rawTargets[rawData.cursor],events:[],skipped:true};rawData.cursor++;rawSave();if(rawData.cursor===82)rawRunning=false;runtime.$('rawStatus').textContent='スキップしました';rawRender()};
runtime.$('rawExport').onclick=()=>runtime.download(JSON.stringify({...rawData,exportedAt:new Date().toISOString()},null,2),'200s-raw-capture.json','application/json');
specialMode=null;
specialTimer=null;
specialData={format:'dtl-200s-buttons-v1',START:[],CHANGE:[]};
try{const x=JSON.parse(localStorage.getItem('dtl-200s-buttons-v1'));if(x&&Array.isArray(x.START)&&Array.isArray(x.CHANGE))specialData=x}catch(_){}
runtime.$('specialStart').onclick=()=>specialBegin('START');
runtime.$('specialChange').onclick=()=>specialBegin('CHANGE');
runtime.$('specialExport').onclick=()=>runtime.download(JSON.stringify(specialData,null,2),'200s-button-signals.json','application/json');
board200sMap={"KeyA | A":"S20O","KeyW | W":"S20I","Digit7 | &":"T20","KeyY | Y":"D20","KeyQ | Q":"S1O","KeyH | h":"S1I","Minus | -":"T1","KeyJ | J":"D1","KeyZ | Z":"S18O","KeyR | r":"S18I","Quote | \"":"T18","KeyT | t":"D18","Slash | /":"S4O","KeyM | M":"S4I","Digit2 | @":"T4","KeyK | K":"D4","Digit2 | 2":"S13O","Digit5 | %":"S13I","KeyQ | q":"T13","Digit6 | ^":"D13","Period | .":"S6O","KeyU | U":"S6I","Digit4 | 4":"T6","KeyV | V":"D6","Equal | =":"S10O","KeyM | m":"S10I","KeyA | a":"T10","KeyL | l":"D10","KeyH | H":"S15O","Digit4 | $":"S15I","KeyE | e":"T15","BracketLeft | [":"D15","KeyR | R":"S2O","Comma | <":"S2I","KeyD | d":"T2","Digit9 | 9":"D2","KeyI | I":"S17O","KeyF | f":"S17I","Digit1 | 1":"T17","Comma | ,":"D17","KeyD | D":"S3O","KeyI | i":"S3I","Semicolon | ;":"T3","KeyS | S":"D3","Digit8 | 8":"S19O","KeyC | c":"S19I","Equal | +":"T19","KeyB | B":"D19","KeyO | O":"S7O","KeyN | N":"S7I","Slash | ?":"T7","Digit3 | 3":"D7","Digit3 | #":"S16O","Minus | _":"S16I","Period | >":"T16","KeyB | b":"D16","KeyP | p":"S8O","KeyC | C":"S8I","Digit8 | *":"T8","KeyK | k":"D8","Backslash | \\":"S11O","Digit5 | 5":"S11I","Digit7 | 7":"T11","KeyT | T":"D11","KeyL | L":"S14O","Digit0 | 0":"S14I","Digit6 | 6":"T14","KeyS | s":"D14","KeyG | g":"S9O","KeyF | F":"S9I","KeyE | E":"T9","Semicolon | :":"D9","Quote | '":"S12O","KeyN | n":"S12I","KeyP | P":"T12","KeyX | X":"D12","Digit9 | (":"S5O","BracketRight | ]":"S5I","KeyJ | j":"T5","Digit1 | !":"D5","KeyG | G":"OB","KeyO | o":"IB"};
board200sEnabled=true;
board200sLastKey='';
board200sLastAt=0;
document.addEventListener('keydown',e=>{if(specialMode){e.preventDefault();specialReceive(e);return}if(rawRunning){e.preventDefault();rawReceive(e);return}if(board200sInput(e))return;if(e.ctrlKey||e.altKey||e.metaKey||e.repeat)return;if(['INPUT','SELECT','TEXTAREA'].includes(document.activeElement?.tagName))return;if(e.target?.closest?.('button')&&(e.key==='Enter'||e.key===' '))return;if(['Shift','Control','Alt','Meta','CapsLock'].includes(e.key)||['ShiftLeft','ShiftRight','ControlLeft','ControlRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code))return;let k=keyName(e);if(runtime.calibrationActive){e.preventDefault();receiveCalibration(k);return}runtime.lastKey=k;runtime.$('lastkey').textContent=k;runtime.keyLog.unshift(new Date().toLocaleTimeString('ja-JP')+'  '+k);runtime.keyLog=runtime.keyLog.slice(0,30);runtime.$('keylog').textContent=runtime.keyLog.join('\n');if(runtime.store.bindings[k]&&document.getElementById('play').classList.contains('active')){e.preventDefault();let now=Date.now();if(now-runtime.lastBoardEvent<250){runtime.toast('重複入力を防止しました');return}runtime.lastBoardEvent=now;runtime.add(runtime.store.bindings[k],'board')}});
}
function initializeControls(){
select=runtime.$('targetselect');
['OB','IB','MISS',...runtime.nums.flatMap(n=>['S'+n,'D'+n,'T'+n])].forEach(s=>{let o=document.createElement('option');o.value=s;o.textContent=runtime.label(s);select.appendChild(o)});
runtime.$('assignkey').onclick=()=>{if(!runtime.lastKey){alert('まず200Sからキーを受信してください');return}runtime.store.bindings[runtime.lastKey]=select.value;runtime.persist();runtime.render();alert(runtime.lastKey+' を '+runtime.label(select.value)+' に登録しました')};
runtime.$('clearbindings').onclick=()=>{if(confirm('登録済みキー割当を削除しますか？')){runtime.store.bindings={};runtime.persist();runtime.render()}};
runtime.$('calibrationStart').onclick=()=>{runtime.calibrationActive=true;runtime.calibrationIndex=0;runtime.calibrationLastIndex=-1,runtime.calibrationLastAt=0;calibrationAdvance();if(runtime.calibrationActive)runtime.$('calibrationStatus').textContent='ボードの指定位置を1回押してください'};
runtime.$('calibrationStop').onclick=()=>{runtime.calibrationActive=false;runtime.$('calibrationStatus').textContent='一時停止しました。登録データは保存されています';renderCalibration()};
runtime.$('calibrationSkip').onclick=()=>{if(!runtime.calibrationActive)return;runtime.calibrationIndex++;if(runtime.calibrationIndex>=calibrationTargets.length){runtime.calibrationActive=false;runtime.$('calibrationStatus').textContent='最後まで確認しました。未登録の場所は次回再開できます';renderCalibration();return}calibrationAdvance();if(runtime.calibrationActive)runtime.$('calibrationStatus').textContent='スキップしました。次の位置を押してください'};
runtime.$('calibrationBack').onclick=()=>editCalibrationAt(runtime.calibrationLastIndex);
runtime.$('calibrationEdit').onclick=()=>{const input=prompt('修正する登録番号（1〜82）を入力してください。1=S20外側、2=S20内側、3=T20、4=D20。');if(input===null)return;const i=Number(input)-1;if(!Number.isInteger(i)||i<0||i>=calibrationTargets.length){alert('1〜82の番号を入力してください');return}if(!confirm(calibrationName(calibrationTargets[i])+' を修正しますか？'))return;editCalibrationAt(i)};
runtime.$('calibrationExport').onclick=()=>runtime.download(JSON.stringify({format:'dtl-200s-calibration-v1',completedAt:runtime.store.calibrationCompletedAt||null,calibrationKeys:calibrationKeys(),bindings:runtime.store.bindings},null,2),'200s-keymap-backup.json','application/json');
runtime.$('board200sToggle').onchange=e=>{board200sEnabled=e.target.checked;board200sStatus(board200sEnabled?'200S自動得点 ON':'200S自動得点 OFF')};
}
return {initialize,initializeControls};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectInput=connectInput;
})();

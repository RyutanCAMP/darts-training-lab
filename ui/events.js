// ui/events: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectEvents(runtime){

function initializeGame(){
runtime.$('aimSelect').innerHTML='<option value="BULL">BULL（ブル）</option><optgroup label="TRIPLE">'+runtime.AIMS.filter(x=>x[0]==='T').map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</optgroup><optgroup label="DOUBLE">'+runtime.AIMS.filter(x=>x[0]==='D').map(x=>'<option value="'+x+'">'+x+'</option>').join('')+'</optgroup>';
runtime.$('aimSelect').onchange=e=>{const v=e.target.value;if(!runtime.validAim(v))return;runtime.store.aimTarget=v;runtime.persist();runtime.profTouch();runtime.render();runtime.closeSheets()};
runtime.$('aimChip').onclick=()=>runtime.openSheet('aimSheet');
runtime.$('miss').onclick=()=>runtime.add('MISS');
runtime.$('undo').onclick=runtime.undo;
runtime.$('newgame').onclick=runtime.startNew;
runtime.$('startdash').onclick=()=>{runtime.changeTab('play')};
runtime.$('endgame').onclick=runtime.finishEarly;
runtime.$('saveResult').onclick=runtime.confirmResult;
}
function initializeSettings(){
document.querySelectorAll('[data-delay]').forEach(b=>b.onclick=()=>{runtime.store.roundDelay=Number(b.dataset.delay);runtime.persist();runtime.render()});
runtime.$('soundToggle').onclick=()=>{runtime.store.soundEnabled=runtime.store.soundEnabled===false;runtime.persist();runtime.render();if(runtime.store.soundEnabled)runtime.playSound('bull')};
document.querySelectorAll('[data-sound-volume]').forEach(input=>{const k=input.dataset.soundVolume;input.value=Math.round(runtime.soundLevel(k)*100);const out=runtime.$(k+'VolumeValue');if(out)out.textContent=input.value+'%';input.oninput=()=>{runtime.store.soundVolumes={...(runtime.store.soundVolumes||{}),[k]:Number(input.value)};if(out)out.textContent=input.value+'%';runtime.persist()}});
}
function initializeNavigation(){
document.querySelectorAll('[data-sound-test]').forEach(b=>b.onclick=()=>runtime.testAudio(b.dataset.soundTest));
runtime.$('soundTest').onclick=()=>runtime.testAudio('inner');
runtime.$('skipRoundBreak').onclick=runtime.finishRoundBreak;
runtime.$('backFromSettings').onclick=()=>runtime.changeTab('play');
runtime.$('againFromHistory').onclick=()=>runtime.changeTab('play');
runtime.$('analyseFromHistory').onclick=()=>runtime.changeTab('analysis');
}
return {initializeGame,initializeSettings,initializeNavigation};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectEvents=connectEvents;
})();

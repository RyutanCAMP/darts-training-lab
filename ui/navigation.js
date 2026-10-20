// ui/navigation: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectNavigation(runtime){
function toast(s,type=''){const t=runtime.$('toast');t.textContent=s;t.classList.remove('award','bull','miss');if(type)t.classList.add(type)}
function changeTab(name){try{runtime.closeSheets()}catch(_){}runtime.cancelAchievementDelay();runtime.finishRoundBreak();if(name==='analysis'){runtime.aimPeriod='10';runtime.analysisAim=null;runtime.reportOn=false}if(name!=='history')runtime.justSaved=false;document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id===name));document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===name));runtime.render()}
Object.assign(runtime,{toast,changeTab});
function initialize(){
document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>changeTab(b.dataset.tab));
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectNavigation=connectNavigation;
})();

// core/state: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectState(runtime){

function initialize(){
runtime.$=id=>document.getElementById(id);
runtime.KEY='dtl-data-v1';
runtime.nums=[20,1,18,4,13,6,10,15,2,17,3,19,7,16,8,11,14,9,12,5];
runtime.audioCtx=null;
runtime.store={schemaVersion:1,sessions:[],active:null,bindings:{},roundDelay:8,soundEnabled:true};
runtime.lastKey=null;
runtime.keyLog=[];
runtime.calibrationActive=false;
runtime.calibrationIndex=0;
runtime.calibrationLastIndex=-1;
runtime.calibrationLastAt=0;
runtime.viewId=null;
runtime.showResult=false;
runtime.lastBoardEvent=0;
runtime.roundBreakTimer=null;
runtime.roundBreakUntil=0;
runtime.saveOK=null;
runtime.savedAt=null;
runtime.justSaved=false;
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectState=connectState;
})();

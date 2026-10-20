// Feature scripts register factories before this deferred entry point runs.
(()=>{'use strict';
const {connectState,connectLocalStorage,connectCloud,connectMyDarts,connectCatalog,connectRules,connectSound,connectEffects,connectRounds,connectNavigation,connectBoard,connectCountup,connectOverview,connectAim,connectRoundStorage,connectPeriod,connectAdvanced,connectReport,connectHelp,connectRender,connectBackup,connectEvents,connectInput}=globalThis.RETRO_DARTS_MODULES;
delete globalThis.RETRO_DARTS_MODULES;

try{if(!/[?&]dev=1\b/.test(location.search))document.documentElement.classList.add('no-dev')}catch(e){}

// One private context connects features; no application state is put on window.
const runtime=Object.create(null);

// Register every function before running any state reads or event wiring.
const features={
 state: connectState(runtime),
 localStorage: connectLocalStorage(runtime),
 cloud: connectCloud(runtime),
 myDarts: connectMyDarts(runtime),
 catalog: connectCatalog(runtime),
 rules: connectRules(runtime),
 sound: connectSound(runtime),
 effects: connectEffects(runtime),
 rounds: connectRounds(runtime),
 navigation: connectNavigation(runtime),
 board: connectBoard(runtime),
 countup: connectCountup(runtime),
 overview: connectOverview(runtime),
 aim: connectAim(runtime),
 roundStorage: connectRoundStorage(runtime),
 period: connectPeriod(runtime),
 advanced: connectAdvanced(runtime),
 report: connectReport(runtime),
 help: connectHelp(runtime),
 render: connectRender(runtime),
 backup: connectBackup(runtime),
 events: connectEvents(runtime),
 input: connectInput(runtime)
};

// Preserve the original initialization order, including localStorage recovery.
features.state.initialize();
features.localStorage.initialize();
features.cloud.initializeState();
features.myDarts.initialize();
features.catalog.initialize();
features.rules.initialize();
features.sound.initialize();
features.effects.initialize();
features.rounds.initialize();
features.navigation.initialize();
features.countup.initialize();
features.aim.initialize();
features.roundStorage.initialize();
features.period.initialize();
features.advanced.initialize();
features.report.initialize();
features.help.initialize();
features.backup.initialize();
features.events.initializeGame();
features.input.initialize();
features.events.initializeSettings();
features.events.initializeNavigation();
features.input.initializeControls();
features.cloud.initializeConfig();

try{navigator.storage&&navigator.storage.persist&&navigator.storage.persist()}catch(_){}
runtime.setupMyDarts();
runtime.loadCatalog();
runtime.setupCloud();
runtime.setupRecovery();
runtime.drawBoard();
runtime.render();
runtime.renderCalibration();
runtime.rawRender();
runtime.specialRender();
})();

// ui/help: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectHelp(runtime){
let HELP,HELP_EXAMPLES,ANALYSIS_GROUPS,HELP_CARDS,helpOpen;
function arrangeAnalysis(){const metrics=runtime.$('metrics');if(!metrics||runtime.$('analysisGroups'))return;const root=document.createElement('div');root.id='analysisGroups';root.style.cssText='display:grid;gap:14px;margin-top:16px';metrics.after(root);ANALYSIS_GROUPS.forEach(([title,keys],i)=>{const section=document.createElement('details');section.open=i<2;section.style.cssText='border:1px solid #31414B;border-radius:12px;padding:12px;background:#15212B';const summary=document.createElement('summary');summary.style.cssText='cursor:pointer;font-weight:bold;padding:8px 2px';summary.textContent=(i+1)+'. '+title;const body=document.createElement('div');body.style.cssText='display:grid;gap:12px;margin-top:12px';keys.forEach(key=>{const entry=HELP_CARDS.find(x=>x[0]===key);if(!entry)return;const target=runtime.$(entry[1]);const panel=target&&target.closest('.panel');if(panel)body.appendChild(panel)});section.append(summary,body);root.appendChild(section)})}
function setupHelp(){
 arrangeAnalysis();
 const row=document.createElement('div');row.className='period-help-row';row.innerHTML=runtime.helpBtn('period','inline')+'<span class="tiny muted">期間の見方</span>';
 runtime.$('analysisScope').after(row);row.insertAdjacentHTML('afterend',runtime.helpBox('period',true));
 for(const [key,id] of HELP_CARDS){const h=runtime.$(id).closest('.panel').querySelector('h3');h.classList.add('has-help');h.insertAdjacentHTML('beforeend',runtime.helpBtn(key));h.insertAdjacentHTML('afterend','<p class="card-gloss">'+HELP[key][0]+'</p>'+runtime.helpBox(key))}
}
function initialize(){
HELP={
 period:['どの範囲の投げ方を分析するかを選びます。','10R＝直近10ラウンド（30投）。1Rは直近の1ラウンド、ALLはすべて。「全期間」と書かれたカード以外は、この選択に合わせて変わります。','途中のラウンド（3投そろっていない）は数えません。'],
 'm-bull':['投げた中で、ブルに入った割合です。','数字が大きいほど入っています。▲▼は、直前の同じ長さの期間との差です。','ALLでは差は出ません。'],
 'm-hits':['ブル（外側・中心どちらも）に入った回数です。','回数が増えるほど、安定して狙えています。','投数が少ない時は、偶然で上下します。'],
 'm-inner':['中心（INNER BULL・50点）に入った回数です。','ブルの中でも、より中心に近く入れられているかが分かります。狙いがブル以外のときは、1投の平均点を表示します。','投数が少ない時は、偶然で上下します。'],
 'm-best':['完走したゲームの最高得点です。','自己ベストの目安として見ます。','全期間の数字で、途中終了は含みません。'],
 focus:['今日、いちばん先に意識する1点です。','数字から選んだ「試すこと」を1つ出します。下の INSIGHT の NEXT と同じ内容です。','可能性にもとづく提案で、断定ではありません。投数が少ないうちは偶然のこともあります。'],
 insight:['今の期間で、数字から言えることを最大3つ並べます。','FACT は確認できた事実です。NEXT を開くと、考えられる原因と試すことが出ます。','NEXT は断定ではなく可能性です。データが少ないうちは偶然のこともあります。'],
 aim:['どこに多く入っているかを、ボードの色の濃さで見ます。','明るいほど多く入った場所です。黄色い丸は、入った場所の中央値の目安です。','実際の着弾位置ではなく、入ったセグメントからの推定です。MISSと内外が不明な記録は除き、件数を表示します。'],
 allbull:['1投目・2投目・3投目のうち、どれが入りやすいかです。','数字はブル率。括弧の中は 入った数/投数 です。','投数が少ないと差は参考です。'],
 trend:['ゲームごとの得点の流れです。','黄色が各ゲームの得点、水色が直近10ゲームの平均です。水色が右上がりなら、上達の傾向です。','期間の選択には連動しません。直近20ゲームまでを表示します。'],
 achievements:['これまでの記録の累計です。','HAT TRICK＝3投ともブル、TON 80＝3投ともT20、HIGH TON＝1ラウンド151〜179点の回数です。','完走したゲームだけを数えます（全期間）。'],
 report:['今の期間の数字を、文章にまとめます。','ボタンを押すと表示されます。期間を変えると書き換わります。','ルールによる自動生成で、AIモデルではありません。'],
 throw:['何投目が一番入っているかを比べます。','大きい数字がブル率。RANGE は95%の幅で、幅が重なる間は差が偶然かもしれません。CLEAR DIFF は幅が重ならず、差が出ている目安です。','IB＝ブルのうち中心の数、AVG＝1投の平均点です。'],
 drift:['投球順ごとに、どちらへ偏っているかを見ます。','矢印は向き、OFFSET は中心からのズレ（0＝中心、1＝ボードの端）、SPREAD は散らばりです。SPREAD が小さいほどまとまっています。','狙いは設定した狙い（初めはブル）から見たズレです。'],
 direction:['ブル以外に入った時、どの向きに多いかです。','割合が大きい向きほど、そちらへ外れやすい目安です。','狙いから見た向きです（狙いは設定で変更できます）。'],
 consistency:['どれだけ同じ場所にまとまっているかです。','CLUSTER は中央値の近くに入った割合で、高いほどまとまっています。SPREAD は小さいほど安定です。','MISSと内外が不明な記録は除きます。'],
 after:['ブルや外れた直後の1投が、どうなるかです。','ブルの後、外れた後、それぞれの次の1投のブル率を比べます。外れた後に下がるなら、切り替えが課題かもしれません。','同じラウンド内の流れだけを見ます。'],
 bulltrend:['期間の前半と後半で、ブル率が変わったかです。','大きい数字が後半、PREV が前半です。後半が高ければ、調子が上がっています。','期間が短いと偶然で動きます。'],
 rounds:['何ラウンド目に入りやすいかです。','R1〜R8 のブル率。高いラウンドが得意、低いラウンドは崩れやすい目安です。','ラウンドごとの投数が少ないと参考です。'],
 roundscore:['ラウンドごとの平均点です。','HALF は前半（R1–4）と後半（R5–8）の比較、DISTRIBUTION は得点の分布です。','薄い行は3ラウンド未満で、参考です。'],
 breakdown:['得点が、どこから来ているかです。','ブル・トリプル・ダブル・シングル・MISSのうち、点を稼いでいる場所が分かります。','右は得点の割合と投数です。'],
 pace:['投げる速さと、ブル率の関係です。','投球間隔の中央値と、速い時・遅い時のブル率を比べます。','120秒を超える間隔は除きます。'],
 streak:['ブルが連続した最大の回数です。','数字が大きいほど、波に乗れた場面があったことを示します。','選んだ期間の中での記録です。'],
 goal:['目標点と、今の実力の差です。','直近10ゲームの平均・SD・最高点を出します。SD は得点のばらつきで、小さいほど安定です。TOP は直近ゲームの順位です。','GOAL に目標点を入れると差を表示します。'],
 bestavg:['最高のゲームと平均の差を、ラウンドごとに見ます。','棒が平均、黄色い線がベスト、右の数字が差です。差が大きいラウンドが伸びしろです。','全期間のゲームが対象です。'],
 conditions:['いつ投げると調子が良いかです。','時間帯と、その日の何ゲーム目かで、平均点を比べます。G はゲーム数です。','3ゲーム未満の行は薄く表示し、参考です。'],
 log:['練習の量と続け方です。','濃いほど投数が多い日。DAYS＝直近28日の練習日数、STREAK＝連続日数、THIS WEEK＝今週の投数です。','直近35日を表示します。']
};
HELP_EXAMPLES={"focus":"最初にここを見て、今日意識することを1つ決めましょう。","insight":"FACTは記録上の事実、NEXTは次に試す練習です。","aim":"明るい場所ほど多く入った位置。正確な着弾座標ではなく推定です。","allbull":"例：1投目40%、2投目25%なら、今回の記録では1投目の方がBULL率が高い結果です。","trend":"黄色が各ゲーム、水色が直近10ゲーム平均。水色が上向きなら平均点が伸びています。","achievements":"HAT TRICK 5回なら、3投連続BULLのラウンドが累計5回です。","report":"まず全体を文章で読み、気になる項目の詳しい分析を確認しましょう。","throw":"RANGEは数値の不確かさの目安。幅が重なる場合は差を断定できません。","drift":"OFFSETは狙いからのズレ、SPREADは散らばり。小さいほど狙いに近い・まとまる傾向です。","direction":"例：右40%なら、外れた投球が右に多い傾向です。","consistency":"CLUSTERはまとまり具合、SPREADは散らばり。まとまっていても狙いから外れる場合があります。","after":"例：BULL後40%、外した後20%なら、直前の結果で次のBULL率に差がある記録です。","bulltrend":"例：前半30%、後半40%なら、後半のBULL率が10ポイント高い記録です。","rounds":"例：R1が45%、R8が25%なら、終盤に下がる傾向が続くか確認しましょう。","roundscore":"前半R1〜4と後半R5〜8の平均点を比較し、どこで得点が変わるか確認します。","breakdown":"例：BULLが70%なら、得点の70%をBULLで稼いでいます。","pace":"例：MEDIAN 3.2秒、FAST 40%、SLOW 25%なら、今回は比較的速い投球間隔でBULL率が高い記録です。投球の入力時刻差を使い、6区間以上で表示します。","streak":"BEST STREAK 4なら、BULLが4投連続した記録です。","goal":"目標600点、平均520点なら平均ではあと80点。SDは得点のばらつきで小さいほど安定です。","bestavg":"最高と平均の差が大きいラウンドは、良い時と普段の差が大きい場所です。","conditions":"Gはゲーム数。少ないゲーム数の平均は偶然で上下しやすいです。","log":"色が濃いほど投数が多い日。練習量と継続状況を振り返れます。"};
ANALYSIS_GROUPS=[["今の実力と次の一手",["focus","insight","goal","report"]],["上達の変化",["trend","bulltrend","bestavg"]],["着弾の傾向",["aim","direction","consistency","drift"]],["投げ方のクセ",["allbull","throw","pace","after","streak"]],["ラウンドと得点",["rounds","roundscore","breakdown"]],["練習の振り返り",["conditions","log","achievements"]]];
HELP_CARDS=[['focus','focusBody'],['insight','insightBody'],['aim','aimAnalysis'],['allbull','allbull'],['trend','analysischart'],['achievements','achievementTotals'],['throw','advancedThrowOrder'],['drift','advancedDrift'],['direction','advancedDirection'],['consistency','advancedConsistency'],['after','advancedAfter'],['bulltrend','advancedBullTrend'],['rounds','advancedRounds'],['roundscore','advancedRoundScore'],['breakdown','advancedBreakdown'],['pace','advancedPace'],['streak','advancedStreak'],['goal','advancedGoalBody'],['bestavg','advancedBestVsAvg'],['conditions','advancedConditions'],['log','advancedLog'],['report','reportBody']];
helpOpen=new Set();
runtime.helpBtn=(key,cls='')=>'<button type="button" class="help-btn '+cls+'" data-help="'+key+'" aria-expanded="'+helpOpen.has(key)+'" aria-label="見方を開く"><span>?</span></button>';
runtime.helpBox=(key,withWhat)=>{const h=HELP[key]||['','',''],example=HELP_EXAMPLES[key];return '<div class="card-help'+(helpOpen.has(key)?'':' hidden')+'" data-help-for="'+key+'"><p><b>何がわかる？</b> '+h[0]+'</p><p><b>数字の見方</b> '+h[1]+'</p>'+(example?'<p><b>具体例・活用方法</b> '+example+'</p>':'')+'<p><b>注意点</b> '+h[2]+'</p></div>'};
document.addEventListener('click',e=>{
 const b=e.target.closest('[data-help]');if(!b)return;
 const k=b.dataset.help,on=!helpOpen.has(k);on?helpOpen.add(k):helpOpen.delete(k);
 document.querySelectorAll('[data-help="'+k+'"]').forEach(x=>x.setAttribute('aria-expanded',String(on)));
 document.querySelectorAll('[data-help-for="'+k+'"]').forEach(x=>x.classList.toggle('hidden',!on));
});
setupHelp();
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectHelp=connectHelp;
})();

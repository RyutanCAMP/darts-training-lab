// ui/catalog: existing behavior extracted from app.js.
// Register functions first; app.js runs initializers in the original order.
(()=>{'use strict';
function connectCatalog(runtime){
let BARREL_CATALOG,catalogState,CATALOG_URLS,CATALOG_CHECK;
function cleanCatalog(doc){const list=doc&&Array.isArray(doc.barrels)?doc.barrels:[];const n=v=>typeof v==='number'&&isFinite(v)?v:null,t=(v,m)=>typeof v==='string'?v.slice(0,m):null;return list.filter(x=>x&&typeof x.brand==='string'&&typeof x.name==='string').slice(0,3000).map(x=>({brand:x.brand.slice(0,40),name:x.name.slice(0,80),player:t(x.player,60),year:n(x.year),release:t(x.release,10),weight:n(x.weight),material:n(x.material),length:n(x.length),diameter:n(x.diameter),shape:t(x.shape,20)||'その他・不明',color:t(x.color,20)||'未指定',note:t(x.note,300)||'',url:typeof x.url==='string'&&/^https:\/\//.test(x.url)?x.url:'',verified:t(x.verified,20)||''}))}
async function loadCatalog(){for(const u of CATALOG_URLS){try{const r=await fetch(u,{cache:'no-cache'});if(!r.ok)continue;const c=cleanCatalog(await r.json());if(c.length){BARREL_CATALOG=c;catalogState='ok';break}}catch(_){}}if(catalogState!=='ok')catalogState='error';try{catalogSearch()}catch(_){}}
function catalogSpec(value,unit=''){return value===null||value===undefined||value===''?'未確認':String(value)+unit}
function catalogSearch(){const brand=runtime.brandFilterOn?runtime.$('myBarrelBrand').value:'未指定',q=runtime.$('myModelSearch').value.trim().toLowerCase(),list=runtime.$('myModelResults');if(catalogState!=='ok'){list.innerHTML='<p class="tiny muted">'+(catalogState==='loading'?'カタログを読み込み中…':'カタログを読み込めませんでした。モデル名は自由入力できます。')+'</p>';return}const hits=BARREL_CATALOG.filter(x=>(brand==='未指定'||brand==='その他'||x.brand===brand)&&(!q||[x.name,x.brand,x.player||'',x.year??''].join(' ').toLowerCase().includes(q)));list.innerHTML='<p class="tiny muted">'+hits.length+'件 / 全'+BARREL_CATALOG.length+'モデル</p>'+hits.map(x=>'<button type="button" data-catalog-index="'+BARREL_CATALOG.indexOf(x)+'" style="text-align:left;padding:10px;border:1px solid #31414B;border-radius:9px;background:#1C2A33;color:#E3E8EA"><b>'+runtime.esc(x.name)+'</b><br><small>'+runtime.esc(x.brand)+' · '+catalogSpec(x.year,'年')+' · '+catalogSpec(x.weight,'g')+' · '+catalogSpec(x.material,'% タングステン')+'</small></button>').join('');if(!hits.length)list.innerHTML+='<p class="tiny muted">候補がありません。メーカーを「未指定」にするか自由入力してください。</p>'}
function chooseCatalog(index){const x=BARREL_CATALOG[index];if(!x)return;runtime.$('myBarrelBrand').value=x.brand;runtime.$('myBarrelModel').value=x.name;if(!runtime.$('mySetupName').value.trim())runtime.$('mySetupName').value=String(x.name).slice(0,40);runtime.$('myBarrelWeight').value=x.weight??'';runtime.$('myBarrelShape').value=x.shape||'その他・不明';runtime.$('myBarrelColor').value=x.color||'未指定';runtime.$('myModelInfo').innerHTML='<b>'+runtime.esc(x.name)+'</b>（'+(x.release?runtime.esc(x.release.replace(/-/g,'/'))+' 発売':catalogSpec(x.year,'年'))+'）'+(x.player?'<br>'+runtime.esc(x.player):'')+'<br>タングステン：'+catalogSpec(x.material,'%')+' ／ 重量：'+catalogSpec(x.weight,'g')+' ／ 全長：'+catalogSpec(x.length,'mm')+' ／ 最大径：'+catalogSpec(x.diameter,'mm')+(x.note?'<br>'+runtime.esc(x.note):'')+'<br><small>'+runtime.esc(CATALOG_CHECK[x.verified]||'確認状況不明')+'</small>'+(x.url?'<br><a href="'+runtime.esc(x.url)+'" target="_blank" rel="noopener noreferrer">公式の製品ページ ↗</a>':'');runtime.$('myModelSearch').value='';runtime.brandFilterOn=true;catalogSearch()}
Object.assign(runtime,{loadCatalog,catalogSearch,chooseCatalog});
function initialize(){
BARREL_CATALOG=[];
catalogState='loading';
CATALOG_URLS=['data/barrels.json','https://raw.githubusercontent.com/RyutanCAMP/darts-training-lab/main/data/barrels.json'];
CATALOG_CHECK={'spec+date':'公式ページで仕様・発売日を確認','spec':'公式ページで仕様を確認','partial':'公式ページで一部のみ確認','unconfirmed':'公式ページで未確認'};
runtime.brandFilterOn=true;
}
return {initialize};
}
const modules=globalThis.RETRO_DARTS_MODULES||(globalThis.RETRO_DARTS_MODULES=Object.create(null));
modules.connectCatalog=connectCatalog;
})();

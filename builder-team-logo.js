/* V161: Fast cached team logo preview with a subtle fade-in. */
(()=>{'use strict';
const teamSelect=document.getElementById('builderTeam');
const display=document.getElementById('builderTeamLogo');
const image=document.getElementById('builderTeamLogoImage');
if(!teamSelect||!display||!image)return;
let current='',request=0,awaitingTeamSelection=false;
const cache=new Map();
const bundled={'buffalo sabres':'buffalo-sabres.png','los angeles kings':'los-angeles-kings.png','university of wisconsin badgers':'wisconsin-badgers.png','wisconsin badgers':'wisconsin-badgers.png','vancouver warriors':'vancouver-warriors.png'};
const normalize=t=>String(t||'').trim().toLowerCase();
const safeName=t=>String(t||'').replace(/[^a-z0-9]/gi,'');
async function pdfImage(data){
 if(!window.pdfjsLib)return null;
 const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
 const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
 try{const page=await pdf.getPage(1),base=page.getViewport({scale:1});const vp=page.getViewport({scale:Math.min(2,600/Math.max(base.width,base.height))});const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;return c.toDataURL('image/png')}finally{await pdf.destroy()}
}
function hide(){display.classList.remove('logo-ready');image.hidden=true;display.hidden=true;image.removeAttribute('src');}
function show(source,token){
 if(token!==request||awaitingTeamSelection||!source)return;
 image.onload=()=>{if(token!==request||awaitingTeamSelection)return;image.hidden=false;display.hidden=false;display.classList.remove('logo-ready');requestAnimationFrame(()=>requestAnimationFrame(()=>{if(token===request)display.classList.add('logo-ready')}));};
 image.onerror=()=>{if(token===request)hide()};
 image.src=source;
 if(image.complete&&image.naturalWidth)image.onload();
}
const pwhlNames={
 'boston fleet':['BostonFleet','Boston_Fleet','Fleet'],
 'minnesota frost':['MinnesotaFrost','Minnesota_Frost','Frost'],
 'montreal victoire':['MontrealVictoire','MontréalVictoire','Montreal_Victoire','Victoire'],
 'new york sirens':['NewYorkSirens','New_York_Sirens','Sirens'],
 'ottawa charge':['OttawaCharge','Ottawa_Charge','Charge'],
 'toronto sceptres':['TorontoSceptres','Toronto_Sceptres','Sceptres'],
 'vancouver goldeneyes':['VancouverGoldeneyes','Vancouver_Goldeneyes','Goldeneyes'],
 'seattle torrent':['SeattleTorrent','Seattle_Torrent','Torrent'],
 'pwhl detroit':['PWHLDetroit','Detroit'],
 'pwhl hamilton':['PWHLHamilton','Hamilton'],
 'pwhl las vegas':['PWHLLasVegas','LasVegas'],
 'pwhl san jose':['PWHLSanJose','SanJose']
};
function logoCandidates(team){
 const original=String(team||'').trim();
 const ascii=original.normalize('NFD').replace(/[\u0300-\u036f]/g,'');
 const names=[safeName(original),safeName(ascii),ascii.replace(/\s+/g,'_'),ascii.replace(/\s+/g,'-'),original,ascii,...(pwhlNames[normalize(ascii)]||[])];
 return [...new Set(names.filter(Boolean))];
}
async function loadLogo(team){
 const key=normalize(team),local=(window.RinkboardBCHLLogos||{})[safeName(team).toLowerCase()]||bundled[key]||(/wisconsin.*badgers|badgers.*wisconsin/.test(key)?'wisconsin-badgers.png':null)||(/vancouver.*warriors/.test(key)?'vancouver-warriors.png':null);
 if(local)return local;
 const api=window.RinkboardBandDropbox;
 if(!api||typeof api.downloadLogo!=='function')return null;
 // PWHL files may use accented/unaccented, spaced, underscored or shortened names.
 // Check common spellings in parallel; keep SVG and other vector assets preferred.
 const names=logoCandidates(team),exts=['svg','png','webp','pdf'];
 const requests=[];
 for(const name of names)for(const ext of exts)requests.push({name,ext});
 // Avoid flooding Dropbox with requests when many logos are visible.
 for(let i=0;i<requests.length;i+=8){
  const batch=requests.slice(i,i+8);
  const results=await Promise.all(batch.map(async r=>({ext:r.ext,data:await api.downloadLogo(r.name+'.'+r.ext).catch(()=>null)})));
  for(const r of results){if(!r.data)continue;if(r.ext==='pdf'){try{return await pdfImage(r.data)}catch(e){continue}}return r.data;}
 }
 return null;
}
window.RinkboardTeamLogoLoader=loadLogo;
function refresh(){
 if(awaitingTeamSelection)return;
 const team=teamSelect.value.trim();if(team===current)return;current=team;const token=++request;
 image.onload=null;image.onerror=null;hide();
 if(!team||team==='__add__'||/^league[ -]?wide$/i.test(team))return;
 const key=normalize(team);
 if(!cache.has(key))cache.set(key,loadLogo(team).catch(()=>null));
 cache.get(key).then(source=>show(source,token));
}
function clearOnLeagueSwitch(){awaitingTeamSelection=true;current='';++request;image.onload=null;image.onerror=null;hide()}
teamSelect.addEventListener('change',()=>{awaitingTeamSelection=false;current='';refresh()});
document.getElementById('brandModeSelect')?.addEventListener('change',clearOnLeagueSwitch,true);
window.addEventListener('rinkboard-brand-changed',clearOnLeagueSwitch);
window.addEventListener('rinkboard-ncaa-division-changed',()=>{current='';refresh()});
setInterval(refresh,750);
refresh();
})();

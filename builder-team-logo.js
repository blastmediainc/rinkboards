/* V153: Team identity preview in Project Details. Read-only; never changes artwork. */
(()=>{'use strict';
const teamSelect=document.getElementById('builderTeam');
const display=document.getElementById('builderTeamLogo');
const image=document.getElementById('builderTeamLogoImage');
if(!teamSelect||!display||!image)return;
let current='',request=0;
const bundled={'buffalo sabres':'buffalo-sabres.png','los angeles kings':'los-angeles-kings.png','university of wisconsin badgers':'wisconsin-badgers.png','vancouver warriors':'vancouver-warriors.png'};
const normalize=t=>String(t||'').trim().toLowerCase();
const safeName=t=>String(t||'').replace(/[^a-z0-9]/gi,'');
async function pdfImage(data){
 if(!window.pdfjsLib)return null;
 const bytes=Uint8Array.from(atob(data.split(',')[1]),c=>c.charCodeAt(0));
 const pdf=await window.pdfjsLib.getDocument({data:bytes}).promise;
 try{const page=await pdf.getPage(1),base=page.getViewport({scale:1});const vp=page.getViewport({scale:Math.min(2,600/Math.max(base.width,base.height))});const c=document.createElement('canvas');c.width=Math.ceil(vp.width);c.height=Math.ceil(vp.height);await page.render({canvasContext:c.getContext('2d'),viewport:vp}).promise;return c.toDataURL('image/png')}finally{await pdf.destroy()}
}
async function refresh(){
 const team=teamSelect.value.trim();if(team===current)return;current=team;const token=++request;
 image.removeAttribute('src');image.hidden=true;display.hidden=true;const skip=!team||team==='__add__'||/^league[ -]?wide$/i.test(team);
 if(skip)return;
 let source=null;
 const api=window.RinkboardBandDropbox;
 if(api&&typeof api.downloadLogo==='function'){
  for(const ext of ['svg','png','webp','pdf']){
   try{const data=await api.downloadLogo(safeName(team)+'.'+ext);if(token!==request)return;source=ext==='pdf'?await pdfImage(data):data;if(source)break}catch(e){if(token!==request)return;}
  }
 }
 if(!source)source=(window.RinkboardBCHLLogos||{})[safeName(team).toLowerCase()]||bundled[normalize(team)]||null;
 if(token!==request)return;
 if(!source)return
 image.onload=()=>{if(token===request){image.hidden=false;display.hidden=false}};
 image.onerror=()=>{if(token===request){image.hidden=true;display.hidden=true}};
 image.src=source;
}
teamSelect.addEventListener('change',refresh);
window.addEventListener('rinkboard-brand-changed',()=>{current='';refresh()});
window.addEventListener('rinkboard-ncaa-division-changed',()=>{current='';refresh()});
// Projects opened from disk/Dropbox can set select.value without dispatching change.
setInterval(refresh,750);
refresh();
})();

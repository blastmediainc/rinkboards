/* Blast Media band generator — fixed 17 x 3.2222 inch packaging band. */
(()=>{'use strict';
const $=id=>document.getElementById(id), W=1224,H=232;
const BAND_FONT_FILE='FontsFree-Net-NeoSansBoldTR.ttf';
const BAND_FONT_FAMILY='Neo Sans Bold';
let bandFontBytesPromise=null,bandFontReadyPromise=null;
async function bandFontBytes(){
 if(!bandFontBytesPromise)bandFontBytesPromise=fetch(BAND_FONT_FILE).then(async response=>{
  if(!response.ok)throw Error('Neo Sans font not found. Upload '+BAND_FONT_FILE+' beside index.html on GitHub Pages.');
  const bytes=await response.arrayBuffer();
  if(bytes.byteLength<1000)throw Error('Neo Sans font file is invalid');
  return bytes;
 }).catch(error=>{bandFontBytesPromise=null;throw error});
 return bandFontBytesPromise;
}
async function ensureBandFont(){
 if(!bandFontReadyPromise)bandFontReadyPromise=(async()=>{
  const bytes=await bandFontBytes();
  const face=new FontFace(BAND_FONT_FAMILY,bytes,{style:'normal',weight:'700'});
  await face.load();document.fonts.add(face);
  return true;
 })().catch(error=>{bandFontReadyPromise=null;throw error});
 return bandFontReadyPromise;
}
function fontBytesBase64(bytes){
 const data=new Uint8Array(bytes);let result='';const chunk=8192;
 for(let i=0;i<data.length;i+=chunk)result+=String.fromCharCode.apply(null,data.subarray(i,i+chunk));
 return btoa(result);
}
async function registerBandPdfFont(doc){
 const bytes=await bandFontBytes();
 doc.addFileToVFS('NeoSansBoldTR.ttf',fontBytesBase64(bytes));
 doc.addFont('NeoSansBoldTR.ttf','NeoSansBand','bold');
 doc.setFont('NeoSansBand','bold');
}

let source='builder',selectedRecord=null,selectedBatch=[],board=null,team='',season='',size='',logoData='',logoFormat='',boardData='',boardSvg='';
const modal=document.createElement('div');modal.id='bandModal';modal.hidden=true;
modal.innerHTML=`<section class="bandPanel" role="dialog" aria-modal="true" aria-label="Packaging band generator"><header><h2>Packaging Band Generator</h2><button id="bandClose" type="button">Close</button></header><div class="bandFields"><label>Team for printed band<input id="bandTeam" type="text" list="bandTeamChoices" placeholder="Choose the team whose logo prints"><datalist id="bandTeamChoices"></datalist></label><label>Season<input id="bandSeason" type="text"></label><label>Rinkboard size<input id="bandSize" type="text" placeholder="30 x 139"></label><label>Shipment month<input id="bandMonth" type="month"></label><label>Sponsor / rinkboard name<input id="bandSponsor" type="text"></label></div><div class="bandActions"><button id="bandLogoUpload" type="button">Upload / replace team logo in Dropbox</button><input id="bandLogoFile" type="file" accept=".png,.svg,.pdf,.webp,image/png,image/svg+xml,application/pdf,image/webp" hidden><button id="bandReload" type="button">Load team logo</button><span id="bandStatus" role="status"></span></div><div class="bandPreviewWrap"><canvas id="bandPreview" width="1224" height="232"></canvas></div><div class="bandActions"><button id="bandExport" type="button">Export 17″ × 3.22″ PDF</button><button id="bandExportAll" type="button" hidden>Export selected bands (ZIP)</button></div></section>`;
document.body.append(modal);
const style=document.createElement('style');style.textContent=`#bandModal[hidden]{display:none}#bandModal{position:fixed;inset:0;z-index:10020;background:#0009;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Lato,Arial,sans-serif}.bandPanel{width:min(1250px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:12px;padding:22px;color:#252525;box-shadow:0 15px 70px #0004}.bandPanel header,.bandActions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.bandPanel header h2{margin:0}.bandFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin:20px 0}.bandFields label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}.bandFields input{min-width:0;padding:9px;border:1px solid #ccc;border-radius:6px}.bandActions{justify-content:flex-start;margin:12px 0}.bandActions button,#bandClose{padding:9px 14px;background:#80c33d;border:0;border-radius:6px;font-weight:700;cursor:pointer}.bandPreviewWrap{overflow:auto;background:#e9e9e9;padding:12px;border-radius:6px}#bandPreview{width:100%;min-width:650px;height:auto;background:white;display:block}#bandStatus{font-size:12px;color:#555}`;document.head.append(style);
function status(s){$('bandStatus').textContent=s}
function isLeagueWide(t){return /^league[ -]?wide$/i.test(String(t||'').trim())}
function filename(s){return String(s||'').replace(/[^a-z0-9]/gi,'')}
function api(){if(!window.RinkboardBandDropbox)throw Error('Dropbox integration unavailable.');return window.RinkboardBandDropbox}
function formatMonth(v){if(!v)return '';const [y,m]=v.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleString('en-US',{month:'short',year:'numeric'}).toUpperCase()}
function image(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not load image'));img.src=src})}
function drawFit(ctx,img,x,y,w,h){let r=Math.min(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*r)/2,y+(h-img.height*r)/2,img.width*r,img.height*r)}
async function render(){await ensureBandFont();const canvas=$('bandPreview'),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#211e1e';ctx.textAlign='center';ctx.textBaseline='middle';
// Keep the left side blank for wrapping around the order.
const brand=document.querySelector('header.top .brand img, .brand-logo');if(brand){try{let img=await image(brand.src);drawFit(ctx,img,505,17,204,55)}catch{}}
if(logoData){try{drawFit(ctx,await logoPreviewImage(),525,92,170,119)}catch{}}
ctx.font='700 17px "Neo Sans Bold"';ctx.fillText('RINKBOARDS ('+$('bandSize').value.trim()+')',1021,31);
ctx.font='700 16px "Neo Sans Bold"';ctx.fillText('SHIPPED '+formatMonth($('bandMonth').value),1021,54);
ctx.strokeStyle='#111';ctx.lineWidth=1.5;ctx.strokeRect(853,80,329,72);
if(boardData){try{drawFit(ctx,await image(boardData),861,85,313,62)}catch{}}
ctx.font='700 17px "Neo Sans Bold"';ctx.fillText($('bandSeason').value.trim().toUpperCase(),1021,193);
}
function svgToData(svg){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const img=new Image();img.onload=()=>{try{const ratio=(img.naturalWidth||1200)/(img.naturalHeight||300);if(!Number.isFinite(ratio)||ratio<=0)throw Error('Invalid board preview dimensions');const c=document.createElement('canvas');c.width=2400;c.height=Math.max(1,Math.min(2400,Math.round(2400/ratio)));const ctx=c.getContext('2d',{alpha:false});ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/png'))}catch(e){reject(e)}finally{URL.revokeObjectURL(url)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Board preview could not be rendered'))};img.src=url})}
async function getBoard(){if(source==='builder'){const p=window.RinkboardBridge.getProject();const idx=p.activeBoard;board=p.boards[idx];if(!board)throw Error('No active board');return window.RinkboardBridge.getBoardPreview(idx)}const d=JSON.parse(await api().downloadText(selectedRecord.path));board=d.project?.boards?.[0];if(!board)throw Error('Invalid saved board');return api().downloadText(selectedRecord.path.replace(/\.rinkboard\.json$/i,'.preview.svg'))}
async function loadTeamLogo(){
 logoData='';logoFormat='';const t=$('bandTeam').value.trim();
 if(!t){status('Enter a team first');await render();return}
 for(const ext of ['svg','pdf','png','webp']){
  try{
   const data=await api().downloadLogo(filename(t)+'.'+ext);
   logoData=data;logoFormat=ext;
   status('Loaded original '+ext.toUpperCase()+' team logo from Dropbox'+(['svg','pdf'].includes(ext)?' — vector preserved':'') );
   await render();return;
  }catch(e){if(e.message!=='Team logo not found')throw e}
 }
 // V154: Buffalo Sabres supplied band logo; Dropbox team logo overrides it.
 if(/^buffalo sabres$/i.test(t)){
  const response=await fetch('buffalo-sabres.png');
  if(!response.ok)throw Error('Bundled Buffalo Sabres logo could not be loaded');
  const blob=await response.blob();
  logoData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
  logoFormat='png';status('Loaded bundled Buffalo Sabres logo');await render();return;
 }
 // V132: Bundled Los Angeles Kings logo is available without a Dropbox upload.
 // A user-uploaded Dropbox logo always takes priority over this default.
 if(/^los angeles kings$/i.test(t)){
  logoData=await fetch('los-angeles-kings.png').then(async r=>{
   if(!r.ok)throw Error('Bundled Los Angeles Kings logo could not be loaded');
   const blob=await r.blob();
   return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=()=>reject(Error('Could not read Kings logo'));reader.readAsDataURL(blob)});
  });
  logoFormat='png';status('Loaded bundled Los Angeles Kings logo');await render();return;
 }
 // V137: The supplied Wisconsin logo is the default for NCAA men's and women's bands.
 // Dropbox team logos continue to take priority.
 if(/^university of wisconsin badgers$/i.test(t)){
  const response=await fetch('wisconsin-badgers.png');
  if(!response.ok)throw Error('Bundled Wisconsin Badgers logo could not be loaded');
  const blob=await response.blob();logoData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
  logoFormat='png';status('Loaded bundled Wisconsin Badgers logo');await render();return;
 }
 // V140: bundled Vancouver Warriors logo, after any Dropbox override.
 if(/^vancouver warriors$/i.test(t)){
  const response=await fetch('vancouver-warriors.png');
  if(!response.ok)throw Error('Bundled Vancouver Warriors logo could not be loaded');
  const blob=await response.blob();logoData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
  logoFormat='png';status('Loaded bundled Vancouver Warriors logo');await render();return;
 }
 // V156: BCHL logo bundle, after Dropbox team-logo override.
 const bchlLogo=window.RinkboardBCHLLogos?.[String(t).toLowerCase().replace(/[^a-z0-9]/g,'')];
 if(bchlLogo){
  const response=await fetch(bchlLogo);
  if(!response.ok)throw Error('Bundled BCHL team logo could not be loaded');
  const blob=await response.blob();
  logoData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});
  logoFormat='png';status('Loaded bundled BCHL team logo');await render();return;
 }
 status('No logo found for '+t+'. Upload a PNG, SVG, PDF, or WEBP to add one.');await render();
}
async function open(from){source=from;selectedRecord=null;selectedBatch=[];logoData='';logoFormat='';boardData='';boardSvg='';if(from==='builder'){team=$('builderTeam')?.value||'';season=$('builderSeason')?.value||''}else{const records=api().selectedRecords();if(!records.length){alert('Select one or more rinkboards in the Database to generate bands.');return}selectedBatch=records;selectedRecord=records[0];team=($('dbTeam')?.value||'').trim();if(!team||isLeagueWide(team))team=isLeagueWide(selectedRecord.team)?'':selectedRecord.team;season=selectedRecord.season}
$('bandExportAll').hidden=source!=='database'||selectedBatch.length<2;const choices=$('bandTeamChoices');choices.replaceChildren();const teamNames=[...document.querySelectorAll('#dbTeam option, #builderTeam option')].map(o=>o.value).filter(t=>t&&!isLeagueWide(t));teamNames.push('Los Angeles Kings','University of Wisconsin Badgers','Vancouver Warriors');for(const t of [...new Set(teamNames)]){const o=document.createElement('option');o.value=t;choices.append(o)}modal.hidden=false;const d=new Date();$('bandMonth').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');$('bandTeam').value=team;$('bandSeason').value=season;status('Loading board…');try{const svg=await getBoard();size='30 x '+(board.settings?.width||selectedRecord?.width||139);$('bandSize').value=size;$('bandSponsor').value=board.settings?.sponsor||selectedRecord?.name||'';boardSvg=svg;boardData=await svgToData(svg);await loadTeamLogo()}catch(e){status(e.message);await render()}}
$('bandClose').onclick=()=>modal.hidden=true;modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});for(const id of ['bandTeam','bandSeason','bandSize','bandMonth','bandSponsor'])$(id).addEventListener('input',()=>{if(id==='bandTeam'){logoData='';logoFormat='';status('Team changed — click Load team logo, or choose a team from the list.')}render()});$('bandTeam').addEventListener('change',()=>loadTeamLogo().catch(e=>status(e.message)));$('bandReload').onclick=()=>loadTeamLogo();$('bandLogoUpload').onclick=()=>$('bandLogoFile').click();// Store the ORIGINAL artwork in Dropbox. Never flatten SVG or PDF logos.
$('bandLogoFile').onchange=async()=>{
 const file=$('bandLogoFile').files[0];if(!file)return;
 try{
  const ext=(file.name.split('.').pop()||'').toLowerCase();
  if(!['png','svg','pdf','webp'].includes(ext))throw Error('Choose a PNG, SVG, PDF, or WEBP file');
  if(file.size>20*1024*1024)throw Error('Logo must be smaller than 20 MB');
  if(ext==='svg'){
   const xml=new DOMParser().parseFromString(await file.text(),'image/svg+xml');
   if(xml.querySelector('parsererror')||xml.documentElement.localName!=='svg')throw Error('Invalid SVG');
  }
  if(ext==='pdf'&&!file.type.includes('pdf')&&!String.fromCharCode(...new Uint8Array(await file.slice(0,4).arrayBuffer())).startsWith('%PDF'))throw Error('Invalid PDF');
  const t=$('bandTeam').value.trim();if(!t)throw Error('Enter a team');
  await api().uploadLogo(filename(t)+'.'+ext,file);
  // Remove earlier logo formats so replacements always win, including existing V89 PNGs.
  if(api().deleteLogo){for(const old of ['svg','pdf','png','webp'])if(old!==ext){try{await api().deleteLogo(filename(t)+'.'+old)}catch(e){console.warn('Could not remove old team logo',old,e)}}}
  status('Saved original '+ext.toUpperCase()+' logo to Dropbox');await loadTeamLogo();
 }catch(e){status(e.message)}finally{$('bandLogoFile').value=''}
};
// The canvas is ONLY an on-screen preview. Export uses original vector paths.
async function logoPreviewImage(){
 if(!logoData)return null;
 if(logoFormat!=='pdf')return image(logoData);
 if(!window.pdfjsLib)throw Error('PDF preview library unavailable');
 pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';
 const bytes=Uint8Array.from(atob(logoData.split(',')[1]),c=>c.charCodeAt(0));
 const pdf=await pdfjsLib.getDocument({data:bytes}).promise;
 try{const page=await pdf.getPage(1),base=page.getViewport({scale:1}),viewport=page.getViewport({scale:Math.min(3,1200/Math.max(base.width,base.height))});const c=document.createElement('canvas');c.width=Math.ceil(viewport.width);c.height=Math.ceil(viewport.height);await page.render({canvasContext:c.getContext('2d'),viewport}).promise;return image(c.toDataURL('image/png'))}finally{await pdf.destroy()}
}
async function embedVectorLogo(doc){
 if(!logoData)return;
 if(logoFormat==='svg'){
  if(typeof doc.svg!=='function')throw Error('SVG-to-PDF vector library unavailable');
  const xml=new DOMParser().parseFromString((logoData.slice(0,logoData.indexOf(',')).includes(';base64')?atob(logoData.slice(logoData.indexOf(',')+1)):decodeURIComponent(logoData.slice(logoData.indexOf(',')+1))),'image/svg+xml');
  if(xml.querySelector('parsererror'))throw Error('Invalid SVG logo');
  // Illustrator SVGs often contain CSS classes and nested SVG images.
  // svg2pdf can render those nested images as solid black rectangles.
  // Expand them into actual vector nodes and inline their CSS first.
  const root=flattenBandSvg(new XMLSerializer().serializeToString(xml.documentElement));
  // Keep internal paint-server references (#id), but strip external resources.
  root.querySelectorAll('script,foreignObject,iframe,object,embed').forEach(x=>x.remove());
  root.querySelectorAll('*').forEach(el=>[...el.attributes].forEach(a=>{
   if(/^on/i.test(a.name)||(/href$/i.test(a.name)&&a.value.trim()&&!a.value.trim().startsWith('#')))el.removeAttribute(a.name);
  }));
  root.style.background='transparent';
  const vb=(root.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  let w=vb.length===4&&vb[2]>0?vb[2]:parseFloat(root.getAttribute('width'))||100;
  let h=vb.length===4&&vb[3]>0?vb[3]:parseFloat(root.getAttribute('height'))||100;
  const scale=Math.min(170/w,119/h);w*=scale;h*=scale;
  await doc.svg(root,{x:525+(170-w)/2,y:92+(119-h)/2,width:w,height:h});
 }else if(logoFormat!=='pdf'){
  await fitBandRasterLogo(doc,logoData);
 }
}
async function fitBandRasterLogo(doc,src){
 const img=await image(src);
 const r=Math.min(170/img.naturalWidth,119/img.naturalHeight);
 const w=img.naturalWidth*r,h=img.naturalHeight*r;
 // Some PDF viewers render transparent PNG/WEBP alpha as opaque black.
 // The band itself has a white background, so composite ONLY the PDF copy
 // onto white at native image resolution; keep the original file untouched.
 const c=document.createElement('canvas');
 c.width=img.naturalWidth;c.height=img.naturalHeight;
 const ctx=c.getContext('2d',{alpha:false});
 ctx.fillStyle='#ffffff';ctx.fillRect(0,0,c.width,c.height);
 ctx.drawImage(img,0,0);
 doc.addImage(c.toDataURL('image/png'),'PNG',525+(170-w)/2,92+(119-h)/2,w,h);
}
async function finalizeBand(doc){
 const bytes=new Uint8Array(doc.output('arraybuffer'));
 if(!logoData||logoFormat!=='pdf')return bytes;
 if(!window.PDFLib)throw Error('PDF vector embedding library unavailable');
 const out=await PDFLib.PDFDocument.load(bytes);
 const source=Uint8Array.from(atob(logoData.split(',')[1]),c=>c.charCodeAt(0));
 const [embedded]=await out.embedPdf(source,[0]);
 const scale=Math.min(170/embedded.width,119/embedded.height);
 const w=embedded.width*scale,h=embedded.height*scale;
 // PDF-lib coordinates start at the bottom; jsPDF coordinates start at the top.
 out.getPages()[0].drawPage(embedded,{x:525+(170-w)/2,y:H-(92+(119-h)/2)-h,width:w,height:h});
 return await out.save();
}
// Naming convention: TeamName_Bands-SponsorName[139in].pdf
// Only one underscore is retained: the separator immediately before "Bands".
function bandFileName(teamName,sponsorName,boardSize,includeLength=false){
 const clean=v=>String(v||'').trim().replace(/\.pdf$/i,'').replace(/[^a-z0-9]/gi,'');
 const teamPart=clean(teamName)||'Team';
 let sponsorPart=clean(sponsorName)||'Sponsor';
 // Avoid duplicating a size already supplied as part of the sponsor name.
 const alreadySized=/\d+(?:\.\d+)?in$/i.test(sponsorPart);
 const sizeMatch=String(boardSize||'').match(/(?:x|×)\s*(\d+(?:\.\d+)?)/i);
 if(includeLength && !alreadySized && sizeMatch)sponsorPart+=sizeMatch[1]+'in';
 return teamPart+'_Bands-'+sponsorPart;
}
function saveBand(bytes,name){const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=name+'.pdf';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}
async function rasterBoard(doc){if(!boardSvg)return;const svgBlob=new Blob([boardSvg],{type:'image/svg+xml'});const url=URL.createObjectURL(svgBlob);try{const img=await image(url);const c=document.createElement('canvas');c.width=2504;c.height=496;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);doc.addImage(c.toDataURL('image/png'),'PNG',861,85,313,62)}finally{URL.revokeObjectURL(url)}}
// Flatten nested Illustrator SVG images into vector elements before sending to svg2pdf.
// This mirrors the production exporter fix: SVG data URI <image> elements render black in svg2pdf.
function flattenBandSvg(markup){
 const parser=new DOMParser(),doc=parser.parseFromString(markup,'image/svg+xml');
 if(doc.querySelector('parsererror'))throw Error('Invalid band artwork SVG');
 const root=doc.documentElement,NS='http://www.w3.org/2000/svg';
 function inlineStyles(node){
  const rules={};
  for(const style of node.querySelectorAll('style')){
   const css=style.textContent.replace(/\/\*[\s\S]*?\*\//g,'');
   for(const m of css.matchAll(/([^{}]+)\{([^{}]+)\}/g)){
    const props={};for(const decl of m[2].split(';')){const i=decl.indexOf(':');if(i>0)props[decl.slice(0,i).trim()]=decl.slice(i+1).trim()}
    for(const selector of m[1].split(',')){const key=selector.trim();if(/^\.[\w-]+$/.test(key))rules[key.slice(1)]={...(rules[key.slice(1)]||{}),...props}}
   }
  }
  const clone=node.cloneNode(true);
  clone.querySelectorAll('style,script,foreignObject,iframe').forEach(el=>el.remove());
  for(const el of [clone,...clone.querySelectorAll('*')]){
   for(const cls of (el.getAttribute('class')||'').split(/\s+/))if(rules[cls])for(const [k,v] of Object.entries(rules[cls]))if(!el.hasAttribute(k))el.setAttribute(k,v);
   el.removeAttribute('class');for(const attr of [...el.attributes])if(/^on/i.test(attr.name))el.removeAttribute(attr.name);
  }
  return clone;
 }
 for(const el of [...root.querySelectorAll('image')]){
  const src=el.getAttribute('href')||el.getAttribute('xlink:href')||'';
  if(!/^data:image\/svg\+xml/i.test(src))continue;
  const split=src.indexOf(',');if(split<0)throw Error('Embedded SVG is missing image data');
  const payload=src.slice(split+1),raw=/;base64/i.test(src.slice(0,split))?atob(payload):decodeURIComponent(payload);
  const nested=parser.parseFromString(raw,'image/svg+xml');
  if(nested.querySelector('parsererror'))throw Error('Embedded Illustrator SVG is invalid');
  const original=nested.documentElement,clean=inlineStyles(original);
  const vb=(original.getAttribute('viewBox')||'').trim().split(/[\s,]+/).map(Number);
  const x=parseFloat(el.getAttribute('x'))||0,y=parseFloat(el.getAttribute('y'))||0;
  const w=parseFloat(el.getAttribute('width'))||0,h=parseFloat(el.getAttribute('height'))||0;
  if(!(w>0&&h>0))throw Error('Embedded SVG has invalid dimensions');
  const vbx=vb.length===4&&vb.every(Number.isFinite)?vb[0]:0,vby=vb.length===4&&vb.every(Number.isFinite)?vb[1]:0;
  const vbw=vb.length===4&&vb[2]>0?vb[2]:parseFloat(original.getAttribute('width'))||w;
  const vbh=vb.length===4&&vb[3]>0?vb[3]:parseFloat(original.getAttribute('height'))||h;
  const group=doc.createElementNS(NS,'g');
  group.setAttribute('transform',`translate(${x} ${y}) scale(${w/vbw} ${h/vbh}) translate(${-vbx} ${-vby})`);
  for(const child of [...clean.childNodes])if(child.nodeType===1)group.appendChild(doc.importNode(child,true));
  // Keep the existing image's parent transforms, including rotation.
  el.parentNode.replaceChild(group,el);
 }
 // Resolve CSS classes on the outer preview as well, so SVG-to-PDF can render fills.
 return inlineStyles(root);
}
async function exportBand(){
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF({orientation:'landscape',unit:'pt',format:[W,H],compress:true});
 await registerBandPdfFont(doc);
 const center=(txt,x,y,sz)=>{doc.setFont('NeoSansBand','bold');doc.setFontSize(sz);doc.setTextColor(33,30,30);doc.text(txt,x,y,{align:'center'})};
 const fitImage=async(src,x,y,w,h)=>{if(!src)return;const img=await image(src);const r=Math.min(w/img.naturalWidth,h/img.naturalHeight);const iw=img.naturalWidth*r,ih=img.naturalHeight*r;let format=/^data:image\/jpe?g/i.test(src)?'JPEG':'PNG';if(!/^data:image\/(png|jpe?g)/i.test(src)){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);src=c.toDataURL('image/png');format='PNG'}doc.addImage(src,format,x+(w-iw)/2,y+(h-ih)/2,iw,ih)};
 const brand=document.querySelector('header.top .brand img, .brand-logo');
 if(brand){try{
   // Normalize the embedded Blast Media logo to a bounded PNG before passing it to jsPDF.
   // The original base64 image is very large and can fail or appear corrupt in PDF viewers.
   const logo=await image(brand.currentSrc||brand.src);
   const c=document.createElement('canvas');c.width=1020;c.height=275;
   const cx=c.getContext('2d');
   const r=Math.min(c.width/logo.naturalWidth,c.height/logo.naturalHeight);
   const iw=logo.naturalWidth*r,ih=logo.naturalHeight*r;
   cx.drawImage(logo,(c.width-iw)/2,(c.height-ih)/2,iw,ih);
   await fitImage(c.toDataURL('image/png'),505,17,204,55);
 }catch(e){console.warn('Blast Media brand image unavailable',e);throw Error('Blast Media logo could not be embedded in the PDF: '+e.message)}}
 if(logoData){await embedVectorLogo(doc)}
 center('RINKBOARDS ('+$('bandSize').value.trim()+')',1021,36,17);
 center('SHIPPED '+formatMonth($('bandMonth').value),1021,59,16);
 doc.setDrawColor(17,17,17);doc.setLineWidth(1.5);doc.rect(853,80,329,72);
 // Color-accurate band preview. SVG-to-PDF conversion can alter CMYK/spot
 // colors, gradients, clipping and embedded SVGs, or fail for some sponsors.
 // Use the exact browser-rendered preview, at high resolution, in the PDF.
 if(!boardData)throw Error('Board preview is missing. Reload the band before exporting.');
 await fitImage(boardData,861,85,313,62);
 center($('bandSeason').value.trim().toUpperCase(),1021,199,17);
 return doc;
}
$('bandExport').onclick=async()=>{try{status('Creating colour-accurate PDF…');const doc=await exportBand();const name=bandFileName($('bandTeam').value,$('bandSponsor').value,$('bandSize').value);saveBand(await finalizeBand(doc),name);status('Band PDF exported with colour-accurate artwork preview')}catch(e){status('Export failed: '+e.message);console.error(e)}};
$('bandExportAll').onclick=async()=>{const button=$('bandExportAll');button.disabled=true;try{const list=selectedBatch.slice();const original=selectedRecord;const printTeam=$('bandTeam').value.trim();if(!printTeam||isLeagueWide(printTeam)){status('Choose the team whose logo should print on every band.');button.disabled=false;return}let ok=0;const failed=[];const zip=list.length>1?(window.JSZip?new window.JSZip():(()=>{throw Error('ZIP library unavailable. Reload the page while online.')})()):null;for(let i=0;i<list.length;i++){selectedRecord=list[i];status('Generating band '+(i+1)+' of '+list.length+': '+selectedRecord.name);try{const svg=await getBoard();boardSvg=svg;boardData=await svgToData(svg);$('bandTeam').value=printTeam;$('bandSeason').value=selectedRecord.season;$('bandSize').value='30 x '+(board.settings?.width||selectedRecord.width||139);$('bandSponsor').value=board.settings?.sponsor||selectedRecord.name;await loadTeamLogo();const doc=await exportBand();const sameSponsorCount=list.filter(r=>String(r.name||'').toLowerCase()===String(selectedRecord.name||'').toLowerCase()).length;
 const stem=bandFileName(printTeam,$('bandSponsor').value,$('bandSize').value,sameSponsorCount>1);const bytes=await finalizeBand(doc);if(zip)zip.file(stem+'.pdf',bytes);else saveBand(bytes,stem);ok++}catch(e){console.error('Band failed for '+selectedRecord.name,e);failed.push(selectedRecord.name+': '+e.message);status('Failed '+selectedRecord.name+': '+e.message)}}selectedRecord=original;if(zip&&ok){status('Compressing '+ok+' bands into ZIP…');const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Rinkboard_Bands_'+ok+'.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000)}status('Exported '+ok+' of '+list.length+' bands'+(zip?' in one ZIP':'')+'.'+(failed.length?' Failed: '+failed.join('; '):''))}finally{button.disabled=false}};
window.RinkboardBands={open};
})();

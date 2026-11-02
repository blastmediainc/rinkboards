/* Blast Media band generator — fixed 17 x 3.2222 inch packaging band. */
(()=>{'use strict';
const $=id=>document.getElementById(id), W=1224,H=232;
let source='builder',selectedRecord=null,board=null,team='',season='',size='',logoData='',boardData='',boardSvg='';
const modal=document.createElement('div');modal.id='bandModal';modal.hidden=true;
modal.innerHTML=`<section class="bandPanel" role="dialog" aria-modal="true" aria-label="Packaging band generator"><header><h2>Packaging Band Generator</h2><button id="bandClose" type="button">Close</button></header><div class="bandFields"><label>Team<input id="bandTeam" type="text"></label><label>Season<input id="bandSeason" type="text"></label><label>Rinkboard size<input id="bandSize" type="text" placeholder="30 x 139"></label><label>Shipment month<input id="bandMonth" type="month"></label><label>Sponsor / rinkboard name<input id="bandSponsor" type="text"></label></div><div class="bandActions"><button id="bandLogoUpload" type="button">Upload / replace team logo in Dropbox</button><input id="bandLogoFile" type="file" accept="image/png" hidden><button id="bandReload" type="button">Load team logo</button><span id="bandStatus" role="status"></span></div><div class="bandPreviewWrap"><canvas id="bandPreview" width="1224" height="232"></canvas></div><div class="bandActions"><button id="bandExport" type="button">Export 17″ × 3.22″ PDF</button></div></section>`;
document.body.append(modal);
const style=document.createElement('style');style.textContent=`#bandModal[hidden]{display:none}#bandModal{position:fixed;inset:0;z-index:10020;background:#0009;display:flex;align-items:center;justify-content:center;padding:16px;font-family:Lato,Arial,sans-serif}.bandPanel{width:min(1250px,97vw);max-height:94vh;overflow:auto;background:#fff;border-radius:12px;padding:22px;color:#252525;box-shadow:0 15px 70px #0004}.bandPanel header,.bandActions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}.bandPanel header h2{margin:0}.bandFields{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px;margin:20px 0}.bandFields label{display:flex;flex-direction:column;gap:5px;font-size:12px;font-weight:700}.bandFields input{min-width:0;padding:9px;border:1px solid #ccc;border-radius:6px}.bandActions{justify-content:flex-start;margin:12px 0}.bandActions button,#bandClose{padding:9px 14px;background:#80c33d;border:0;border-radius:6px;font-weight:700;cursor:pointer}.bandPreviewWrap{overflow:auto;background:#e9e9e9;padding:12px;border-radius:6px}#bandPreview{width:100%;min-width:650px;height:auto;background:white;display:block}#bandStatus{font-size:12px;color:#555}`;document.head.append(style);
function status(s){$('bandStatus').textContent=s}
function filename(s){return String(s||'').replace(/[^a-z0-9]/gi,'')}
function api(){if(!window.RinkboardBandDropbox)throw Error('Dropbox integration unavailable.');return window.RinkboardBandDropbox}
function formatMonth(v){if(!v)return '';const [y,m]=v.split('-');return new Date(Number(y),Number(m)-1,1).toLocaleString('en-US',{month:'short',year:'numeric'}).toUpperCase()}
function image(src){return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(Error('Could not load image'));img.src=src})}
function drawFit(ctx,img,x,y,w,h){let r=Math.min(w/img.width,h/img.height);ctx.drawImage(img,x+(w-img.width*r)/2,y+(h-img.height*r)/2,img.width*r,img.height*r)}
async function render(){const canvas=$('bandPreview'),ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,W,H);ctx.fillStyle='#211e1e';ctx.textAlign='center';ctx.textBaseline='middle';
// Keep the left side blank for wrapping around the order.
const brand=document.querySelector('header.top .brand img');if(brand){try{let img=await image(brand.src);drawFit(ctx,img,505,17,204,55)}catch{}}
if(logoData){try{drawFit(ctx,await image(logoData),525,92,170,119)}catch{}}
ctx.font='bold 17px Lato,Arial,sans-serif';ctx.fillText('RINKBOARDS ('+$('bandSize').value.trim()+')',1021,31);
ctx.font='bold 16px Lato,Arial,sans-serif';ctx.fillText('SHIPPED '+formatMonth($('bandMonth').value),1021,54);
ctx.strokeStyle='#111';ctx.lineWidth=1.5;ctx.strokeRect(853,80,329,72);
if(boardData){try{drawFit(ctx,await image(boardData),861,85,313,62)}catch{}}
ctx.font='bold 17px Lato,Arial,sans-serif';ctx.fillText($('bandSeason').value.trim().toUpperCase()+' SEASON',1021,193);
}
function svgToData(svg){return new Promise((resolve,reject)=>{const url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));const img=new Image();img.onload=()=>{try{const c=document.createElement('canvas');c.width=1200;c.height=300;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,c.width,c.height);resolve(c.toDataURL('image/png'))}catch(e){reject(e)}finally{URL.revokeObjectURL(url)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Board preview could not be rendered'))};img.src=url})}
async function getBoard(){if(source==='builder'){const p=window.RinkboardBridge.getProject();const idx=p.activeBoard;board=p.boards[idx];if(!board)throw Error('No active board');return window.RinkboardBridge.getBoardPreview(idx)}const d=JSON.parse(await api().downloadText(selectedRecord.path));board=d.project?.boards?.[0];if(!board)throw Error('Invalid saved board');return api().downloadText(selectedRecord.path.replace(/\.rinkboard\.json$/i,'.preview.svg'))}
async function loadTeamLogo(){logoData='';const t=$('bandTeam').value.trim();if(!t){status('Enter a team first');await render();return}try{logoData=await api().downloadLogo(filename(t)+'.png');status('Loaded '+filename(t)+'.png from Dropbox')}catch(e){status('No logo found for '+t+'. Upload a PNG to add one.')}await render()}
async function open(from){source=from;selectedRecord=null;logoData='';boardData='';boardSvg='';if(from==='builder'){team=$('builderTeam')?.value||'';season=$('builderSeason')?.value||''}else{const records=api().selectedRecords();if(records.length!==1){alert('Select exactly one rinkboard in the Database to generate its band.');return}selectedRecord=records[0];team=selectedRecord.team;season=selectedRecord.season}
modal.hidden=false;const d=new Date();$('bandMonth').value=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');$('bandTeam').value=team;$('bandSeason').value=season;status('Loading board…');try{const svg=await getBoard();size='30 x '+(board.settings?.width||selectedRecord?.width||139);$('bandSize').value=size;$('bandSponsor').value=board.settings?.sponsor||selectedRecord?.name||'';boardSvg=svg;boardData=await svgToData(svg);await loadTeamLogo()}catch(e){status(e.message);await render()}}
$('bandClose').onclick=()=>modal.hidden=true;modal.addEventListener('click',e=>{if(e.target===modal)modal.hidden=true});for(const id of ['bandTeam','bandSeason','bandSize','bandMonth','bandSponsor'])$(id).addEventListener('input',()=>{if(id==='bandTeam')logoData='';render()});$('bandReload').onclick=()=>loadTeamLogo();$('bandLogoUpload').onclick=()=>$('bandLogoFile').click();$('bandLogoFile').onchange=async()=>{const file=$('bandLogoFile').files[0];if(!file)return;try{if(file.type!=='image/png'&&!file.name.toLowerCase().endsWith('.png'))throw Error('Please select a PNG');if(file.size>10*1024*1024)throw Error('PNG must be smaller than 10 MB');const t=$('bandTeam').value.trim();if(!t)throw Error('Enter a team');await api().uploadLogo(filename(t)+'.png',file);status('Saved '+filename(t)+'.png to Dropbox');await loadTeamLogo()}catch(e){status(e.message)}finally{$('bandLogoFile').value=''}};
// Vector-first PDF: text, outlines and SVG rinkboard stay vector; PNG logos retain their original pixels.
async function exportBand(){
 const {jsPDF}=window.jspdf;
 const doc=new jsPDF({orientation:'landscape',unit:'pt',format:[W,H],compress:true});
 const center=(txt,x,y,sz)=>{doc.setFont('helvetica','bold');doc.setFontSize(sz);doc.setTextColor(33,30,30);doc.text(txt,x,y,{align:'center'})};
 const fitImage=async(src,x,y,w,h)=>{if(!src)return;const img=await image(src);const r=Math.min(w/img.naturalWidth,h/img.naturalHeight);const iw=img.naturalWidth*r,ih=img.naturalHeight*r;let format=/^data:image\/jpe?g/i.test(src)?'JPEG':'PNG';if(!/^data:image\/(png|jpe?g)/i.test(src)){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);src=c.toDataURL('image/png');format='PNG'}doc.addImage(src,format,x+(w-iw)/2,y+(h-ih)/2,iw,ih)};
 const brand=document.querySelector('header.top .brand img');
 if(brand){try{await fitImage(brand.src,505,17,204,55)}catch(e){console.warn('Brand image unavailable',e)}}
 if(logoData){try{await fitImage(logoData,525,92,170,119)}catch(e){console.warn('Team logo unavailable',e)}}
 center('RINKBOARDS ('+$('bandSize').value.trim()+')',1021,36,17);
 center('SHIPPED '+formatMonth($('bandMonth').value),1021,59,16);
 doc.setDrawColor(17,17,17);doc.setLineWidth(1.5);doc.rect(853,80,329,72);
 if(boardSvg){
   if(!window.svg2pdf)throw Error('Vector PDF library unavailable. Reload the page.');
   const parser=new DOMParser();const svg=parser.parseFromString(boardSvg,'image/svg+xml').documentElement;
   if(svg.localName!=='svg'||svg.querySelector('parsererror'))throw Error('Invalid rinkboard SVG');
   const vb=(svg.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);
   let sw=vb.length===4&&vb[2]>0?vb[2]:parseFloat(svg.getAttribute('width'))||313;
   let sh=vb.length===4&&vb[3]>0?vb[3]:parseFloat(svg.getAttribute('height'))||62;
   const scale=Math.min(313/sw,62/sh);
   await window.svg2pdf(svg,doc,{x:861+(313-sw*scale)/2,y:85+(62-sh*scale)/2,width:sw*scale,height:sh*scale});
 }
 center($('bandSeason').value.trim().toUpperCase()+' SEASON',1021,199,17);
 return doc;
}
$('bandExport').onclick=async()=>{try{status('Creating vector PDF…');const doc=await exportBand();const name=[$('bandTeam').value,$('bandSponsor').value,'Band',formatMonth($('bandMonth').value)].map(x=>x.trim().replace(/[^a-z0-9-]+/gi,'_')).filter(Boolean).join('_');doc.save(name+'.pdf');status('Vector-first band PDF exported')}catch(e){status('Export failed: '+e.message);console.error(e)}};
window.RinkboardBands={open};
})();

/* Rinkboard Builder — Dropbox shared database. OAuth PKCE; no embedded credentials. */
(()=>{'use strict';
const $=id=>document.getElementById(id), API='https://api.dropboxapi.com/2', CONTENT='https://content.dropboxapi.com/2';
const cfgKey='rinkboard-dropbox-settings-v1',tokenKey='rinkboard-dropbox-session-v1',pkceKey='rinkboard-dropbox-pkce-v1';
let folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};
let config={appKey:'',folder:'/Rinkboard Database'},token=null,entries=[],selectedRecord=null,busy=false,selectedPaths=new Set(),exportQuantities=new Map(),visibleRecords=[];
const BCHL_TEAMS = ["Alberni Valley Bulldogs", "Cowichan Valley Capitals", "Nanaimo Clippers", "Powell River Kings", "Victoria Grizzlies", "Chilliwack Chiefs", "Coquitlam Express", "Langley Rivermen", "Prince George Spruce Kings", "Surrey Eagles", "Cranbrook Bucks", "Salmon Arm Silverbacks", "Trail Smoke Eaters", "Vernon Vipers", "West Kelowna Warriors", "Blackfalds Bulldogs", "Brooks Bandits", "Okotoks Oilers", "Sherwood Park Crusaders", "Spruce Grove Saints"];
const bchlFolderKey='rinkboard-bchl-folder-v85';
let activeBrand=localStorage.getItem('rinkboard-active-brand-v85')==='bchl'?'bchl':'blast';
let blastFolder='/Rinkboard Database';
function currentFolder(){return activeBrand==='bchl'?(localStorage.getItem(bchlFolderKey)||'/BCHL Rinkboards'):blastFolder}
function brandTeams(){return activeBrand==='bchl'?BCHL_TEAMS:[]}

try{config={...config,...JSON.parse(localStorage.getItem(cfgKey)||'{}')};token=JSON.parse(sessionStorage.getItem(tokenKey)||'null')}catch{}
blastFolder=config.folder||'/Rinkboard Database';
config.folder=currentFolder();
function message(s){$('dbMessage').textContent=s}function state(s){$('dbStatus').textContent=s}function sanitize(s){return String(s||'').trim().replace(/[\\/:*?"<>|\x00-\x1f]/g,'-').replace(/^\.+/,'').slice(0,100)||'Untitled'}
function pathPart(s){return sanitize(s).replace(/\s+/g,' ')}function base(){return config.folder.trim().replace(/\/+$/,'')||'/Rinkboard Database'}
function parent(team,season,width){return `${base()}/${pathPart(team)}/${pathPart(season)}/30x${pathPart(width)}`}
function expired(){return !token||Date.now()>token.expires-60000}
function ensure(){if(expired())throw Error('Dropbox session expired. Click Connect Dropbox to sign in again.');return token.access}
async function rpc(endpoint,data){let res=await fetch(API+endpoint,{method:'POST',headers:{Authorization:'Bearer '+ensure(),'Content-Type':'application/json'},body:JSON.stringify(data)});let raw=await res.text();if(!res.ok)throw Error(`${endpoint}: ${raw.slice(0,350)}`);return raw?JSON.parse(raw):{}}
async function download(path){let res=await fetch(CONTENT+'/files/download',{method:'POST',headers:{Authorization:'Bearer '+ensure(),'Dropbox-API-Arg':JSON.stringify({path})}});if(!res.ok)throw Error('Download: '+(await res.text()).slice(0,250));return await res.text()}
function parseSavedProject(raw,record){
 const name=record?.name||record?.path||'Unknown rinkboard';
 const trimmed=String(raw||'').replace(/^\\uFEFF/,'').trim();
 if(!trimmed)throw Error(name+': saved project is empty in Dropbox');
 if(!trimmed.startsWith('{'))throw Error(name+': saved project is not JSON (starts with '+JSON.stringify(trimmed.slice(0,55))+'). Preview not changed.');
 let saved;
 try{saved=JSON.parse(trimmed)}catch(e){throw Error(name+': saved project contains invalid JSON ('+e.message+'). Preview not changed.')}
 if(!saved?.project||!Array.isArray(saved.project.boards)||!saved.project.boards.length)throw Error(name+': saved project does not contain editable artboards. Preview not changed.');
 return saved;
}
async function upload(path,content,rev,overwrite=false){let args={path,mode:rev?{'.tag':'update',update:rev}:overwrite?'overwrite':'add',autorename:false,mute:true,strict_conflict:true};let res=await fetch(CONTENT+'/files/upload',{method:'POST',headers:{Authorization:'Bearer '+ensure(),'Dropbox-API-Arg':JSON.stringify(args),'Content-Type':'application/octet-stream'},body:content});if(!res.ok){let t=await res.text();if(res.status===409)throw Error('Dropbox conflict: this file may have changed or already exist. Refresh the database before saving. '+t.slice(0,120));throw Error('Upload: '+t.slice(0,350))}return await res.json()}
async function mkdir(path){try{await rpc('/files/create_folder_v2',{path,autorename:false})}catch(e){if(!String(e).includes('conflict'))throw e}}
async function ensureFolders(path){let parts=path.split('/').filter(Boolean),curr='';for(let part of parts){curr+='/'+part;await mkdir(curr)}}
function setBusy(b){busy=b;for(let id of ['dbSave','dbSaveAll','dbRefresh','dbConnect','dbExportSelected','dbDeleteSelected','builderDbSave','dbRebuildPreviews'])$(id).disabled=b}
async function perform(fn){if(busy)return;setBusy(true);try{await fn()}catch(e){console.error(e);message(e.message||String(e))}finally{setBusy(false)}}
function applyConfig(){
 const nextKey=$('dbAppKey').value.trim(),nextFolder=$('dbFolder').value.trim().replace(/\/+$/,'')||(activeBrand==='bchl'?'/BCHL Rinkboards':'/Rinkboard Database');
 const changed=nextFolder!==config.folder||nextKey!==config.appKey;
 config.appKey=nextKey;config.folder=nextFolder;
 if(activeBrand==='bchl')localStorage.setItem(bchlFolderKey,nextFolder);
 else {blastFolder=nextFolder;localStorage.setItem(cfgKey,JSON.stringify({appKey:config.appKey,folder:blastFolder}))}
 if(activeBrand==='bchl')localStorage.setItem(cfgKey,JSON.stringify({appKey:config.appKey,folder:blastFolder}));
 if(changed){entries=[];selectedRecord=null;selectedPaths.clear();exportQuantities.clear();visibleRecords=[];folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};builderChoices();render()}
 message('Settings saved. '+(expired()?'Connect Dropbox to authorize your account.':'Click Refresh to load the selected database.'));
}
async function changeBrand(brand){
 if(busy){message('Wait for the current Dropbox operation to finish before switching brands.');return}
 activeBrand=brand==='bchl'?'bchl':'blast';
 config.folder=currentFolder();
 $('dbFolder').value=config.folder;
 entries=[];selectedRecord=null;selectedPaths.clear();exportQuantities.clear();visibleRecords=[];
 folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};
 $('dbTeam').value='';$('dbSeason').value='';$('builderTeam').value='';$('builderSeason').value='';
 builderChoices();render();
 message(activeBrand==='bchl'?'BCHL database: select a team and season.':'Blast Media database restored.');
 if(!expired())await refresh();
}

function randomString(){let arr=crypto.getRandomValues(new Uint8Array(32));return Array.from(arr,b=>b.toString(16).padStart(2,'0')).join('')}
function base64url(bytes){return btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
async function login(){if(!config.appKey)throw Error('Enter your Dropbox App Key and click Save Settings first.');if(location.protocol!=='https:'&&location.hostname!=='localhost')throw Error('Dropbox login requires HTTPS or localhost. Open your GitHub Pages site.');let verifier=randomString(),hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier)),stateId=randomString();sessionStorage.setItem(pkceKey,JSON.stringify({verifier,state:stateId,returnUrl:location.origin+location.pathname}));let u=new URL('https://www.dropbox.com/oauth2/authorize');u.searchParams.set('client_id',config.appKey);u.searchParams.set('response_type','code');u.searchParams.set('token_access_type','online');u.searchParams.set('code_challenge_method','S256');u.searchParams.set('code_challenge',base64url(new Uint8Array(hash)));u.searchParams.set('redirect_uri',location.origin+location.pathname);u.searchParams.set('state',stateId);location.assign(u.href)}
async function completeOAuth(){let q=new URLSearchParams(location.search);if(!q.has('code')&&!q.has('error'))return;let clear=()=>history.replaceState({},'',location.pathname+location.hash);if(q.has('error')){message('Dropbox authorization: '+q.get('error_description'));clear();return}let saved=JSON.parse(sessionStorage.getItem(pkceKey)||'null');sessionStorage.removeItem(pkceKey);if(!saved||saved.state!==q.get('state')){message('Dropbox sign-in verification failed. Try Connect again.');clear();return}let form=new URLSearchParams({code:q.get('code'),grant_type:'authorization_code',client_id:config.appKey,code_verifier:saved.verifier,redirect_uri:saved.returnUrl});let res=await fetch('https://api.dropboxapi.com/oauth2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form});let data=await res.json();clear();if(!res.ok)throw Error('Dropbox authorization failed: '+JSON.stringify(data));token={access:data.access_token,expires:Date.now()+(data.expires_in||14400)*1000};sessionStorage.setItem(tokenKey,JSON.stringify(token));state('Connected');message('Connected to Dropbox. Choose your team and season, then Refresh.');$('dbOverlay').hidden=false;await refresh()}
async function listAll(){let result=[];let first=await rpc('/files/list_folder',{path:base(),recursive:true,include_deleted:false,limit:2000});result.push(...first.entries);while(first.has_more){first=await rpc('/files/list_folder/continue',{cursor:first.cursor});result.push(...first.entries)}return result.filter(x=>x['.tag']==='file'&&x.name.endsWith('.rinkboard.json'))}
function parseEntry(meta){let path=meta.path_display||meta.path_lower||'',prefix=base()+'/';if(!path.toLowerCase().startsWith(prefix.toLowerCase()))return null;let parts=path.slice(prefix.length).split('/');if(parts.length!==4)return null;let [team,season,size,name]=parts;let width=size.match(/^30x(.+)$/i)?.[1];if(!width)return null;return {team,season,size,width,name:name.replace(/\.rinkboard\.json$/i,''),path,rev:meta.rev,id:meta.id}}
async function addCategory(id){const previous=id==='dbTeam'?'':id==='dbSeason'?'': 'all';const team=$('dbTeam').value,season=$('dbSeason').value;const type=id==='dbTeam'||id==='builderTeam'?'team':id==='dbSeason'||id==='builderSeason'?'season':'size';if(type==='season'&&!team||type==='size'&&(!team||!season)){message('Select a team'+(type==='size'?' and season':'')+' first.');$(id).value=previous;return}const raw=prompt(type==='size'?'Enter board width in inches (height is 30 inches):':'Enter new '+type+' name:');if(raw===null){render();return}let name=raw.trim();if(type==='size'){const width=Number(name.replace(/[^0-9.]/g,''));if(!Number.isFinite(width)||width<=0){message('Enter a valid board width.');render();return}name='30x'+String(width)}else if(!name||name==='.'||name==='..'||/[\\/:*?"<>|]/.test(name)){message('Enter a valid '+type+' name without slashes or special filename characters.');render();return}if(expired()){message('Connect Dropbox before adding a '+type+'.');render();return}const folder=type==='team'?base()+'/'+name:type==='season'?base()+'/'+team+'/'+name:base()+'/'+team+'/'+season+'/'+name;await ensureFolders(folder);if(type==='team')folderChoices.teams.add(name);else if(type==='season')folderChoices.seasons.add(team+'/'+name);else folderChoices.sizes.add(team+'/'+season+'/'+name);if(type==='team'){$('dbTeam').innerHTML='';const o=document.createElement('option');o.value=name;$('dbTeam').append(o);$('dbTeam').value=name}else if(type==='season'){$('dbSeason').innerHTML='';const o=document.createElement('option');o.value=name;$('dbSeason').append(o);$('dbSeason').value=name}else{$('dbSize').innerHTML='';const o=document.createElement('option');o.value=name;$('dbSize').append(o);$('dbSize').value=name}render();message('Created '+type+' '+name+' in Dropbox. You can now save artboards here.')}
async function loadFolderChoices(){folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};let result;try{result=await rpc('/files/list_folder',{path:base(),recursive:true,limit:2000})}catch(e){if(String(e).includes('not_found'))return;throw e}let items=[...result.entries];while(result.has_more){result=await rpc('/files/list_folder/continue',{cursor:result.cursor});items.push(...result.entries)}for(const item of items){if(item['.tag']!=='folder')continue;const path=item.path_display||item.path_lower||'';if(!path.toLowerCase().startsWith((base()+'/').toLowerCase()))continue;const parts=path.slice(base().length+1).split('/');if(parts.length===1)folderChoices.teams.add(parts[0]);if(parts.length===2)folderChoices.seasons.add(parts.join('/'));if(parts.length===3&&/^30x/i.test(parts[2]))folderChoices.sizes.add(parts.join('/'))}}
function builderChoices(){
 const teamEl=$('builderTeam'),seasonEl=$('builderSeason');
 const selectedTeam=teamEl.value,selectedSeason=seasonEl.value;
 const teams=[...new Set([...entries.map(e=>e.team),...folderChoices.teams,...brandTeams()])].sort((a,b)=>a.localeCompare(b));
 setOptions('builderTeam',teams,selectedTeam,'','Select team…');
 const team=teamEl.value;
 const seasons=team?[...new Set([...entries.filter(e=>e.team===team).map(e=>e.season),...[...folderChoices.seasons].filter(x=>x.startsWith(team+'/')).map(x=>x.slice(team.length+1))])].sort((a,b)=>a.localeCompare(b)):[];
 setOptions('builderSeason',seasons,selectedSeason,'','Select season…');
}
function syncBuilderProjectSeason(){
 const team=$('builderTeam').value.trim(),season=$('builderSeason').value.trim();
 if(!team||!season||team==='__add__'||season==='__add__')return;
 const project=$('project');
 const next=team+' / '+season;
 if(project.value!==next){project.value=next;project.dispatchEvent(new Event('input',{bubbles:true}));project.dispatchEvent(new Event('change',{bubbles:true}));}
}
async function builderAddCategory(type){
 const team=$('builderTeam').value,season=$('builderSeason').value;
 if(type==='season'&&!team)throw Error('Choose a team before adding a season.');
 const raw=prompt('Enter new '+(type==='team'?'team':'season')+' name:');
 if(raw===null){builderChoices();return}
 const name=raw.trim();
 if(!name||name==='.'||name==='..'||/[\/:*?"<>|]/.test(name))throw Error('Enter a valid name without slashes or special filename characters.');
 if(expired())throw Error('Connect Dropbox in the Database panel before adding a team or season.');
 const folder=type==='team'?base()+'/'+name:base()+'/'+team+'/'+name;
 await ensureFolders(folder);
 if(type==='team')folderChoices.teams.add(name);else folderChoices.seasons.add(team+'/'+name);
 builderChoices();
 if(type==='team'){$('builderTeam').value=name;builderChoices()}
 else $('builderSeason').value=name;
 syncBuilderProjectSeason();
 render();message('Created '+type+' '+name+' in Dropbox.');
}
async function builderSave(){
 if(expired())throw Error('Connect Dropbox from the Database panel before saving.');
 const ctx={team:$('builderTeam').value.trim(),season:$('builderSeason').value.trim()};
 if(!ctx.team||!ctx.season)throw Error('Select both Team and Season on the builder screen before saving.');
 syncBuilderProjectSeason();
 const project=window.RinkboardBridge.getProject();
 const name=await saveOne(project.activeBoard,ctx);
 render();
 $('builderDbHint').textContent='Saved '+name.name+' to '+ctx.team+' / '+ctx.season+' in Dropbox. Production PDF not regenerated.';
 message('Saved '+name.name+' to '+ctx.team+' / '+ctx.season+'. Production PDF not regenerated.');
}
async function refresh(){if(expired()){state('Not connected');message('Connect Dropbox first.');return}state('Connected');let all;try{all=await listAll()}catch(e){if(String(e).includes('not_found')){entries=[];builderChoices();render();message('Folder not found yet. Select a team and season, then save a rinkboard to create it.');return}throw e}entries=all.map(parseEntry).filter(Boolean);await loadFolderChoices();builderChoices();selectedPaths=new Set([...selectedPaths].filter(p=>entries.some(e=>e.path===p)));exportQuantities=new Map([...exportQuantities].filter(([p])=>entries.some(e=>e.path===p)));render();message(`${entries.length} rinkboard${entries.length===1?'':'s'} found. Click any artboard name to open it in the editor.`)}
function setOptions(id,values,selected,allValue,allLabel){const el=$(id);el.replaceChildren();const first=document.createElement('option');first.value=allValue;first.textContent=allLabel;el.append(first);for(const value of values){const opt=document.createElement('option');opt.value=value;opt.textContent=id==='dbSize'?value.replace('x','″ × ')+'″':value;el.append(opt)}if(id!=='dbSize'){const add=document.createElement('option');add.value='__add__';add.textContent='+ Add new '+(id==='dbTeam'||id==='builderTeam'?'team':'season')+'…';el.append(add);}el.value=values.includes(selected)?selected:allValue}
const collapsedSizes=new Set();
function setAllSizesCollapsed(collapse){
 document.querySelectorAll('#dbGrid .dbSizeGroup').forEach(section=>{
  const key=section.dataset.sizeKey;
  if(!key)return;
  if(collapse)collapsedSizes.add(key);else collapsedSizes.delete(key);
  section.classList.toggle('dbSizeHidden',collapse);
  const btn=section.querySelector('.dbSizeToggle');
  if(btn){btn.textContent=collapse?'Show':'Hide';btn.setAttribute('aria-expanded',String(!collapse));}
 });
}
function render(){const team=$('dbTeam').value,season=$('dbSeason').value,size=$('dbSize').value,search=$('dbSearch').value.toLowerCase();const teams=[...new Set([...entries.map(x=>x.team),...folderChoices.teams,...brandTeams()])].sort((a,b)=>a.localeCompare(b));setOptions('dbTeam',teams,team,'','All teams');const seasons=[...new Set([...entries.filter(x=>!team||x.team===team).map(x=>x.season),...([...folderChoices.seasons].filter(x=>x.startsWith(team+"/"))).map(x=>x.slice(team.length+1))])].sort((a,b)=>a.localeCompare(b));setOptions('dbSeason',seasons,season,'','All seasons');const actualSeason=$('dbSeason').value;const matching=entries.filter(x=>(!team||x.team===team)&&(!actualSeason||x.season===actualSeason));const sizes=[...new Set([...matching.map(x=>x.size),...([...folderChoices.sizes].filter(x=>x.startsWith(team+"/"+actualSeason+"/"))).map(x=>x.split("/").pop())])].sort((a,b)=>parseFloat(a.slice(3))-parseFloat(b.slice(3)));setOptions('dbSize',sizes,size,'all','All sizes');let visible=matching.filter(x=>($('dbSize').value==='all'||x.size===$('dbSize').value)&&x.name.toLowerCase().includes(search));visibleRecords=visible;updateSelectionCount();hideHoverPreview();let grid=$('dbGrid');grid.replaceChildren();
let toolbar=$('dbSizeVisibility');
if(!toolbar){toolbar=document.createElement('div');toolbar.id='dbSizeVisibility';
 const all=document.createElement('button');all.type='button';all.textContent='Show all sizes';all.onclick=()=>setAllSizesCollapsed(false);
 const none=document.createElement('button');none.type='button';none.textContent='Hide all sizes';none.onclick=()=>setAllSizesCollapsed(true);
 toolbar.append(all,none);grid.parentNode.insertBefore(toolbar,grid);
}
let shownSizes=[...new Set(visible.map(x=>x.size))].sort((a,b)=>parseFloat(a.slice(3))-parseFloat(b.slice(3)));if(!shownSizes.length)shownSizes=[''];for(let sizeName of shownSizes){let section=document.createElement('section');section.className='dbSizeGroup';section.dataset.sizeKey=sizeName;
section.classList.toggle('dbSizeHidden',collapsedSizes.has(sizeName));
if(sizeName){let header=document.createElement('div');header.className='dbSizeHeader';header.tabIndex=0;header.setAttribute('role','button');let title=document.createElement('span');title.textContent=sizeName.replace('x','″ × ')+'″';let count=document.createElement('small');let n=visible.filter(x=>x.size===sizeName).length;count.textContent=n+' rinkboard'+(n===1?'':'s');const toggle=document.createElement('span');toggle.className='dbSizeToggle';
const isHidden=collapsedSizes.has(sizeName);toggle.textContent=isHidden?'Show':'Hide';
header.setAttribute('aria-expanded',String(!isHidden));
header.onclick=()=>{const hidden=!section.classList.contains('dbSizeHidden');
 section.classList.toggle('dbSizeHidden',hidden);
 if(hidden)collapsedSizes.add(sizeName);else collapsedSizes.delete(sizeName);
 toggle.textContent=hidden?'Show':'Hide';header.setAttribute('aria-expanded',String(!hidden));};
header.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();header.click()}};
header.append(title,count,toggle);section.append(header)}let alphabet=document.createElement('div');alphabet.className='dbAlphabet';for(let letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'){let col=document.createElement('div');col.className='dbColumn';let head=document.createElement('div');head.className='dbLetter';head.textContent=letter;col.append(head);let records=visible.filter(x=>(!sizeName||x.size===sizeName)&&(/^[a-z]/i.test(x.name)?x.name[0].toUpperCase():'#')===letter).sort((a,b)=>a.name.localeCompare(b.name));for(let record of records){let wrapper=document.createElement('div');wrapper.className='dbSelectable';let pick=document.createElement('label');pick.className='dbPick';let check=document.createElement('input');check.type='checkbox';check.checked=selectedPaths.has(record.path);check.setAttribute('aria-label','Select '+record.name+' for export');pick.append(check);let qtyLabel=document.createElement('label');qtyLabel.className='dbExportQty';qtyLabel.title='Number of production copies for this artboard';let qtyText=document.createElement('span');qtyText.textContent='Qty';let qtyInput=document.createElement('input');qtyInput.type='number';qtyInput.min='1';qtyInput.max='500';qtyInput.step='1';qtyInput.inputMode='numeric';qtyInput.value=String(exportQuantities.get(record.path)??1);qtyInput.setAttribute('aria-label','Export quantity for '+record.name);qtyInput.onchange=()=>{const n=Number(qtyInput.value);if(Number.isSafeInteger(n)&&n>=1&&n<=500){exportQuantities.set(record.path,n);qtyInput.setCustomValidity('')}else qtyInput.setCustomValidity('Enter a whole number from 1 to 500')};qtyInput.oninput=()=>{const n=Number(qtyInput.value);qtyInput.setCustomValidity(Number.isSafeInteger(n)&&n>=1&&n<=500?'':'Enter a whole number from 1 to 500');if(qtyInput.validity.valid)exportQuantities.set(record.path,n)};qtyLabel.append(qtyText,qtyInput);check.onchange=()=>{if(check.checked)selectedPaths.add(record.path);else selectedPaths.delete(record.path);wrapper.classList.toggle('dbPicked',check.checked);updateSelectionCount()};wrapper.classList.toggle('dbPicked',check.checked);let tile=document.createElement('button');tile.className='dbTile';tile.style.cssText='min-width:0;flex:1;text-align:left';tile.title=`${record.name} · ${record.team} · ${record.season} · ${record.size} — click to edit`;let label=document.createElement('small');label.textContent=record.name;tile.append(label);scheduleCardPreview(tile,record);tile.onclick=()=>perform(()=>openRecord(record));tile.addEventListener('pointerenter',e=>showHoverPreview(record,e));tile.addEventListener('pointermove',moveHoverPreview);tile.addEventListener('pointerleave',hideHoverPreview);tile.addEventListener('focus',e=>showHoverPreview(record,e));tile.addEventListener('blur',hideHoverPreview);wrapper.append(pick,qtyLabel,tile);col.append(wrapper)}if(records.length)alphabet.append(col)}section.append(alphabet);grid.append(section)}}

function updateSelectionCount(){const n=selectedPaths.size;$('dbSelectionCount').textContent=n+' selected';}
function downloadPdf(bytes,name){const blob=new Blob([bytes],{type:'application/pdf'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function deleteSelected(){
 if(expired())throw Error('Connect Dropbox before deleting.');
 const chosen=entries.filter(e=>selectedPaths.has(e.path));
 if(!chosen.length)throw Error('Select one or more rinkboards to delete using the checkboxes.');
 const preview=chosen.slice(0,8).map(e=>`• ${e.team} / ${e.season} / ${e.size} / ${e.name}`).join('\n');
 const extra=chosen.length>8?`\n…and ${chosen.length-8} more.`:'';
 const answer=prompt(`PERMANENTLY DELETE ${chosen.length} selected rinkboard(s) from Dropbox?\n\n${preview}${extra}\n\nTheir saved artwork JSON, preview SVG and production PDF will be deleted. Team logos and team/season folders are not affected.\n\nType DELETE to confirm:`);
 if(answer!=='DELETE'){message('Deletion cancelled.');return}
 let removed=0,failed=[];
 for(const record of chosen){
  // Delete the primary record first. Only remove companion files if that succeeds.
  try{await rpc('/files/delete_v2',{path:record.path});removed++;selectedPaths.delete(record.path);exportQuantities.delete(record.path);if(selectedRecord?.path===record.path)selectedRecord=null}
  catch(err){failed.push(`${record.name}: ${err.message}`);continue}
  for(const path of [record.path.replace(/\.rinkboard\.json$/i,'.preview.svg'),record.path.replace(/\.rinkboard\.json$/i,'.production-100pct.pdf')]){
   try{await rpc('/files/delete_v2',{path})}catch(err){if(!String(err).includes('not_found'))failed.push(`${record.name} companion file: ${err.message}`)}
  }
 }
 await refresh();
 message(`Deleted ${removed} rinkboard(s) from Dropbox.${failed.length?' Some files could not be deleted: '+failed.slice(0,3).join(' | '):''}`);
}
async function exportSelected(){
 const proof=$('dbExportProof').checked,production=$('dbExportProduction').checked;
 if(!proof&&!production)throw Error('Choose Proof PDFs, Production PDFs, or both.');
 const chosen=entries.filter(e=>selectedPaths.has(e.path)).sort((a,b)=>a.team.localeCompare(b.team)||a.season.localeCompare(b.season)||parseFloat(a.width)-parseFloat(b.width)||a.name.localeCompare(b.name));
 if(!chosen.length)throw Error('Select at least one artboard using the checkboxes.');
 const contact=$('dbExportContact').value.trim();
 const proofBoards=[];
 let exported=0;
 for(const record of chosen){
  message(`Loading ${record.name} from Dropbox (${exported+1}/${chosen.length})…`);
  const data=parseSavedProject(await download(record.path),record);
  if(!data.project||!Array.isArray(data.project.boards)||!data.project.boards[0])throw Error('Invalid database project: '+record.name);
  const board=JSON.parse(JSON.stringify(data.project.boards[0]));
  const qty=exportQuantities.get(record.path)??1;
  if(!Number.isSafeInteger(qty)||qty<1||qty>500)throw Error('Invalid export quantity for '+record.name+' (1–500)');
  board.settings.qty=String(qty);
  // Contact is an export-only override; do not modify the saved Dropbox record.
  if(contact)board.settings.contact=contact;
  const stem=[record.team,record.season,record.name,record.size].map(sanitize).join('_');
  if(proof)proofBoards.push(board);
  if(production){
   message('Generating production: '+record.name);
   downloadPdf(await window.RinkboardBridge.exportDatabaseSelection([board],false),stem+'_Production.pdf');
  }
  exported++;
 }
 if(proof){
  message('Generating combined proof PDF for '+proofBoards.length+' artboard(s)…');
  const common=(field,fallback)=>chosen.every(r=>r[field]===chosen[0][field])?chosen[0][field]:fallback;
  const proofStem=chosen.length===1
   ?[chosen[0].team,chosen[0].season,chosen[0].name,chosen[0].size].map(sanitize).join('_')
   :[common('team','MultipleTeams'),common('season','MultipleSeasons'),'Selected-'+chosen.length+'-Artboards',common('size','MixedSizes')].map(sanitize).join('_');
  downloadPdf(await window.RinkboardBridge.exportDatabaseSelection(proofBoards,true),proofStem+'_Proof.pdf');
 }
 message(`Export complete: ${production?exported+' separate production PDF(s)':''}${production&&proof?' and ':''}${proof?'one combined proof PDF':''}. If downloads are missing, allow multiple downloads for this website.`);
}
// On-demand 10%-scale database preview; cached during the session.
const hoverPreviewCache=new Map();
let hoverPreviewRequest=0,hoverPreviewPanel=null,hoverPreviewObjectUrl=null;
function hoverPanel(){
 if(hoverPreviewPanel)return hoverPreviewPanel;
 const panel=document.createElement('div');panel.className='dbHoverPreview';panel.setAttribute('role','tooltip');panel.hidden=true;
 const heading=document.createElement('div');heading.className='dbHoverHeading';
 const body=document.createElement('div');body.className='dbHoverBody';
 panel.append(heading,body);document.body.append(panel);hoverPreviewPanel=panel;return panel;
}
function moveHoverPreview(e){
 const panel=hoverPreviewPanel;if(!panel||panel.hidden)return;
 const rect=panel.getBoundingClientRect(),margin=12;
 const x=e&&typeof e.clientX==='number'?e.clientX:window.innerWidth/2;
 const y=e&&typeof e.clientY==='number'?e.clientY:window.innerHeight/2;
 panel.style.left=Math.max(margin,Math.min(x+18,window.innerWidth-rect.width-margin))+'px';
 panel.style.top=Math.max(margin,Math.min(y+18,window.innerHeight-rect.height-margin))+'px';
}
function hideHoverPreview(){hoverPreviewRequest++;if(hoverPreviewPanel)hoverPreviewPanel.hidden=true;if(hoverPreviewObjectUrl){URL.revokeObjectURL(hoverPreviewObjectUrl);hoverPreviewObjectUrl=null}}
async function showHoverPreview(record,e){
 const request=++hoverPreviewRequest,panel=hoverPanel(),heading=panel.firstElementChild,body=panel.lastElementChild;
 heading.textContent=record.name+' · 10% scale';body.replaceChildren();body.textContent='Loading preview…';panel.hidden=false;moveHoverPreview(e);
 try{
  const previewPath=record.path.replace(/\.rinkboard\.json$/i,'.preview.svg');
  let svg=hoverPreviewCache.get(previewPath);
  if(!svg){svg=await download(previewPath);hoverPreviewCache.set(previewPath,svg)}
  if(request!==hoverPreviewRequest)return;
  // At 96 CSS pixels/inch, one tenth of the physical width is 9.6px per inch.
  const widthInches=Number((record.size.match(/(?:^|x)([0-9]+(?:\.[0-9]+)?)$/i)||[])[1])||147;
  const image=document.createElement('img');image.alt='Preview of '+record.name;
  image.style.width=(widthInches*9.6)+'px';image.style.maxWidth='min(78vw, 100%)';
  image.style.height='auto';
  hoverPreviewObjectUrl=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml'}));
  image.src=hoverPreviewObjectUrl;body.replaceChildren(image);moveHoverPreview(e);
 }catch(err){if(request===hoverPreviewRequest){body.textContent='Preview unavailable';moveHoverPreview(e)}}
}
// Only fetch previews as cards enter the visible database viewport.
let previewObserver;
function scheduleCardPreview(tile,record){
 if(!('IntersectionObserver' in window)){loadPreview(tile,record);return}
 if(!previewObserver)previewObserver=new IntersectionObserver(items=>{
  for(const item of items){if(!item.isIntersecting)continue;previewObserver.unobserve(item.target);
   const rec=item.target._previewRecord;if(rec)loadPreview(item.target,rec);
  }
 },{root:null,rootMargin:'150px'});
 tile._previewRecord=record;previewObserver.observe(tile);
}
async function loadPreview(tile,record){try{const path=record.path.replace(/\.rinkboard\.json$/i,'.preview.svg');let svg=hoverPreviewCache.get(path);if(!svg){svg=await download(path);hoverPreviewCache.set(path,svg)}if(!tile.isConnected)return;let blob=new Blob([svg],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),img=document.createElement('img');img.alt=record.name;img.onload=()=>URL.revokeObjectURL(url);img.onerror=()=>URL.revokeObjectURL(url);img.src=url;tile.prepend(img)}catch{}}
function activeBoard(){let obj=window.RinkboardBridge.getProject();return {obj,board:obj.boards[obj.activeBoard]}}
function context(){let team=$('dbTeam').value.trim(),season=$('dbSeason').value.trim();if(!team||!season)throw Error('Enter a team and season before saving.');return {team,season}}
async function saveOne(index,ctx){
 const project=window.RinkboardBridge.getProject(),board=project.boards[index];
 if(!board)throw Error('Invalid artboard');
 const name=board.settings.sponsor?.trim();
 if(!name)throw Error(`Artboard ${index+1} needs a sponsor name.`);
 const width=String(parseFloat(board.settings.width||147));
 if(!Number.isFinite(Number(width))||Number(width)<=0)throw Error('Invalid board width');
 const folder=parent(ctx.team,ctx.season,width),path=folder+'/'+pathPart(name)+'.rinkboard.json';
 await ensureFolders(folder);
 const samePath=selectedRecord&&selectedRecord.path.toLowerCase()===path.toLowerCase();
 const editingExisting=!!selectedRecord&&index===project.activeBoard;
 // Never silently create a duplicate if the user renamed an opened record.
 if(editingExisting&&!samePath){
  const answer=confirm('This artboard was opened from Dropbox as "'+selectedRecord.name+'". Its name, size or folder has changed.\n\nOK: Save as a NEW record (the original stays).\nCancel: Stop and keep the original unchanged.');
  if(!answer)throw Error('Save cancelled. To overwrite the original, restore its original name, team, season and width.');
 }
 // Get a fresh revision from Dropbox so overwrites target the exact existing file.
 let existing=null;
 try{existing=await rpc('/files/get_metadata',{path})}catch(e){if(!String(e).includes('not_found'))throw e}
 if(existing&&!samePath&&!confirm('A rinkboard named '+name+' already exists in this folder. Overwrite it?'))throw Error('Save cancelled.');
 if(samePath&&existing&&selectedRecord.rev&&existing.rev!==selectedRecord.rev)throw Error('This artboard was changed in Dropbox since you opened it. Refresh and reopen before overwriting.');
 const payload={format:'rinkboard-db-v1',team:ctx.team,season:ctx.season,sponsor:name,width,updatedAt:new Date().toISOString(),project:{version:2,boards:[board],activeBoard:0}};
 // Save the editable project FIRST. A failed PDF must never prevent saving edits.
 const meta=await upload(path,JSON.stringify(payload),existing?.rev||null);
 const record=parseEntry(meta);
 if(record){entries=entries.filter(x=>x.path.toLowerCase()!==path.toLowerCase());entries.push(record);selectedRecord=record;folderChoices.teams.add(record.team);folderChoices.seasons.add(record.team+'/'+record.season);folderChoices.sizes.add(record.team+'/'+record.season+'/'+record.size);builderChoices()}
 try{const svg=window.RinkboardBridge.getBoardPreview(index);void upload(path.replace(/\.rinkboard\.json$/i,'.preview.svg'),svg,null,true).catch(e=>console.warn('Preview update failed',e))}catch(e){console.warn('Preview generation failed',e)}
 // V72: saving editable artwork must not invoke the expensive production PDF engine.
 // The existing production PDF, if any, is not refreshed by this operation.
 return {name,pdfSaved:false,pdfError:'Production PDF not regenerated; export it separately when ready.'};
}
async function saveCurrent(){const ctx=context(),obj=window.RinkboardBridge.getProject(),result=await saveOne(obj.activeBoard,ctx);render();message(`Saved ${result.name} to Dropbox. Production PDF not regenerated; export it separately when ready.`)}
async function saveAll(){const ctx=context(),obj=window.RinkboardBridge.getProject(),done=[];for(let i=0;i<obj.boards.length;i++)done.push(await saveOne(i,ctx));render();message(`Saved ${done.length} editable artboards to Dropbox. Production PDFs not regenerated; export separately when ready.`)}
// V75: Repair all Dropbox previews from saved editable projects, without changing their JSON.
async function rebuildSelectedPreviews(){
 if(expired())throw Error('Connect Dropbox before refreshing previews.');
 const targets=entries.filter(record=>selectedPaths.has(record.path));
 if(!targets.length){message('Select one or more rinkboards using the checkboxes first.');return}
 if(!confirm('Refresh previews for '+targets.length+' selected rinkboard'+(targets.length===1?'':'s')+'?\\n\\nEditable projects and production PDFs will not be changed.'))return;
 const bridge=window.RinkboardBridge;
 if(!bridge?.getProject||!bridge?.openProject||!bridge?.getBoardPreview)throw Error('Artwork editor is not ready');
 const original=bridge.getProject();
 let ok=0,failed=[];
 try{
  for(let i=0;i<targets.length;i++){
   const record=targets[i];
   message('Refreshing selected previews '+(i+1)+' / '+targets.length+': '+record.name);
   try{
    const saved=parseSavedProject(await download(record.path),record);
    if(!saved.project?.boards?.length)throw Error('Missing saved artboard');
    bridge.openProject(saved.project);
    await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const svg=bridge.getBoardPreview(0);
    if(typeof svg!=='string'||!svg.includes('<svg'))throw Error('Generated preview is empty');
    const previewPath=record.path.replace(/\\.rinkboard\\.json$/i,'.preview.svg');
    await upload(previewPath,svg,null,true);
    hoverPreviewCache.delete(previewPath);
    ok++;
   }catch(e){failed.push(record.name+': '+(e.message||e));console.error('Preview rebuild failed',record.path,e)}
  }
 }finally{
  bridge.openProject(original);
  render();
 }
 message('Refreshed '+ok+' / '+targets.length+' selected previews.'+(failed.length?' Failed: '+failed.slice(0,3).join('; ')+(failed.length>3?' (+'+(failed.length-3)+' more; see browser console)':''):''));
}

async function openRecord(record){let data=parseSavedProject(await download(record.path),record);if(!data.project||!Array.isArray(data.project.boards))throw Error('This is not a valid Rinkboard Builder database entry');if(!confirm(`Open ${record.name} in the editor? Unsaved edits in the current project will be lost.`))return;window.RinkboardBridge.openProject(data.project);selectedRecord=record;$('dbTeam').value=record.team;$('dbSeason').value=record.season;builderChoices();$('builderTeam').value=record.team;builderChoices();$('builderSeason').value=record.season;syncBuilderProjectSeason();$('dbOverlay').hidden=true;message(`Opened ${record.name}. Save Current Artboard to update it in Dropbox.`)}
window.addEventListener('rinkboard-brand-changed',event=>{if(event.detail.brand!==activeBrand)perform(()=>changeBrand(event.detail.brand))});
window.RinkboardBandDropbox={
 downloadText:download,
 selectedRecords:()=>entries.filter(e=>selectedPaths.has(e.path)),
 async downloadLogo(name){const path=base()+'/Team Logos/'+name;const res=await fetch(CONTENT+'/files/download',{method:'POST',headers:{Authorization:'Bearer '+ensure(),'Dropbox-API-Arg':JSON.stringify({path})}});if(!res.ok)throw Error('Team logo not found');const blob=await res.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})},
 async uploadLogo(name,file){await ensureFolders(base()+'/Team Logos');return upload(base()+'/Team Logos/'+name,file,null,true)}
};
$('builderDbSave').onclick=()=>perform(builderSave);
$('builderTeam').addEventListener('change',()=>{if($('builderTeam').value==='__add__'){perform(()=>builderAddCategory('team'));return}$('builderSeason').value='';builderChoices();syncBuilderProjectSeason()});
$('builderSeason').addEventListener('change',()=>{if($('builderSeason').value==='__add__'){perform(()=>builderAddCategory('season'));return}syncBuilderProjectSeason()});
$('databaseOpen').onclick=()=>{$('dbOverlay').hidden=false;if(!expired()&&!entries.length)perform(refresh)};$('dbClose').onclick=()=>{hideHoverPreview();$('dbOverlay').hidden=true};$('dbOverlay').addEventListener('click',e=>{if(e.target===$('dbOverlay'))$('dbOverlay').hidden=true});$('dbAppKey').value=config.appKey;$('dbFolder').value=config.folder;$('dbApply').onclick=applyConfig;$('dbConnect').onclick=()=>perform(login);$('dbRefresh').onclick=()=>perform(refresh);$('dbRebuildPreviews').onclick=()=>perform(rebuildSelectedPreviews);$('dbSave').onclick=()=>perform(saveCurrent);$('dbSaveAll').onclick=()=>perform(saveAll);$('dbSelectVisible').onclick=()=>{visibleRecords.forEach(r=>selectedPaths.add(r.path));render()};$('dbClearSelection').onclick=()=>{selectedPaths.clear();render()};$('dbExportSelected').onclick=()=>perform(exportSelected);$('dbDeleteSelected').onclick=()=>perform(deleteSelected);for(let id of ['dbTeam','dbSeason','dbSize'])$(id).addEventListener('change',()=>{if($(id).value==='__add__'){perform(()=>addCategory(id));return}if(id==='dbTeam'){$('dbSeason').value='';$('dbSize').value='all'}if(id==='dbSeason')$('dbSize').value='all';render()});$('dbSearch').addEventListener('input',render);if(!expired()){state('Connected');refresh().catch(e=>{console.error(e);message(e.message)})}completeOAuth().catch(e=>{console.error(e);message(e.message)});
})();

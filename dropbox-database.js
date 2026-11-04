/* Rinkboard Builder — Dropbox shared database. OAuth PKCE; no embedded credentials. */
(()=>{'use strict';
const $=id=>document.getElementById(id), API='https://api.dropboxapi.com/2', CONTENT='https://content.dropboxapi.com/2';
const cfgKey='rinkboard-dropbox-settings-v1',tokenKey='rinkboard-dropbox-session-v1',pkceKey='rinkboard-dropbox-pkce-v1';
let folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};
let config={appKey:'',folder:'/Rinkboard Database'},token=null,entries=[],selectedRecord=null,busy=false,selectedPaths=new Set(),exportQuantities=new Map(),visibleRecords=[];
try{config={...config,...JSON.parse(localStorage.getItem(cfgKey)||'{}')};token=JSON.parse(sessionStorage.getItem(tokenKey)||'null')}catch{}
// V88: Brand-specific database roots. Existing Blast Media settings remain untouched.
const LEAGUE_TEAM='League-Wide';
const isLeague=e=>activeBrand==='bchl'&&e.team===LEAGUE_TEAM;
const inTeam=(e,team)=>!team||e.team===team||isLeague(e);
const inScope=(e,team,season)=>inTeam(e,team)&&(!season||e.season===season);
const BCHL_TEAMS = ["Alberni Valley Bulldogs", "Cowichan Valley Capitals", "Nanaimo Clippers", "Powell River Kings", "Victoria Grizzlies", "Chilliwack Chiefs", "Coquitlam Express", "Langley Rivermen", "Prince George Spruce Kings", "Surrey Eagles", "Cranbrook Bucks", "Salmon Arm Silverbacks", "Trail Smoke Eaters", "Vernon Vipers", "West Kelowna Warriors", "Blackfalds Bulldogs", "Brooks Bandits", "Okotoks Oilers", "Sherwood Park Crusaders", "Spruce Grove Saints"];
const bchlRootKey='rinkboard-bchl-root-v88';
const brandKey='rinkboard-active-brand-v85';
let activeBrand=localStorage.getItem(brandKey)==='bchl'?'bchl':'blast';
let blastFolder=config.folder||'/Rinkboard Database';
function brandRoot(){return activeBrand==='bchl'?(localStorage.getItem(bchlRootKey)||'/BCHL Rinkboards'):blastFolder}
function presetTeams(){return activeBrand==='bchl'?BCHL_TEAMS:[]}
config.folder=brandRoot();
function updateLeagueControl(){const label=$('dbLeagueWideLabel');if(label)label.style.display=activeBrand==='bchl'?'flex':'none'}
async function switchDatabaseBrand(next){
 next=next==='bchl'?'bchl':'blast';
 if(next===activeBrand)return;
 activeBrand=next;config.folder=brandRoot();updateLeagueControl();$('dbFolder').value=config.folder;
 entries=[];selectedRecord=null;selectedPaths.clear();exportQuantities.clear();visibleRecords=[];
 folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};
 $('dbTeam').value='';$('dbSeason').value='';$('dbSize').value='all';
 $('builderTeam').value='';$('builderSeason').value='';
 builderChoices();render();groupRender();
 message(activeBrand==='bchl'?'BCHL: select a team and season, or add a new one.':'Blast Media database selected.');
 if(!expired())await refresh();
}

// V99 — named selection groups. Store only paths and quantities, never artwork or credentials.
// V111 — selections are scoped to the selected team AND season, not globally by brand.
const groupLegacyKey=()=>`rinkboard-selection-groups-v99:${activeBrand}:${base().toLowerCase()}`;
function groupScope(){
 const team=($('dbGroupTeam')?.value||$('dbTeam')?.value||'').trim();
 const season=($('dbGroupSeason')?.value||$('dbSeason')?.value||'').trim();
 return {team,season};
}
function groupScopeOptions(){
 const teamSel=$('dbGroupTeam'),seasonSel=$('dbGroupSeason');if(!teamSel||!seasonSel)return;
 const mainTeam=$('dbTeam')?.value||'',mainSeason=$('dbSeason')?.value||'';
 const previousTeam=teamSel.value||mainTeam,previousSeason=seasonSel.value||mainSeason;
 const teams=[...new Set([...entries.filter(e=>!isLeague(e)).map(e=>e.team),...[...folderChoices.teams].filter(t=>activeBrand!=='bchl'||t!==LEAGUE_TEAM),...presetTeams(),mainTeam])].filter(Boolean).sort((a,b)=>a.localeCompare(b));
 teamSel.replaceChildren(new Option('Select team…',''));for(const team of teams)teamSel.add(new Option(team,team));
 teamSel.value=teams.includes(previousTeam)?previousTeam:'';
 const team=teamSel.value;
 const seasons=[...new Set([...entries.filter(e=>inTeam(e,team)).map(e=>e.season),...[...folderChoices.seasons].filter(x=>x.startsWith(team+'/')).map(x=>x.slice(team.length+1)),...(team===mainTeam?[mainSeason]:[])])].filter(Boolean).sort((a,b)=>a.localeCompare(b));
 seasonSel.replaceChildren(new Option('Select season…',''));for(const season of seasons)seasonSel.add(new Option(season,season));
 seasonSel.value=seasons.includes(previousSeason)?previousSeason:'';
}
function groupStorageKey(){const {team,season}=groupScope();return `rinkboard-selection-groups-v111:${activeBrand}:${base().toLowerCase()}:${encodeURIComponent(team)}:${encodeURIComponent(season)}`}
function scopedItems(items,team,season){return Array.isArray(items)?items.filter(item=>{const e=entries.find(r=>r.path===item?.path);return e&&inScope(e,team,season)}):[]}
function getGroups(){
 const {team,season}=groupScope();if(!team||!season)return {};
 try{
  const saved=JSON.parse(localStorage.getItem(groupStorageKey())||'null');
  if(saved&&typeof saved==='object'&&!Array.isArray(saved))return saved;
  // One-time, non-destructive migration of old browser-wide groups into each team/year.
  const legacy=JSON.parse(localStorage.getItem(groupLegacyKey())||'{}'),migrated={};
  for(const [name,items] of Object.entries(legacy)){const scoped=scopedItems(items,team,season);if(scoped.length)migrated[name]=scoped}
  localStorage.setItem(groupStorageKey(),JSON.stringify(migrated));return migrated;
 }catch{return {}}
}
function groupStatus(s){const el=$('dbGroupStatus');if(el)el.textContent=s}
function groupRender(){
 groupScopeOptions();
 const sel=$('dbGroupSelect');if(!sel)return;
 const {team,season}=groupScope(),ready=!!(team&&season),current=sel.value;
 const groups=ready?getGroups():{};
 sel.replaceChildren(new Option(ready?'Choose a saved group…':'Select a team and season first…',''));
 for(const name of Object.keys(groups).sort((a,b)=>a.localeCompare(b)))sel.add(new Option(name,name));
 sel.value=Object.prototype.hasOwnProperty.call(groups,current)?current:'';
 for(const id of ['dbGroupSelect','dbGroupLoad','dbGroupDelete']){const el=$(id);if(el)el.disabled=!ready}if($('dbGroupSave'))$('dbGroupSave').disabled=false
 const status=$('dbGroupStatus');if(status)status.textContent=ready?`Saved selections for ${team} / ${season}. Quantities are saved in this browser.`:'Select a team and season to view or save selections.';
}
function groupSave(){
 const {team,season}=groupScope();if(!team||!season){groupStatus('Select a team and season before saving.');return}
 const paths=[...selectedPaths].filter(path=>{const e=entries.find(r=>r.path===path);return e&&inScope(e,team,season)});
 if(!paths.length){groupStatus(`No selected rinkboards belong to ${team} / ${season}. Select artwork in the database first, or choose the team/year that matches your selection.`);return}
 const name=prompt(`Name this selection for ${team} / ${season} (e.g. Wave 2):`,'');if(name===null)return;
 const clean=name.trim();if(!clean||clean.length>80){groupStatus('Enter a group name between 1 and 80 characters.');return}
 const groups=getGroups();if(groups[clean]&&!confirm('Replace saved group "'+clean+'" for '+team+' / '+season+'?'))return;
 groups[clean]=paths.map(path=>({path,qty:exportQuantities.get(path)??1}));
 try{localStorage.setItem(groupStorageKey(),JSON.stringify(groups))}catch(e){groupStatus('Could not save in this browser: '+e.message);return}
 groupRender();$('dbGroupSelect').value=clean;groupStatus(`Saved "${clean}" for ${team} / ${season} with ${paths.length} designs and their quantities.`);
}
function groupLoad(){
 const {team,season}=groupScope(),name=$('dbGroupSelect').value,group=getGroups()[name];
 if(!name||!Array.isArray(group)){groupStatus('Choose a saved group first.');return}
 const restored=scopedItems(group,team,season),missing=group.length-restored.length;
 $('dbTeam').value=team;render();$('dbSeason').value=season;render();
 selectedPaths.clear();exportQuantities.clear();
 for(const item of restored){selectedPaths.add(item.path);const q=Number(item.qty);exportQuantities.set(item.path,Number.isSafeInteger(q)&&q>=1&&q<=500?q:1)}
 render();groupStatus('Loaded "'+name+'" for '+team+' / '+season+': '+restored.length+' designs'+(missing?' ('+missing+' unavailable)':'')+'.');
}
function groupDelete(){
 const {team,season}=groupScope(),name=$('dbGroupSelect').value;if(!name){groupStatus('Choose a group to delete.');return}
 if(!confirm(`Delete "${name}" for ${team} / ${season}? Dropbox artwork will not be deleted.`))return;
 const groups=getGroups();delete groups[name];
 try{localStorage.setItem(groupStorageKey(),JSON.stringify(groups))}catch(e){groupStatus('Could not delete group: '+e.message);return}
 groupRender();groupStatus('Deleted "'+name+'" for '+team+' / '+season+'.');
}
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
 const nextKey=$('dbAppKey').value.trim();
 const nextFolder=$('dbFolder').value.trim().replace(/\/+$/,'')||(activeBrand==='bchl'?'/BCHL Rinkboards':'/Rinkboard Database');
 const changed=nextFolder!==config.folder||nextKey!==config.appKey;
 config.appKey=nextKey;config.folder=nextFolder;
 if(activeBrand==='bchl')localStorage.setItem(bchlRootKey,nextFolder);
 else blastFolder=nextFolder;
 localStorage.setItem(cfgKey,JSON.stringify({appKey:config.appKey,folder:blastFolder}));
 if(changed){entries=[];selectedRecord=null;selectedPaths.clear();exportQuantities.clear();visibleRecords=[];folderChoices={teams:new Set(),seasons:new Set(),sizes:new Set()};builderChoices();render()}
 message('Settings saved. '+(expired()?'Connect Dropbox to authorize your account.':'Click Refresh to load the selected database.'));
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
 const teams=[...new Set([...entries.filter(e=>!isLeague(e)).map(e=>e.team),...[...folderChoices.teams].filter(t=>activeBrand!=='bchl'||t!==LEAGUE_TEAM),...presetTeams()])].sort((a,b)=>a.localeCompare(b));
 setOptions('builderTeam',teams,selectedTeam,'','Select team…');
 const team=teamEl.value;
 const seasons=team?[...new Set([...entries.filter(e=>inTeam(e,team)).map(e=>e.season),...[...folderChoices.seasons].filter(x=>x.startsWith(team+'/')).map(x=>x.slice(team.length+1))])].sort((a,b)=>a.localeCompare(b)):[];
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
async function refresh(){if(expired()){state('Not connected');message('Connect Dropbox first.');return}state('Connected');let all;try{all=await listAll()}catch(e){if(String(e).includes('not_found')){entries=[];builderChoices();render();message('No Dropbox folder yet for this brand. Select a team and season, then save a rinkboard to create it.');return}throw e}entries=all.map(parseEntry).filter(Boolean);await loadFolderChoices();builderChoices();selectedPaths=new Set([...selectedPaths].filter(p=>entries.some(e=>e.path===p)));exportQuantities=new Map([...exportQuantities].filter(([p])=>entries.some(e=>e.path===p)));render();groupRender();message(`${entries.length} rinkboard${entries.length===1?'':'s'} found. Click any artboard name to open it in the editor.`)}
function setOptions(id,values,selected,allValue,allLabel){const el=$(id);el.replaceChildren();const first=document.createElement('option');first.value=allValue;first.textContent=allLabel;el.append(first);for(const value of values){const opt=document.createElement('option');opt.value=value;opt.textContent=id==='dbSize'?value.replace('x','″ × ')+'″':value;el.append(opt)}if(id!=='dbSize'){const add=document.createElement('option');add.value='__add__';add.textContent='+ Add New '+(id==='dbTeam'||id==='builderTeam'?'Team':'Season / Year')+'…';el.append(add);}el.value=values.includes(selected)?selected:allValue}
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
function render(){const team=$('dbTeam').value,season=$('dbSeason').value,size=$('dbSize').value,search=$('dbSearch').value.toLowerCase();const teams=[...new Set([...entries.filter(x=>!isLeague(x)).map(x=>x.team),...[...folderChoices.teams].filter(t=>activeBrand!=='bchl'||t!==LEAGUE_TEAM),...presetTeams()])].sort((a,b)=>a.localeCompare(b));setOptions('dbTeam',teams,team,'','All teams');const seasons=[...new Set([...entries.filter(x=>inTeam(x,team)).map(x=>x.season),...([...folderChoices.seasons].filter(x=>x.startsWith(team+"/"))).map(x=>x.slice(team.length+1))])].sort((a,b)=>a.localeCompare(b));setOptions('dbSeason',seasons,season,'','All seasons');const actualSeason=$('dbSeason').value;const matching=entries.filter(x=>inScope(x,team,actualSeason));const sizes=[...new Set([...matching.map(x=>x.size),...([...folderChoices.sizes].filter(x=>x.startsWith(team+"/"+actualSeason+"/"))).map(x=>x.split("/").pop())])].sort((a,b)=>parseFloat(a.slice(3))-parseFloat(b.slice(3)));setOptions('dbSize',sizes,size,'all','All sizes');let visible=matching.filter(x=>($('dbSize').value==='all'||x.size===$('dbSize').value)&&x.name.toLowerCase().includes(search));visibleRecords=visible;updateSelectionCount();let grid=$('dbGrid');grid.replaceChildren();
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
header.append(title,count,toggle);section.append(header)}let alphabet=document.createElement('div');alphabet.className='dbAlphabet';for(let letter of 'ABCDEFGHIJKLMNOPQRSTUVWXYZ#'){let col=document.createElement('div');col.className='dbColumn';let head=document.createElement('div');head.className='dbLetter';head.textContent=letter;col.append(head);let records=visible.filter(x=>(!sizeName||x.size===sizeName)&&(/^[a-z]/i.test(x.name)?x.name[0].toUpperCase():'#')===letter).sort((a,b)=>a.name.localeCompare(b.name));for(let record of records){let wrapper=document.createElement('div');wrapper.className='dbSelectable';let pick=document.createElement('label');pick.className='dbPick';let check=document.createElement('input');check.type='checkbox';check.checked=selectedPaths.has(record.path);check.setAttribute('aria-label','Select '+record.name+(isLeague(record)?' (league-wide)':'')+' for export');pick.append(check);let qtyLabel=document.createElement('label');qtyLabel.className='dbExportQty';qtyLabel.title='Number of production copies for this artboard';let qtyText=document.createElement('span');qtyText.textContent='Qty';let qtyInput=document.createElement('input');qtyInput.type='number';qtyInput.min='1';qtyInput.max='500';qtyInput.step='1';qtyInput.inputMode='numeric';qtyInput.value=String(exportQuantities.get(record.path)??1);qtyInput.setAttribute('aria-label','Export quantity for '+record.name);qtyInput.onchange=()=>{const n=Number(qtyInput.value);if(Number.isSafeInteger(n)&&n>=1&&n<=500){exportQuantities.set(record.path,n);qtyInput.setCustomValidity('')}else qtyInput.setCustomValidity('Enter a whole number from 1 to 500')};qtyInput.oninput=()=>{const n=Number(qtyInput.value);qtyInput.setCustomValidity(Number.isSafeInteger(n)&&n>=1&&n<=500?'':'Enter a whole number from 1 to 500');if(qtyInput.validity.valid)exportQuantities.set(record.path,n)};qtyLabel.append(qtyText,qtyInput);check.onchange=()=>{if(check.checked)selectedPaths.add(record.path);else selectedPaths.delete(record.path);wrapper.classList.toggle('dbPicked',check.checked);updateSelectionCount()};wrapper.classList.toggle('dbPicked',check.checked);let tile=document.createElement('button');tile.className='dbTile';tile.style.cssText='min-width:0;flex:1;text-align:left';tile.title=`${record.name} · ${record.team} · ${record.season} · ${record.size} — click to edit`;let label=document.createElement('small');label.textContent=record.name;tile.append(label);scheduleCardPreview(tile,record);tile.onclick=()=>perform(()=>openRecord(record));wrapper.append(pick,qtyLabel,tile);col.append(wrapper)}if(records.length)alphabet.append(col)}section.append(alphabet);grid.append(section)}}

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
 const zipNeeded=production&&chosen.length>1;
 const zip=zipNeeded?(window.JSZip?new window.JSZip():(()=>{throw Error("ZIP library unavailable. Check your internet connection and reload the builder.")})()):null;
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
   const bytes=await window.RinkboardBridge.exportDatabaseSelection([board],false);
   if(zip)zip.file(stem+'_Production.pdf',bytes);else downloadPdf(bytes,stem+'_Production.pdf');
  }
  exported++;
 }
 if(proof){
  message('Generating combined proof PDF for '+proofBoards.length+' artboard(s)…');
  const common=(field,fallback)=>chosen.every(r=>r[field]===chosen[0][field])?chosen[0][field]:fallback;
  const proofStem=chosen.length===1
   ?[chosen[0].team,chosen[0].season,chosen[0].name,chosen[0].size].map(sanitize).join('_')
   :[common('team','MultipleTeams'),common('season','MultipleSeasons'),'Selected-'+chosen.length+'-Artboards',common('size','MixedSizes')].map(sanitize).join('_');
  const bytes=await window.RinkboardBridge.exportDatabaseSelection(proofBoards,true);
  if(zip)zip.file(proofStem+'_Proof.pdf',bytes);else downloadPdf(bytes,proofStem+'_Proof.pdf');
 }
 if(zip){
  message('Compressing '+exported+' production PDFs'+(proof?' and combined proof':'')+' into ZIP…');
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:4}});
  const label=[chosen.every(r=>r.team===chosen[0].team)?chosen[0].team:'MultipleTeams',chosen.every(r=>r.season===chosen[0].season)?chosen[0].season:'MultipleSeasons','Production-'+exported].map(sanitize).join('_');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=label+'.zip';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);
 }
 message('Export complete: '+(zip?'one ZIP with '+exported+' production PDFs'+(proof?' and the combined proof PDF':''):'PDF download ready')+'.');
}
// On-demand 10%-scale database preview; cached during the session.
const hoverPreviewCache=new Map();
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
 const leagueCheckbox=$('dbLeagueWide');
 const saveShared=activeBrand==='bchl'&&(!!leagueCheckbox?.checked||!!(selectedRecord&&isLeague(selectedRecord)&&!leagueCheckbox));
 const saveTeam=saveShared?LEAGUE_TEAM:ctx.team;
 const folder=parent(saveTeam,ctx.season,width),path=folder+'/'+pathPart(name)+'.rinkboard.json';
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
 const payload={format:'rinkboard-db-v1',team:saveTeam,season:ctx.season,sponsor:name,width,updatedAt:new Date().toISOString(),project:{version:2,boards:[board],activeBoard:0}};
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

async function openRecord(record){let data=parseSavedProject(await download(record.path),record);if(!data.project||!Array.isArray(data.project.boards))throw Error('This is not a valid Rinkboard Builder database entry');if(!confirm(`Open ${record.name} in the editor? Unsaved edits in the current project will be lost.`))return;window.RinkboardBridge.openProject(data.project);selectedRecord=record;if($('dbLeagueWide'))$('dbLeagueWide').checked=isLeague(record);if(!isLeague(record)){$('dbTeam').value=record.team;$('dbSeason').value=record.season;}builderChoices();if(!isLeague(record)){$('builderTeam').value=record.team;builderChoices();}$('builderSeason').value=record.season;syncBuilderProjectSeason();$('dbOverlay').hidden=true;message(`Opened ${record.name}. Save Current Artboard to update it in Dropbox.`)}
window.RinkboardBandDropbox={
 downloadText:download,
 selectedRecords:()=>entries.filter(e=>selectedPaths.has(e.path)),
 async downloadLogo(name){const path=base()+'/Team Logos/'+name;const res=await fetch(CONTENT+'/files/download',{method:'POST',headers:{Authorization:'Bearer '+ensure(),'Dropbox-API-Arg':JSON.stringify({path})}});if(!res.ok)throw Error('Team logo not found');const blob=await res.blob();return await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)})},
 async uploadLogo(name,file){await ensureFolders(base()+'/Team Logos');return upload(base()+'/Team Logos/'+name,file,null,true)},
 async deleteLogo(name){const path=base()+'/Team Logos/'+name;const res=await fetch('https://api.dropboxapi.com/2/files/delete_v2',{method:'POST',headers:{Authorization:'Bearer '+ensure(),'Content-Type':'application/json'},body:JSON.stringify({path})});if(!res.ok&&res.status!==409)throw Error('Could not remove old logo '+name)}
};
window.addEventListener('rinkboard-brand-changed',event=>perform(()=>switchDatabaseBrand(event.detail.brand)));
$('builderDbSave').onclick=()=>perform(builderSave);
$('builderTeam').addEventListener('change',()=>{if($('builderTeam').value==='__add__'){perform(()=>builderAddCategory('team'));return}$('builderSeason').value='';builderChoices();syncBuilderProjectSeason()});
$('builderSeason').addEventListener('change',()=>{if($('builderSeason').value==='__add__'){perform(()=>builderAddCategory('season'));return}syncBuilderProjectSeason()});

// V100: spreadsheet production list importer. Width is a mandatory exact match.
let bulkRows=[],bulkCandidates=[];
const bulkEl=id=>$(id);
function bulkMsg(s){bulkEl('dbBulkStatus').textContent=s}
function bulkNorm(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function bulkWidth(s){const raw=String(s??'').trim().replace(/[“”″]/g,'"').replace(/,/g,'');const m=raw.match(/^(?:30\s*[x×]\s*)?(\d+(?:\.\d+)?)\s*(?:"|in|inch|inches)?$/i);return m?Number(m[1]):NaN}
function bulkCsvLine(line,delimiter){if(delimiter!=='\t'&&delimiter!==',')return line.split(/\s{2,}/);let fields=[],v='',quoted=false;for(let i=0;i<line.length;i++){let c=line[i];if(c==='"'&&(quoted||v==='')){if(quoted&&line[i+1]==='"'){v+='"';i++}else quoted=!quoted}else if(c===delimiter&&!quoted){fields.push(v);v=''}else v+=c}fields.push(v);return fields}
function bulkParse(raw){const lines=String(raw||'').replace(/\r\n?/g,'\n').split('\n').filter(x=>x.trim());const delim=lines.some(x=>x.includes('\t'))?'\t':lines.some(x=>x.includes(','))?',':'spaces';return lines.map((line,i)=>{const cols=bulkCsvLine(line,delim).map(x=>x.trim());return {line:i+1,name:cols[0]||'',width:cols[1]||'',qty:cols[2]||''}}).filter((r,i)=>!(i===0&&/^(sponsor|brand|advertiser|name)$/i.test(r.name)&&/^(width|size|length)/i.test(r.width)))}
function bulkScope(){const team=$('dbBulkTeam').value,season=$('dbBulkSeason').value;if(!team||!season)throw Error('Select a Team and Season in Bulk Import before matching.');return {team,season}}
function bulkResetMatches(){bulkRows=[];bulkEl('dbBulkRows').replaceChildren();bulkEl('dbBulkApply').disabled=true;bulkEl('dbBulkExport').disabled=true}
function bulkFillSelect(el,values,current,placeholder){el.replaceChildren(new Option(placeholder,''));for(const v of values)el.add(new Option(v,v));el.value=values.includes(current)?current:''}
function bulkUpdateSeasons(current){const team=bulkEl('dbBulkTeam').value;const seasons=[...new Set([...entries.filter(e=>inTeam(e,team)).map(e=>e.season),...[...folderChoices.seasons].filter(s=>s.startsWith(team+'/')).map(s=>s.slice(team.length+1))])].sort((a,b)=>a.localeCompare(b));bulkFillSelect(bulkEl('dbBulkSeason'),seasons,current,'Select season…')}
function bulkOpenScope(){const teams=[...new Set([...entries.filter(e=>!isLeague(e)).map(e=>e.team),...[...folderChoices.teams].filter(t=>activeBrand!=='bchl'||t!==LEAGUE_TEAM),...presetTeams()])].sort((a,b)=>a.localeCompare(b));const currentTeam=bulkEl('dbBulkTeam').value||$('dbTeam').value;const currentSeason=bulkEl('dbBulkSeason').value||$('dbSeason').value;bulkFillSelect(bulkEl('dbBulkTeam'),teams,currentTeam,'Select team…');bulkUpdateSeasons(currentSeason)}
function bulkSyncDatabase(){const {team,season}=bulkScope();$('dbTeam').value=team;$('dbSeason').value='';render();$('dbSeason').value=season;render();if($('dbGroupTeam')){$('dbGroupTeam').value=team;groupScopeOptions();$('dbGroupSeason').value=season;}groupRender();if($('dbTeam').value!==team||$('dbSeason').value!==season)throw Error('Could not apply the selected team and season to the Database. Refresh the database and try again.')}

function bulkCandidatesFor(row,scope){const w=bulkWidth(row.width);if(!Number.isFinite(w))return [];return entries.filter(e=>inScope(e,scope.team,scope.season)&&Number(e.width)===w)}
// V101: contextual sponsor matching. The width gate is never relaxed.
function bulkWords(s){return String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/&/g,' and ').replace(/[^a-z0-9]+/g,' ').trim().split(/\s+/).filter(Boolean)}
function bulkEditDistance(a,b){const prev=Array.from({length:b.length+1},(_,i)=>i);for(let i=1;i<=a.length;i++){let diagonal=prev[0];prev[0]=i;for(let j=1;j<=b.length;j++){const old=prev[j];prev[j]=Math.min(prev[j]+1,prev[j-1]+1,diagonal+(a[i-1]===b[j-1]?0:1));diagonal=old}}return prev[b.length]}
function bulkNameParts(name,width){let words=bulkWords(name);const w=String(width);words=words.filter((word,i)=>!(word===w||word===w+'in'||word==='30x'+w||word==='30'||word==='inch'||word==='inches'||word==='rinkboard'||word==='rinkboards'||word==='production'||word==='proof'||word==='final'||word==='artwork'||word==='pdf'||word==='bands'));return words}
function bulkMatchName(record,row){
 const targetWords=bulkNameParts(row.name,bulkWidth(row.width));const nameWords=bulkNameParts(record.name,bulkWidth(row.width));
 const target=targetWords.join(''),name=nameWords.join('');if(!target||!name)return 0;
 if(target===name)return 100;
 const synonyms={playnow:'playnow',play:'play',bw:'bestwestern',bwp:'bestwesternplus',kpmg:'kpmg',dpworld:'dpworld',saveon:'saveonfoods',saveonfoods:'saveonfoods',timhortons:'timhortons',tims:'timhortons',rbc:'rbc',royalbank:'rbc',bclc:'bclc'};
 const alias=v=>synonyms[v]||v;
 if(alias(target)===alias(name))return 97;
 if(target.length>=4&&name.includes(target))return Math.max(76,94-Math.min(18,name.length-target.length));
 if(name.length>=4&&target.includes(name))return Math.max(73,92-Math.min(18,target.length-name.length));
 const overlap=targetWords.filter(t=>nameWords.some(n=>t===n||alias(t)===alias(n))).length;
 const union=new Set([...targetWords,...nameWords]).size;
 const jaccard=union?overlap/union:0;
 const maxLen=Math.max(target.length,name.length),edit=bulkEditDistance(target,name);
 const similarity=1-edit/maxLen;
 const commonPrefix=(()=>{let n=0;while(n<Math.min(target.length,name.length)&&target[n]===name[n])n++;return n})();
 let score=Math.round(65*similarity+30*jaccard);
 if(commonPrefix>=4)score+=8;
 if(overlap>=2)score+=9;
 // Avoid weak accidental matches, especially short sponsor names.
 return Math.min(95,score);
}
function bulkRender(){const body=bulkEl('dbBulkRows');body.replaceChildren();let ready=0,needsReview=0;for(const r of bulkRows){const tr=document.createElement('tr');for(const val of [r.line,r.name,r.width,r.qty]){const td=document.createElement('td');td.textContent=String(val);tr.append(td)}const td=document.createElement('td');if(r.options?.length){const select=document.createElement('select');select.style.maxWidth='330px';select.add(new Option('Choose matching artwork…',''));for(const item of r.options){const label=item.e.name+' · '+item.e.size+' ('+item.score+'% match)';select.add(new Option(label,item.e.path))}select.value=r.path||'';select.onchange=()=>{r.path=select.value;bulkUpdate()};td.append(select);if(r.path){const tag=document.createElement('span');tag.style.cssText='display:block;font-size:11px;color:#146c43;margin-top:3px';tag.textContent=r.auto?'✓ Strong match — auto-selected':'✓ Match confirmed';td.append(tag);td.className='dbBulkGood'}else{const hint=document.createElement('span');hint.style.cssText='display:block;font-size:11px;color:#a32222;margin-top:3px';hint.textContent=r.options[0].score>=55?'Suggested matches — please confirm':'Low-confidence suggestions — verify artwork';td.append(hint);td.className='dbBulkBad';needsReview++}}else{td.textContent=r.error||'No suitable artwork with the exact width';td.className='dbBulkBad';needsReview++}tr.append(td);body.append(tr);if(r.path&&Number.isSafeInteger(Number(r.qty))&&Number(r.qty)>=1&&Number(r.qty)<=500)ready++}bulkMsg(ready+' of '+bulkRows.length+' rows ready. '+(bulkRows.length-ready)+' need review. Width must match exactly.');bulkEl('dbBulkApply').disabled=ready!==bulkRows.length||!ready;bulkEl('dbBulkExport').disabled=true}
function bulkUpdate(){bulkRender()}
function bulkMatch(){try{const scope=bulkScope();bulkSyncDatabase();bulkRows=bulkParse(bulkEl('dbBulkPaste').value);if(!bulkRows.length)throw Error('Paste at least one production-list row.');for(const r of bulkRows){r.path='';r.auto=false;r.options=[];r.error='';const w=bulkWidth(r.width),qty=Number(r.qty);if(!Number.isFinite(w)){r.error='Missing or invalid width';continue}if(!Number.isSafeInteger(qty)||qty<1||qty>500){r.error='Quantity required (1–500)';continue}const candidates=bulkCandidatesFor(r,scope).map(e=>({e,score:bulkMatchName(e,r)})).filter(x=>x.score>=42).sort((a,b)=>b.score-a.score||a.e.name.localeCompare(b.e.name));r.options=candidates.slice(0,8);if(!r.options.length){r.error='No plausible sponsor at this exact width';continue}const first=r.options[0],second=r.options[1];if(first.score>=94&&(!second||first.score-second.score>=12)){r.path=first.e.path;r.auto=true}}bulkRender()}catch(e){bulkMsg(e.message);bulkEl('dbBulkApply').disabled=true}}
function bulkApply(){if(bulkEl('dbBulkApply').disabled)return;try{bulkSyncDatabase()}catch(e){bulkMsg(e.message);return}const name=bulkEl('dbBulkName').value.trim();if(!name||name.length>80){bulkMsg('Enter a saved group name (1–80 characters).');return}const paths=new Set();for(const r of bulkRows){if(!r.path||!Number.isSafeInteger(Number(r.qty))||Number(r.qty)<1||Number(r.qty)>500){bulkMsg('Resolve every row first.');return}if(paths.has(r.path)){bulkMsg('The same artwork appears more than once. Combine those quantities in the source list.');return}paths.add(r.path)}const groups=getGroups();if(groups[name]&&!confirm('Replace saved group "'+name+'"?'))return;const items=bulkRows.map(r=>({path:r.path,qty:Number(r.qty)}));groups[name]=items;try{localStorage.setItem(groupStorageKey(),JSON.stringify(groups))}catch(e){bulkMsg('Could not save group: '+e.message);return}selectedPaths.clear();exportQuantities.clear();for(const item of items){selectedPaths.add(item.path);exportQuantities.set(item.path,item.qty)}groupRender();$('dbGroupSelect').value=name;render();bulkMsg('Saved "'+name+'" and selected '+items.length+' designs. You can now export proofs or courier labels.');bulkEl('dbBulkExport').disabled=false}
async function bulkReadFile(file){const ext=file.name.split('.').pop().toLowerCase();if(ext==='xlsx'||ext==='xls'){if(!window.XLSX)throw Error('Spreadsheet reader could not load. Paste cells directly instead.');const wb=window.XLSX.read(await file.arrayBuffer(),{type:'array'});const sheet=wb.Sheets[wb.SheetNames[0]];return window.XLSX.utils.sheet_to_csv(sheet,{FS:'\t',RS:'\n',blankrows:false})}return await file.text()}
$('dbBulkOpen').onclick=()=>{bulkOpenScope();bulkResetMatches();bulkEl('dbBulkOverlay').hidden=false;bulkMsg('Select team and season, paste a production list, then Match & Review.')};
bulkEl('dbBulkTeam').addEventListener('change',()=>{bulkUpdateSeasons('');bulkResetMatches();bulkMsg('Team changed. Select a season and match again.')});
bulkEl('dbBulkSeason').addEventListener('change',()=>{bulkResetMatches();bulkMsg('Season changed. Match & Review again before applying.')});
$('dbBulkClose').onclick=()=>bulkEl('dbBulkOverlay').hidden=true;
$('dbBulkOverlay').addEventListener('click',e=>{if(e.target===bulkEl('dbBulkOverlay'))bulkEl('dbBulkOverlay').hidden=true});
$('dbBulkFile').addEventListener('change',async e=>{const file=e.target.files[0];if(!file)return;try{bulkEl('dbBulkPaste').value=await bulkReadFile(file);bulkMsg('Loaded '+file.name+'. Click Match & Review.')}catch(err){bulkMsg(err.message)}});
$('dbBulkMatch').onclick=bulkMatch;
$('dbBulkApply').onclick=bulkApply;
$('dbBulkExport').onclick=()=>{bulkEl('dbBulkOverlay').hidden=true;$('dbExportProof').checked=true;perform(exportSelected)};

updateLeagueControl();$('databaseOpen').onclick=()=>{$('dbOverlay').hidden=false;if(!expired()&&!entries.length)perform(refresh)};$('dbClose').onclick=()=>{$('dbOverlay').hidden=true};$('dbOverlay').addEventListener('click',e=>{if(e.target===$('dbOverlay'))$('dbOverlay').hidden=true});$('dbAppKey').value=config.appKey;$('dbFolder').value=config.folder;$('dbApply').onclick=applyConfig;$('dbConnect').onclick=()=>perform(login);$('dbRefresh').onclick=()=>perform(refresh);$('dbRebuildPreviews').onclick=()=>perform(rebuildSelectedPreviews);$('dbSave').onclick=()=>perform(saveCurrent);$('dbSaveAll').onclick=()=>perform(saveAll);$('dbGroupSave').onclick=groupSave;$('dbGroupLoad').onclick=groupLoad;$('dbGroupDelete').onclick=groupDelete;groupRender();
 $('dbGroupTeam')?.addEventListener('change',()=>{$('dbGroupSeason').value='';groupScopeOptions();groupRender()});
 $('dbGroupSeason')?.addEventListener('change',groupRender);
 $('dbSelectVisible').onclick=()=>{visibleRecords.forEach(r=>selectedPaths.add(r.path));render()};$('dbClearSelection').onclick=()=>{selectedPaths.clear();render()};$('dbExportSelected').onclick=()=>perform(exportSelected);$('dbDeleteSelected').onclick=()=>perform(deleteSelected);for(let id of ['dbTeam','dbSeason','dbSize'])$(id).addEventListener('change',()=>{if($(id).value==='__add__'){perform(()=>addCategory(id));return}if(id==='dbTeam'){$('dbSeason').value='';$('dbSize').value='all'}if(id==='dbSeason')$('dbSize').value='all';render();if(id==='dbTeam'||id==='dbSeason')groupRender()});$('dbSearch').addEventListener('input',render);if(!expired()){state('Connected');refresh().catch(e=>{console.error(e);message(e.message)})}completeOAuth().catch(e=>{console.error(e);message(e.message)});

// V96 Courier Label: use the exact database selection and its export quantities.
const courierEl=id=>document.getElementById(id);
const courierEsc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let courierSelected=[];
function courierItems(){return entries.filter(e=>selectedPaths.has(e.path)).map(e=>({...e,qty:exportQuantities.get(e.path)??1}));}
function courierTotal(){return courierSelected.reduce((sum,e)=>sum+e.qty,0)}
// Layout is based on distinct artwork count, never the sum of printed quantities.
function courierLayout(count){
  if(count===1)return {cols:1,width:344,height:82,gapX:0,gapY:0};
  if(count<=4)return {cols:2,width:169,height:70,gapX:7,gapY:9};
  const cols=4, rows=Math.ceil(count/cols), gapY=5;
  return {cols,width:95,height:Math.min(43,(177-(rows-1)*gapY)/rows),gapX:6,gapY};
}
function courierFitImage(doc,data,x,y,w,h){
  const props=doc.getImageProperties(data);
  const ratio=Math.min(w/props.width,h/props.height);
  const dw=props.width*ratio,dh=props.height*ratio;
  doc.addImage(data,'PNG',x+(w-dw)/2,y+(h-dh)/2,dw,dh,undefined,'FAST');
}

const courierReturnAddresses={
 canada:['1213 FRANCES ST','VANCOUVER, B.C. V6A 1Z4'],
 usa:['1875 W. COMMONWEALTH AVE, UNIT H','FULLERTON, CA 92833']
};
function courierReturnLines(){return courierReturnAddresses[courierEl('courierReturnAddress')?.value]||courierReturnAddresses.canada}
function courierReturnUpdate(){const preview=courierEl('courierReturnPreview');if(preview)preview.textContent=courierReturnLines().join('\\n')}
function courierText(){const heading=courierEl('courierDate').value.trim().toUpperCase();const attention=courierEl('courierName').value.trim().toUpperCase();const location=courierEl('courierLocation').value.trim().toUpperCase();return heading+'\n\nATTN: '+attention+'\n'+location}
// Load the supplied Neo Sans Bold into jsPDF so the printed PDF matches the on-screen label.
let courierFontData=null;
async function courierSetPdfFont(doc){
  try{
    if(!courierFontData){const r=await fetch('NeoSansBoldTR.ttf');if(!r.ok)throw Error('Font file unavailable');const bytes=new Uint8Array(await r.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));courierFontData=btoa(binary)}
    doc.addFileToVFS('NeoSansBoldTR.ttf',courierFontData);doc.addFont('NeoSansBoldTR.ttf','NeoSansCourier','bold');doc.setFont('NeoSansCourier','bold');return true;
  }catch(err){throw new Error('Neo Sans Bold font could not be loaded. Keep NeoSansBoldTR.ttf beside index.html and reload. '+(err.message||err))}
}
function courierUpdate(){courierEl('courierShip').textContent=courierText();courierEl('courierContents').textContent='CONTENTS: ( '+courierTotal()+' ) RINKBOARDS'}
function courierSvgToPng(svg){return new Promise((resolve,reject)=>{const blob=new Blob([svg],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),img=new Image();img.onload=()=>{try{const canvas=document.createElement('canvas');canvas.width=600;canvas.height=180;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,600,180);const ratio=Math.min(600/img.width,180/img.height);ctx.drawImage(img,(600-img.width*ratio)/2,(180-img.height*ratio)/2,img.width*ratio,img.height*ratio);// Crop the white board margins so sponsor artwork remains legible in dense labels.
 const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
 let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
 for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
   const k=(y*canvas.width+x)*4;
   const a=pixels.data[k+3],r=pixels.data[k],g=pixels.data[k+1],b=pixels.data[k+2];
   if(a>32&&Math.min(r,g,b)<225){
     if(x<left)left=x;if(x>right)right=x;if(y<top)top=y;if(y>bottom)bottom=y;
   }
 }
 if(right>=left&&bottom>=top){
   const pad=8;
   left=Math.max(0,left-pad);top=Math.max(0,top-pad);
   right=Math.min(canvas.width-1,right+pad);bottom=Math.min(canvas.height-1,bottom+pad);
   const cropped=document.createElement('canvas');
   cropped.width=right-left+1;cropped.height=bottom-top+1;
   cropped.getContext('2d').drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
   resolve(cropped.toDataURL('image/png'));
 }else resolve(canvas.toDataURL('image/png'))}catch(e){reject(e)}finally{URL.revokeObjectURL(url)}};img.onerror=()=>{URL.revokeObjectURL(url);reject(Error('Preview SVG could not be rendered'))};img.src=url})}
async function courierOpen(){courierReturnUpdate();courierSelected=courierItems();if(!courierSelected.length){message('Select rinkboards using the database checkboxes before creating a courier label.');return}if(courierSelected.some(e=>!Number.isSafeInteger(e.qty)||e.qty<1||e.qty>500)){message('Check the selected quantities (1–500).');return}courierEl('courierOverlay').hidden=false;courierEl('courierItems').replaceChildren();courierEl('courierArtwork').replaceChildren();courierEl('courierArtwork').dataset.count=String(courierSelected.length);const header=document.querySelector('.brand-logo')||document.querySelector('.brand img');if(header)courierEl('courierBlastLogo').src=header.dataset.originalSrc||header.src;courierSelected.forEach(e=>{const tr=document.createElement('tr');for(const val of [e.name,e.size,String(e.qty)]){const td=document.createElement('td');td.textContent=val;tr.append(td)}courierEl('courierItems').append(tr);const tile=document.createElement('div');tile.className='courierArt';const fallback=document.createElement('span');fallback.textContent=e.name;tile.append(fallback);courierEl('courierArtwork').append(tile)});courierEl('courierSummary').textContent=courierSelected.length+' selected designs · '+courierTotal()+' total rinkboards';courierUpdate();courierEl('courierStatus').textContent='Loading artwork previews from Dropbox…';let failed=0;for(let i=0;i<courierSelected.length;i++){const e=courierSelected[i],tile=courierEl('courierArtwork').children[i];try{const svg=await download(e.path.replace(/\.rinkboard\.json$/i,'.preview.svg'));const png=await courierSvgToPng(svg);e.courierImage=png;tile.replaceChildren();const img=new Image();img.src=png;img.alt=e.name;img.title=e.name+' × '+e.qty;tile.append(img)}catch(err){failed++;console.warn('Courier artwork preview failed:',e.name,err)}}courierEl('courierStatus').textContent=failed?failed+' artwork previews unavailable; names will be printed instead.':'Ready to download.'}
async function courierExport(){if(!courierSelected.length)return;const btn=courierEl('courierExport');btn.disabled=true;try{if(!window.jspdf?.jsPDF)throw Error('PDF library is not loaded. Reload while connected to the internet.');const doc=new window.jspdf.jsPDF({orientation:'landscape',unit:'pt',format:[792,396],compress:true});const neoFontReady=await courierSetPdfFont(doc);doc.setDrawColor(35);doc.setLineWidth(1.3);doc.rect(12,12,768,372);const logo=courierEl('courierBlastLogo');if(logo?.complete&&logo.naturalWidth){try{const c=document.createElement('canvas');c.width=logo.naturalWidth;c.height=logo.naturalHeight;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(logo,0,0);doc.addImage(c.toDataURL('image/png'),'PNG',35,32,200,70,undefined,'FAST')}catch(err){console.warn('Brand logo skipped',err)}}doc.setFont('helvetica','normal');doc.setFontSize(10);doc.setCharSpace(0);const returnLines=courierReturnLines();doc.text(returnLines[0],35,116);doc.text(returnLines[1],35,131);const layout=courierLayout(courierSelected.length),gridY=courierSelected.length===1?183:159;
for(let i=0;i<courierSelected.length;i++){
 const e=courierSelected[i],x=35+(i%layout.cols)*(layout.width+layout.gapX),y=gridY+Math.floor(i/layout.cols)*(layout.height+layout.gapY);
 if(y+layout.height>335)break;
 doc.setDrawColor(130);doc.setLineWidth(.5);doc.rect(x,y,layout.width,layout.height);
 if(e.courierImage){try{courierFitImage(doc,e.courierImage,x+3,y+3,layout.width-6,layout.height-6)}catch(err){doc.setFontSize(7);doc.text(e.name.slice(0,40),x+4,y+layout.height/2,{maxWidth:layout.width-8})}}
 else{doc.setFontSize(7);doc.text(e.name.slice(0,40),x+4,y+layout.height/2,{maxWidth:layout.width-8})}
}
doc.setFont('NeoSansCourier','bold');doc.setFontSize(15);doc.setCharSpace(1.4);doc.text('CONTENTS: ( '+courierTotal()+' ) RINKBOARDS',35,355);doc.setFont('NeoSansCourier','bold');doc.setFontSize(13);doc.setCharSpace(3.0);const lines=courierText().split('\n');let y=66;for(const line of lines){if(line){const wrapped=doc.splitTextToSize(line,305);for(const part of wrapped){doc.text(part,460,y);y+=24}}else y+=22}const date=new Date().toISOString().slice(0,10);const team=courierSelected.every(e=>e.team===courierSelected[0].team)?courierSelected[0].team:'MixedTeams';const name=(team+'_CourierLabel_'+date).replace(/[^a-z0-9_-]/gi,'');doc.save(name+'.pdf');courierEl('courierStatus').textContent='Courier label downloaded.'}catch(e){courierEl('courierStatus').textContent=e.message||String(e)}finally{btn.disabled=false}}
function courierInit(){courierEl('courierReturnAddress')?.addEventListener('change',courierReturnUpdate);courierReturnUpdate();courierEl('dbCourierOpen')?.addEventListener('click',()=>perform(courierOpen));courierEl('courierClose')?.addEventListener('click',()=>courierEl('courierOverlay').hidden=true);courierEl('courierOverlay')?.addEventListener('click',e=>{if(e.target===courierEl('courierOverlay'))courierEl('courierOverlay').hidden=true});for(const id of ['courierName','courierLocation','courierDate'])courierEl(id)?.addEventListener('input',courierUpdate);courierEl('courierExport')?.addEventListener('click',courierExport)}

courierInit();
})();

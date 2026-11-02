#target illustrator
/*
Blast Media — Illustrator PDF Finalizer (V60)
Run in Illustrator: File > Scripts > Other Script.
Choose the Production PDF downloaded from Rinkboard Builder.
Creates editable Artwork and Thru Cut layers, assigns spot swatch,
and saves a new Illustrator-editable PDF beside the source.
*/
(function () {
 var input=File.openDialog("Choose Rinkboard Builder production PDF","*.pdf");
 if(!input)return;
 var doc;
 try {doc=app.open(input);}catch(e){alert("Could not open PDF: "+e);return;}
 function getLayer(name){
  try{return doc.layers.getByName(name);}catch(e){var l=doc.layers.add();l.name=name;return l;}
 }
 function spot(){
  var s;
  try{s=doc.spots.getByName("ThruCut");}catch(e){s=doc.spots.add();s.name="ThruCut";}
  s.colorType=ColorModel.SPOT;
  var c=new RGBColor();c.red=0;c.green=0;c.blue=255;s.color=c;
  var sc=new SpotColor();sc.spot=s;sc.tint=100;return sc;
 }
 function isCutColor(c){
  if(!c)return false;
  if(c.typename==="SpotColor")return c.spot.name.replace(/\s/g,"").toLowerCase()==="thrucut";
  if(c.typename==="RGBColor")return c.red<1&&c.green<1&&c.blue>254;
  return false;
 }
 function isCutPath(p){
  try{
   if(!p.stroked||!isCutColor(p.strokeColor))return false;
   // Cut paths have no fill and extend across the trim.
   if(p.filled&&p.fillColor.typename!=="NoColor")return false;
   return true;
  }catch(e){return false;}
 }
 function collect(group,found){
  for(var i=group.pageItems.length-1;i>=0;i--){
   var item=group.pageItems[i];
   if(item.typename==="GroupItem")collect(item,found);
   else if(item.typename==="PathItem"&&isCutPath(item))found.push(item);
   else if(item.typename==="CompoundPathItem"){
    var hit=false;
    for(var k=0;k<item.pathItems.length;k++)if(isCutPath(item.pathItems[k])){hit=true;break;}
    if(hit)found.push(item);
   }
  }
 }
 try{
  var paths=[],i;
  for(i=0;i<doc.layers.length;i++)collect(doc.layers[i],paths);
  if(!paths.length)throw Error("No blue ThruCut paths found. Original PDF left open and unchanged.");
  var artwork=getLayer("Artwork"),thru=getLayer("Thru Cut"),ink=spot();
  // Move cut paths first, preserving imported artwork.
  for(i=0;i<paths.length;i++){
   var p=paths[i];p.move(thru,ElementPlacement.PLACEATEND);
   if(p.typename==="PathItem"){p.strokeColor=ink;p.stroked=true;p.filled=false;}
   else for(var j=0;j<p.pathItems.length;j++){
    p.pathItems[j].strokeColor=ink;p.pathItems[j].stroked=true;p.pathItems[j].filled=false;
   }
  }
  // Consolidate other imported layers into Artwork without flattening vectors.
  var existing=[];
  for(i=0;i<doc.layers.length;i++)existing.push(doc.layers[i]);
  for(i=0;i<existing.length;i++){
   var layer=existing[i];
   if(layer===artwork||layer===thru)continue;
   try{layer.locked=false;layer.visible=true;}catch(e){}
   for(var j=layer.pageItems.length-1;j>=0;j--){
    var obj=layer.pageItems[j];
    if(obj.parent===layer)obj.move(artwork,ElementPlacement.PLACEATEND);
   }
  }
  thru.zOrder(ZOrderMethod.BRINGTOFRONT);
  var out=File(input.path+"/"+input.name.replace(/\.pdf$/i,"")+"_Illustrator.pdf");
  var options=new PDFSaveOptions();
  options.preserveEditability=true;
  options.generateThumbnails=true;
  options.viewAfterSaving=false;
  doc.saveAs(out,options);
  alert("Saved Illustrator-editable PDF:\n"+out.fsName+"\n\n"+paths.length+" cut path(s) moved to Thru Cut layer.\nCheck spot colour, geometry and artwork before production.");
 }catch(err){alert("Finalization stopped: "+err.message+"\nThe input PDF was not overwritten.");}
})();

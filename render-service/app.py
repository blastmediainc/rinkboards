import io, os
from pathlib import Path
from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from PIL import Image, ImageCms
import pikepdf
from pikepdf import Name, Dictionary, Array, Stream

app=Flask(__name__)
app.config['MAX_CONTENT_LENGTH']=int(os.environ.get('MAX_UPLOAD_MB','120'))*1024*1024
CORS(app,resources={r'/convert':{'origins':['https://blastmediainc.github.io']}})
PROFILE=Path(__file__).with_name('CoatedGRACoL2006.icc')
TRANSFORM=ImageCms.buildTransformFromOpenProfiles(ImageCms.createProfile('sRGB'),ImageCms.getOpenProfile(str(PROFILE)),'RGB','CMYK',renderingIntent=0)

@app.get('/health')
def health():return {'status':'ok','profile':PROFILE.name}

@app.post('/convert')
def convert():
 file=request.files.get('file')
 if not file:return jsonify(error='Missing PDF file'),400
 data=file.read()
 if not data.startswith(b'%PDF-'):return jsonify(error='Invalid PDF'),400
 try:
  with pikepdf.open(io.BytesIO(data)) as pdf:
   ocgs=pdf.Root.get('/OCProperties',Dictionary()).get('/OCGs',Array())
   names={str(o.get('/Name','')) for o in ocgs}
   if not {'Artwork','Thru Cut'}.issubset(names):raise ValueError('Required Artwork / Thru Cut layers are missing')
   count=0
   for obj in pdf.objects:
    if not isinstance(obj,pikepdf.Stream) or obj.get('/Subtype')!=Name('/Image'):continue
    if obj.get('/ColorSpace')!=Name('/DeviceRGB') or int(obj.get('/BitsPerComponent',0))!=8:continue
    if '/SMask' in obj or '/Mask' in obj:raise ValueError('Unexpected image transparency; conversion stopped')
    w=int(obj['/Width']);h=int(obj['/Height']);raw=obj.read_bytes()
    if len(raw)!=w*h*3:raise ValueError('Unexpected image layout; conversion stopped')
    converted=ImageCms.applyTransform(Image.frombytes('RGB',(w,h),raw),TRANSFORM)
    obj.write(converted.tobytes(),filter=Name('/FlateDecode'))
    obj['/ColorSpace']=Name('/DeviceCMYK')
    if '/DecodeParms' in obj:del obj['/DecodeParms']
    if '/Decode' in obj:del obj['/Decode']
    count+=1
   if not count:raise ValueError('No RGB artwork images found for conversion')
   # Reject any RGB image XObjects left behind, including unexpected encodings.
   for obj in pdf.objects:
    if isinstance(obj,pikepdf.Stream) and obj.get('/Subtype')==Name('/Image') and obj.get('/ColorSpace')==Name('/DeviceRGB'):
     raise ValueError('An RGB image remains unconverted')
   if not any('/ThruCut' in str(o) for o in pdf.objects if isinstance(o,pikepdf.Array)):
    raise ValueError('ThruCut spot-colour definition missing')
   profile_stream=Stream(pdf,PROFILE.read_bytes())
   profile_stream['/N']=4
   intent=Dictionary(Type=Name('/OutputIntent'),S=Name('/GTS_PDFX'),OutputConditionIdentifier='Coated GRACoL 2006',Info='Coated GRACoL 2006',DestOutputProfile=profile_stream)
   pdf.Root['/OutputIntents']=Array([pdf.make_indirect(intent)])
   output=io.BytesIO();pdf.save(output,compress_streams=True)
   output.seek(0)
   return send_file(output,mimetype='application/pdf',as_attachment=True,download_name='production_Gracol_CMYK.pdf')
 except Exception as e:
  app.logger.exception('Conversion failed')
  return jsonify(error=str(e)),422

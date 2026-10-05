"""Render the existing editable master WITHOUT rebuilding its shared objects.

blender --background renders/master/pixel-clash-intro-master.blend
  --python-exit-code 1 --python dev-tools/blender/render-master.py --
  --profile desktop|mobile|mobile-lite|all --render | --preview-frame 115 | --inspect
"""
import argparse
import json
import sys
from pathlib import Path
import bpy

ROOT = Path(__file__).resolve().parents[2]
PROFILES = {'desktop': (1920,1080), 'mobile': (1080,1920), 'mobile-lite': (720,1280)}
parser = argparse.ArgumentParser()
parser.add_argument('--profile', choices=[*PROFILES,'all'], default='desktop')
parser.add_argument('--render', action='store_true')
parser.add_argument('--preview-frame', type=int)
parser.add_argument('--inspect', action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
scene = bpy.context.scene
assert len(bpy.data.scenes) == 1, 'Expected a single shared 3D scene'
names = ['Camera_Desktop','Camera_Arrow_Desktop','Camera_Target_Desktop',
         'Camera_Mobile','Camera_Arrow_Mobile','Camera_Target_Mobile']
assert all(name in bpy.data.objects for name in names), 'Master cameras missing'
if args.inspect:
    print('MASTER_VERIFIED',json.dumps({'sceneCount':len(bpy.data.scenes),'cameras':names,
        'frames':[scene.frame_start,scene.frame_end],'fps':scene.render.fps,
        'meshCount':sum(obj.type=='MESH' for obj in scene.objects),
        'portals':[name for name in bpy.data.collections.keys() if name.startswith('PIXEL_PORTAL_')]}),flush=True)
else:
    for profile in list(PROFILES) if args.profile=='all' else [args.profile]:
        base = 'desktop' if profile=='desktop' else 'mobile'
        cameras = [bpy.data.objects[name] for name in names[:3] if base=='desktop'] or [bpy.data.objects[name] for name in names[3:]]
        scene.render.resolution_x,scene.render.resolution_y = PROFILES[profile]
        scene.render.resolution_percentage = 100
        scene.timeline_markers.clear()
        for frame,camera in zip([1,156,196],cameras):
            scene.timeline_markers.new(camera.name,frame=frame).camera = camera
        scene.camera = cameras[0]
        for name in ['desktop','mobile']:
            collection = bpy.data.collections['PIXEL_PORTAL_'+name.upper()]
            collection.hide_render = collection.hide_viewport = name!=base
        if args.preview_frame:
            if hasattr(scene.render.image_settings,'media_type'): scene.render.image_settings.media_type='IMAGE'
            scene.render.image_settings.file_format='PNG'
            scene.render.resolution_percentage=50
            scene.frame_set(args.preview_frame)
            scene.render.filepath=str(ROOT/'renders'/'previews'/('master-'+profile+'-%03d.png'%args.preview_frame))
            bpy.ops.render.render(write_still=True)
        elif args.render:
            if hasattr(scene.render.image_settings,'media_type'): scene.render.image_settings.media_type='VIDEO'
            scene.render.image_settings.file_format='FFMPEG'
            scene.render.ffmpeg.format='MPEG4'; scene.render.ffmpeg.codec='H264'
            scene.render.ffmpeg.constant_rate_factor='MEDIUM' if profile=='mobile-lite' else 'HIGH'
            scene.render.ffmpeg.ffmpeg_preset='GOOD'; scene.render.ffmpeg.audio_codec='NONE'
            scene.render.filepath=str(ROOT/'renders'/('pixel-clash-intro-'+profile+'.mp4'))
            scene.frame_set(1)
            bpy.ops.render.render(animation=True)
        else:
            print('PROFILE_READY',profile,flush=True)

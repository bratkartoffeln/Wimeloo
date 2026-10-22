"""Split downloaded WevoLabs Studio recordings into exact offline utterances.

Entirely local: no HTTP, browser, API, or authentication use.
Example:
  python split_studio_audio.py studio-block-01.mp3 studio-block-02.mp3 studio-block-03.mp3

The long pauses supplied by the ordinary Studio's [[p3000]] feature delimit
utterances. A count mismatch is an error; the program never guesses alignment.
voices.js is written only after all expected clips pass validation.
"""
from pathlib import Path
from datetime import datetime, timezone
import argparse
import array
import hashlib
import json
import re
import shutil
import subprocess
import tempfile
import wave

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT/'voice-source'
WEB = ROOT/'www'

def run(args):
    result = subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
    if result.returncode:
        raise RuntimeError('Command failed: '+str(args[0])+'\n'+result.stderr[-1800:])
    return result

def long_silences(wav_path,duration,threshold,min_pause):
    result=run(['ffmpeg','-hide_banner','-nostats','-i',str(wav_path),'-af',f'silencedetect=noise={threshold}dB:d={min_pause}','-f','null','-'])
    silences=[]; start=None
    for line in result.stderr.splitlines():
        match=re.search(r'silence_start:\s*([\d.]+)',line)
        if match: start=float(match.group(1))
        match=re.search(r'silence_end:\s*([\d.]+)',line)
        if match and start is not None:
            end=float(match.group(1))
            # Leading/trailing silence cannot be an inter-utterance delimiter.
            if start>.12 and end<duration-.12:
                silences.append((start,end))
            start=None
    return silences

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('inputs',nargs='*',type=Path,help='Studio MP3s in block order')
    parser.add_argument('--mapping',type=Path,default=WORK/'studio-blocks.json')
    parser.add_argument('--output',type=Path,default=WEB/'audio')
    parser.add_argument('--voices',type=Path,default=WEB/'voices.js')
    parser.add_argument('--required-lines',type=Path,default=ROOT/'tests/voice-lines.json',help='Only package the exact runtime utterances from this JSON array')
    parser.add_argument('--threshold',type=float,default=-45,help='Silence level in dB')
    parser.add_argument('--min-pause',type=float,default=2.2,help='Minimum delimiter silence, seconds')
    parser.add_argument('--analyze-only',action='store_true',help='Validate boundaries, do not create clips')
    args=parser.parse_args()
    for tool in ['ffmpeg','ffprobe']:
        if not shutil.which(tool): raise SystemExit(tool+' is required')
    mapping=json.loads(args.mapping.read_text(encoding='utf-8'))
    inputs=args.inputs or [WORK/'downloads'/b['audio_file'] for b in mapping['blocks']]
    if len(inputs)!=len(mapping['blocks']): raise SystemExit('Pass exactly one downloaded MP3 per mapped block')
    for path in inputs:
        if not path.is_file(): raise SystemExit('Missing input: '+str(path))
    completed=[]; selected=[]; plans=[]
    previous_manifest = WORK/'voice-manifest.json'
    old_clips = json.loads(previous_manifest.read_text(encoding='utf-8')).get('clips',[]) if previous_manifest.is_file() else []
    with tempfile.TemporaryDirectory(prefix='wevolabs-split-') as temp:
        temp=Path(temp)
        # Validate every recording before producing user-facing audio assets.
        for block,src in zip(mapping['blocks'],inputs):
            pcm=temp/f'block-{block["number"]}.wav'
            run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(src),'-vn','-ac','1','-ar','24000','-c:a','pcm_s16le',str(pcm)])
            with wave.open(str(pcm),'rb') as wav:
                duration=wav.getnframes()/wav.getframerate()
            silence=long_silences(pcm,duration,args.threshold,args.min_pause)
            expected=block['utterances']-1
            print(json.dumps({'block':block['number'],'duration':round(duration,3),'expected_separators':expected,'found_separators':len(silence)},ensure_ascii=False),flush=True)
            if len(silence)!=expected:
                diagnostic={'block':block['number'],'file':str(src),'expected':expected,'found':len(silence),'silences':silence,'duration':duration,'threshold':args.threshold,'min_pause':args.min_pause}
                (WORK/f'split-diagnostic-{block["number"]:02d}.json').write_text(json.dumps(diagnostic,indent=2),encoding='utf-8')
                raise SystemExit('Pause count mismatch. No alignment was guessed; inspect split-diagnostic before proceeding.')
            # Keep 120ms before speech and 180ms after speech. The 3-second
            # intentional separators are removed, not audible sentence pauses.
            spans=[]
            for index,entry in enumerate(block['entries']):
                begin=0 if index==0 else max(0,silence[index-1][1]-.12)
                end=duration if index==len(block['entries'])-1 else min(duration,silence[index][0]+.18)
                if end-begin<.18 or end-begin>180:
                    raise SystemExit('Implausible clip duration; refusing guessed output')
                spans.append((begin,end,entry))
            plans.append((block,src,pcm,spans,duration))
        if args.analyze_only:
            print('All block boundaries match. No files written.')
            return
        args.output.mkdir(parents=True,exist_ok=True)
        for block,src,pcm,spans,duration in plans:
            with wave.open(str(pcm),'rb') as wav:
                rate=wav.getframerate()
                for begin,end,entry in spans:
                    wav.setpos(round(begin*rate));frames=wav.readframes(round((end-begin)*rate))
                    samples=array.array('h',frames)
                    if not samples or max(abs(x) for x in samples)<256:
                        raise SystemExit('Empty or inaudible clip: '+entry['text'])
                    fragment=temp/'clip.wav'
                    with wave.open(str(fragment),'wb') as out:
                        out.setnchannels(1);out.setsampwidth(2);out.setframerate(rate);out.writeframes(frames)
                    dest=args.output/(entry['text_sha256']+'.mp3')
                    run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(fragment),'-c:a','libmp3lame','-b:a','64k','-ar','24000','-ac','1',str(dest)])
                    if dest.stat().st_size<1000: raise SystemExit('Suspicious output size: '+str(dest))
                    completed.append({'text':entry['text'],'text_sha256':entry['text_sha256'],'file':entry['file'],'audio_sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'duration_seconds':round(len(frames)/2/rate,4),'source_block':block['number'],'source_begin_seconds':round(begin,4),'source_end_seconds':round(end,4)})
                    selected.append((entry['text'],entry['file']))
            print('Split block '+str(block['number'])+': '+str(len(spans))+' clips',flush=True)
        if len(completed)!=mapping['total_utterances'] or len(dict(selected))!=mapping['total_utterances']:
            raise SystemExit('Coverage validation failed; voices.js was not written')
        # Studio originals are archival; only the current runtime vocabulary is shipped.
        # Validate every original boundary, then package only the shipped vocabulary.
        required=json.loads(args.required_lines.read_text(encoding='utf-8'))
        if not isinstance(required,list) or not required or len(required)!=len(set(required)):
            raise SystemExit('Required voice lines must be a nonempty unique JSON array')
        by_text={entry['text']:entry for entry in completed}
        missing=[text for text in required if text not in by_text]
        if missing:
            raise SystemExit('Required utterances are missing from the recordings: '+str(missing))
        completed=[by_text[text] for text in required]
        selected=[(entry['text'],entry['file']) for entry in completed]
        keep={Path(entry['file']).name for entry in completed}
        for entry in [*by_text.values(),*old_clips]:
            if not re.fullmatch(r'audio/[0-9a-f]{64}\.mp3',str(entry.get('file',''))): continue
            obsolete=args.output/Path(entry['file']).name
            if obsolete.name not in keep:
                obsolete.unlink(missing_ok=True)
        manifest={
            'schema':1,'status':'generated_from_downloaded_studio_recordings',
            'processed_utc':datetime.now(timezone.utc).isoformat(),
            'provider':'WevoLabs','studio_url':mapping['studio_url'],'terms_url':mapping['terms_url'],
            'terms_updated':mapping['terms_updated'],'voice':mapping['voice'],'voice_display_name':mapping['voice_display_name'],
            'settings':mapping['settings'],'normalization':mapping['normalization'],
            'route':'Normal Studio recordings, downloaded by UI; locally split at Studio pause markers',
            'content':'Original German fictional game narration; no user personal information',
            'postprocessing':'3-second delimiter pauses removed; 24kHz mono PCM segmentation; MP3 at 64kbit/s',
            'total_clips':len(completed),'source_files':[{'block':b['number'],'file':'downloads/'+p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()} for b,p in zip(mapping['blocks'],inputs)],
            'clips':completed
        }
        (WORK/'voice-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
        code='/* Original game narration generated with WevoLabs Seraphina, '+mapping['settings']['speed_display']+'. Bundled for offline use. */\nwindow.VoicePack = Object.freeze('+json.dumps(dict(selected),ensure_ascii=False,indent=2)+');\n'
        pending=args.voices.with_suffix('.js.pending');pending.write_text(code,encoding='utf-8');pending.replace(args.voices)
        print(json.dumps({'status':'complete','clips':len(completed),'bytes':sum(c['bytes'] for c in completed),'voices_file':str(args.voices)},ensure_ascii=False),flush=True)

if __name__=='__main__':
    main()

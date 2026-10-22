"""Prepare ordinary WevoLabs Studio input locally. Makes no network requests."""
from pathlib import Path
from datetime import datetime, timezone
import hashlib
import json
import math
import re
import unicodedata

ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / 'voice-source'
SOURCE = ROOT / 'tests/voice-lines.json'
JOINER = '\n\n[[p3000]]\n\n'

def normalize(text):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', str(text))).strip()

def main():
    source = json.loads(SOURCE.read_text(encoding='utf-8'))
    raw_lines = source if isinstance(source, list) else source['lines']
    lines = list(dict.fromkeys(normalize(line) for line in raw_lines))
    if not lines or any(not line for line in lines):
        raise SystemExit('Invalid voice line list')
    if any(len(line) >= 5000 for line in lines):
        raise SystemExit('A single line exceeds the Studio character limit')
    # Roughly equally sized copy/paste inputs. Exact utterances remain
    # individually mapped; the Studio-provided pause marker is only a separator.
    total = sum(map(len, lines)) + (len(lines)-1)*len(JOINER)
    count = max(3, math.ceil(total / 4700))
    blocks = []
    cursor = 0
    for index in range(count):
        remaining = lines[cursor:]
        if index == count-1:
            selected = remaining
        else:
            remaining_chars = sum(map(len, remaining)) + max(0,len(remaining)-1)*len(JOINER)
            target = remaining_chars / (count-index)
            selected = []
            for line in remaining:
                if selected and len(JOINER.join(selected+[line])) > target:
                    break
                selected.append(line)
        text = JOINER.join(selected)
        if not selected or len(text) >= 5000:
            raise SystemExit('Block allocation exceeded the Studio limit')
        filename = f'studio-block-{index+1:02d}.txt'
        (WORK / filename).write_text(text,encoding='utf-8')
        entries = []
        for order,line in enumerate(selected):
            digest = hashlib.sha256(line.encode('utf-8')).hexdigest()
            entries.append({'global_index':cursor+order,'order':order,'text':line,'text_sha256':digest,'file':f'audio/{digest}.mp3'})
        blocks.append({'number':index+1,'text_file':filename,'audio_file':filename.replace('.txt','.mp3'),'characters':len(text),'utterances':len(entries),'entries':entries})
        cursor += len(selected)
    manifest = {
        'schema':1,'status':'prepared_inputs_only_not_generated',
        'prepared_utc':datetime.now(timezone.utc).isoformat(),
        'source_file':'tests/voice-lines.json','source_sha256':hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        'normalization':'Unicode NFC; collapse whitespace to a single ASCII space; trim',
        'total_utterances':len(lines),'studio_url':'https://wevolabs.com/de',
        'terms_url':'https://wevolabs.com/terms-service','terms_updated':'2026-10-05',
        'voice':'de-DE-SeraphinaMultilingualNeural','voice_display_name':'Seraphina Multi',
        'settings':{'speed_display':'1.00×','rate':0,'pitch_hz':0,'volume_percent':100},
        'separator':'[[p3000]]','generation_route':'ordinary visible Studio; no request batching script',
        'blocks':blocks
    }
    (WORK/'studio-blocks.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
    print(json.dumps({'blocks':[{'file':b['text_file'],'characters':b['characters'],'utterances':b['utterances']} for b in blocks],'total_utterances':len(lines)},ensure_ascii=False,indent=2))

if __name__=='__main__':
    main()

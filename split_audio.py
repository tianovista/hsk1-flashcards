"""
split_audio.py
--------------
Splits HSK-1_Audio_Batch1.m4a by silence using ffmpeg directly.
No pydub needed — uses the ffmpeg binary bundled with imageio-ffmpeg.

Output: public/audio/split/clip_001.mp3, clip_002.mp3, ...
"""

import os
import re
import subprocess
import imageio_ffmpeg

# ── Config ────────────────────────────────────────────────────
INPUT_FILE     = "HSK-1_Audio_Batch1.m4a"
OUTPUT_DIR     = "public/audio/split"
MIN_SILENCE    = 0.6    # seconds of silence required to split
SILENCE_THRESH = -40    # dBFS noise floor (raise e.g. -35 if under-splitting)
PADDING        = 0.08   # seconds of padding to keep around each clip
BITRATE        = "128k"
# ─────────────────────────────────────────────────────────────

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()


def get_duration(path):
    result = subprocess.run(
        [FFMPEG, "-i", path],
        stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True
    )
    m = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", result.stderr)
    if not m:
        raise RuntimeError("Could not read duration from file.")
    h, mn, s = int(m.group(1)), int(m.group(2)), float(m.group(3))
    return h * 3600 + mn * 60 + s


def detect_silences(path):
    """Run ffmpeg silencedetect and return list of (silence_start, silence_end) in seconds."""
    result = subprocess.run(
        [
            FFMPEG, "-i", path,
            "-af", f"silencedetect=noise={SILENCE_THRESH}dB:duration={MIN_SILENCE}",
            "-f", "null", "-"
        ],
        stderr=subprocess.PIPE, stdout=subprocess.PIPE, text=True
    )
    output = result.stderr
    starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", output)]
    ends   = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)",   output)]
    return list(zip(starts, ends))


def extract_clip(path, start, end, out_path):
    duration = end - start
    subprocess.run(
        [
            FFMPEG, "-y",
            "-i", path,
            "-ss", str(start),
            "-t",  str(duration),
            "-ar", "44100",
            "-ab", BITRATE,
            "-f", "mp3",
            out_path
        ],
        stderr=subprocess.DEVNULL, stdout=subprocess.DEVNULL
    )


def main():
    if not os.path.exists(INPUT_FILE):
        print(f"ERROR: '{INPUT_FILE}' not found. Run this from the hsk1-flashcards folder.")
        return

    os.makedirs(OUTPUT_DIR, exist_ok=True)

    print(f"Loading {INPUT_FILE} ...")
    total_dur = get_duration(INPUT_FILE)
    print(f"  Duration: {total_dur:.1f}s")

    print(f"\nDetecting silences (threshold={SILENCE_THRESH}dBFS, min={MIN_SILENCE}s) ...")
    silences = detect_silences(INPUT_FILE)
    print(f"  Found {len(silences)} silence gaps -> {len(silences) + 1} clips")

    # Build speech segment list from silence gaps
    segments = []
    cursor = 0.0
    for (sil_start, sil_end) in silences:
        speech_end = sil_start
        if speech_end - cursor > 0.1:           # skip tiny fragments
            segments.append((cursor, speech_end))
        cursor = sil_end
    # last segment after final silence
    if total_dur - cursor > 0.1:
        segments.append((cursor, total_dur))

    print(f"\nExporting {len(segments)} clips to '{OUTPUT_DIR}/' ...")
    for i, (start, end) in enumerate(segments, 1):
        pad_start = max(0.0, start - PADDING)
        pad_end   = min(total_dur, end + PADDING)
        out_path  = os.path.join(OUTPUT_DIR, f"clip_{i:03d}.mp3")
        extract_clip(INPUT_FILE, pad_start, pad_end, out_path)
        print(f"  [{i:03d}] {pad_start:.2f}s - {pad_end:.2f}s  ({pad_end-pad_start:.2f}s)  -> {out_path}")

    print(f"\nDone! {len(segments)} clips saved to '{OUTPUT_DIR}/'")
    print("Tip: if clips are too short/long, adjust MIN_SILENCE or SILENCE_THRESH at the top of the script.")


if __name__ == "__main__":
    main()

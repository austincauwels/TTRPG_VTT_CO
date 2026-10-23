#!/bin/bash
# Copies the fifth playtest's working files from /home/user/play5 into this branch's results
# folder and pushes them, so an interrupted container loses nothing. Run at least hourly.
#   bash sync.sh [folder name]     default: the run's start date plus -run5
# Set SYNC_TRAILER to the trailer lines the session gives (Co-Authored-By, Claude-Session).
H=$(cd "$(dirname "$0")/.." && pwd)
PT=/home/user/play5
NAME=${1:-$(cat $PT/run_name.txt 2>/dev/null || date -u +%Y-%m-%d-run5)}
echo $NAME > $PT/run_name.txt
OUT=$H/results/$NAME
mkdir -p $OUT/memory $OUT/shots
for f in findings.jsonl table.md table.jsonl build.txt; do [ -f $PT/$f ] && cp $PT/$f $OUT/; done
cp $PT/memory/*.md $OUT/memory/ 2>/dev/null
cp $PT/results/*.json $PT/results/*.md $OUT/ 2>/dev/null
# Only the screenshots findings point at (all of them would be hundreds of MB)
if [ -f $PT/findings.jsonl ]; then
  node -e '
    const fs = require("fs"), path = require("path"); const [pt, out] = process.argv.slice(1);
    for (const l of fs.readFileSync(path.join(pt, "findings.jsonl"), "utf8").split("\n").filter(Boolean)) {
      for (const s of JSON.parse(l).shots || []) {
        const src = path.isAbsolute(s) ? s : path.join(pt, s);
        if (!src.startsWith(pt + "/shots/") || !fs.existsSync(src)) continue;
        const dst = path.join(out, path.relative(pt, src));
        fs.mkdirSync(path.dirname(dst), { recursive: true }); fs.copyFileSync(src, dst);
      }
    }' $PT $OUT
fi
cd $H
git add -A results/$NAME
git diff --cached --quiet && { echo "nothing new"; exit 0; }
git commit -q -m "Fifth playtest: work in progress $(date -u +%H:%M) UTC" -m "Findings, table talk and seat notes so far." ${SYNC_TRAILER:+-m "$SYNC_TRAILER"} && echo "committed"
for d in 2 4 8 16; do git push -q -u origin playtest-harness && { echo "pushed"; exit 0; }; sleep $d; done
echo "push failed"; exit 1

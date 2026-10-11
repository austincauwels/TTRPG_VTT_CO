#!/bin/bash
# Copies the second playtest's text results into the playtest-harness worktree and pushes them
# (work in progress, so an interrupted container keeps them). Screenshots stay local.
PT=/home/user/pt2; H=/home/user/harness; OUT=$H/playtest/results/2026-10-11
mkdir -p $OUT/memory
cp -f $PT/findings.jsonl $PT/table.md $PT/table.jsonl $PT/personas.md $OUT/ 2>/dev/null
cp -f $PT/memory/*.md $OUT/memory/ 2>/dev/null
cp -f $PT/act*_result.json $PT/regress_result.json $PT/report.json $PT/report.md $OUT/ 2>/dev/null
cd $H && git add playtest/results/2026-10-11 && \
  git -c user.name="Claude" -c user.email="noreply@anthropic.com" commit -qm "Second playtest: work in progress $(date -u +%H:%M) UTC" \
    -m "Findings, table talk and seat notes so far." \
    -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NVyHd7WyWQwbWErvoui4Fc" >/dev/null 2>&1
for d in 2 4 8 16; do git push -q origin playtest-harness 2>&1 && break; sleep $d; done

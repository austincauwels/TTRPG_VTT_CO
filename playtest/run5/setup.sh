#!/bin/bash
# Sets up the fifth playtest: the run folder /home/user/play5 and a read-only checkout of the
# build beta serves at /home/user/sut. Safe to run again (keeps memory, findings and talk).
#   bash setup.sh [commit]     commit: the build deployed to beta (default: origin/main)
set -e
H=$(cd "$(dirname "$0")/.." && pwd)    # this harness checkout's playtest folder
PT=/home/user/play5
SUT=/home/user/sut
COMMIT=${1:-origin/main}

mkdir -p $PT/memory $PT/logs $PT/shots $PT/scripts $PT/results $PT/assets
cp $H/lib.js $H/seat.js $H/seats_daemon.js $H/table.js $H/finding.js $H/package.json $PT/
cp $H/run5/README.md $PT/README.md
cp $H/run5/personas.md $H/run5/start_all.sh $PT/
cp $H/run5/seats.json $PT/seats.json
cp $H/run5/assets/*.jpg $PT/assets/
echo https://candela-beta.gatergrid.com > $PT/site.txt
[ -d $PT/node_modules/playwright ] || (cd $PT && npm install --no-audit --no-fund)

# The source the agents read, at the deployed commit
git -C $H fetch -q origin main
if [ -d $SUT ]; then git -C $SUT checkout -q --detach $COMMIT; else git -C $H worktree add -q --detach $SUT $COMMIT; fi
git -C $SUT rev-parse --short HEAD > $PT/build.txt
echo "play5 ready; source at $(cat $PT/build.txt)"
# The beta password reaches the site either as a network secret (the proxy adds it) or as
# CANDELA_BETA_USER and CANDELA_BETA_PASS in the environment. Either way the pages answer 200.
code=$(curl -s -m 10 -o /dev/null -w '%{http_code}' ${CANDELA_BETA_PASS:+-u "$CANDELA_BETA_USER:$CANDELA_BETA_PASS"} "$(cat $PT/site.txt)/")
[ "$code" = 200 ] && echo "beta password: works (pages 200)" || echo "beta password: NOT WORKING (pages $code); Robert adds it in the environment settings and starts a new chat"

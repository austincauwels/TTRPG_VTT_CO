#!/bin/bash
# Sets up the third playtest: the run folder /home/user/pt3 and a read-only checkout of the
# build beta serves at /home/user/sut. Safe to run again (keeps memory, findings and talk).
#   bash setup.sh [commit]     commit: the build deployed to beta (default: origin/main)
set -e
H=$(cd "$(dirname "$0")/.." && pwd)    # this harness checkout's playtest folder
PT=/home/user/pt3
SUT=/home/user/sut
COMMIT=${1:-origin/main}

mkdir -p $PT/memory $PT/logs $PT/shots $PT/scripts $PT/results $PT/assets
cp $H/lib.js $H/seat.js $H/seats_daemon.js $H/table.js $H/finding.js $H/package.json $PT/
cp $H/run3/README.md $PT/README.md
cp $H/run3/personas.md $H/run3/start_all.sh $PT/
cp $H/run3/seats.json $PT/seats.json
cp $H/run3/assets/*.jpg $PT/assets/
echo https://candela-beta.gatergrid.com > $PT/site.txt
[ -d $PT/node_modules/playwright ] || (cd $PT && npm install --no-audit --no-fund)

# The source the agents read, at the deployed commit
git -C $H fetch -q origin main
if [ -d $SUT ]; then git -C $SUT checkout -q --detach $COMMIT; else git -C $H worktree add -q --detach $SUT $COMMIT; fi
git -C $SUT rev-parse --short HEAD > $PT/build.txt
echo "pt3 ready; source at $(cat $PT/build.txt)"
env | grep -q '^CANDELA_BETA_USER=' && env | grep -q '^CANDELA_BETA_PASS=' && echo "beta password: set" || echo "beta password: MISSING (add CANDELA_BETA_USER and CANDELA_BETA_PASS to the environment)"

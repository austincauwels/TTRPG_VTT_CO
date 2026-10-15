# Fix round 8 working folder

The round ran from `/home/user/pt8` in the container. To rebuild it in a fresh container:
copy `setup_env.sh` and `start_all.sh` to `/home/user/pt8`, run `bash setup_env.sh` (PostgreSQL on 5433,
the Python venv, the control worktree at 1bc48a0 with its build, Playwright, a secret key), then copy the
decisions files from `playtest/results/` and the helpers from `results/2026-10-12-run3/verify/` as the
round did. Change the control commit in `setup_env.sh` to the build under test.

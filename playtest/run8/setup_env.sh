set -x
apt-get install -y postgresql >/dev/null 2>&1 || (apt-get update >/dev/null && apt-get install -y postgresql >/dev/null)
mkdir -p /var/tmp/candela-pg && chown postgres /var/tmp/candela-pg
[ -d /var/tmp/candela-pg/data ] || su postgres -c "/usr/lib/postgresql/16/bin/initdb -D /var/tmp/candela-pg/data -A trust" >/dev/null
bash /home/user/pt8/start_all.sh
python3 -m venv ~/.venv-candela && ~/.venv-candela/bin/pip install -q -r /home/user/TTRPG_VTT_CO/backend/requirements.txt -r /home/user/TTRPG_VTT_CO/backend/requirements-dev.txt
cd /home/user/TTRPG_VTT_CO && git worktree add --detach /home/user/wt/control 1bc48a0
cd /home/user/wt/control/frontend && npm ci --no-audit --no-fund >/dev/null 2>&1 && npx vite build --outDir /tmp/build_control8 >/dev/null 2>&1
echo ".vite.preview.*.config.mjs" >> /home/user/TTRPG_VTT_CO/.git/info/exclude
echo "frontend/node_modules" >> /home/user/TTRPG_VTT_CO/.git/info/exclude
cp /home/user/harness/playtest/package.json /home/user/pt8/ && cd /home/user/pt8 && npm install --no-audit --no-fund >/dev/null 2>&1
python3 -c "import secrets;print(secrets.token_hex(32))" > /home/user/pt8/secret_key
echo SETUP DONE

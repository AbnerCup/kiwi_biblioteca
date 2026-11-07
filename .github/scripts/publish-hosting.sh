#!/usr/bin/env bash
set -euo pipefail

# This directory is a new worktree on the ephemeral GitHub runner.
# Never run cleanup commands against the source checkout or the hosting server.
site_dir="$RUNNER_TEMP/kiwi-hosting"
test ! -e "$site_dir"
test -s dist/index.html
for directory in assets brand posters videos; do
  test -d "dist/$directory"
done

git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
remote_ref="$(git ls-remote --heads origin refs/heads/hosting)"
if [ -n "$remote_ref" ]; then
  git fetch origin hosting
  git worktree add --detach "$site_dir" FETCH_HEAD
  git -C "$site_dir" rm -r --ignore-unmatch .
else
  git worktree add --detach "$site_dir" HEAD
  git -C "$site_dir" switch --orphan hosting
fi

cp -R dist/. "$site_dir/"
cp .github/cpanel/deploy.yml "$site_dir/.cpanel.yml"
printf 'Compiled website for cPanel. Source branch: main.\n' > "$site_dir/.hosting-build"
git -C "$site_dir" add --all
if git -C "$site_dir" diff --cached --quiet; then
  echo 'La rama hosting ya contiene esta compilacion.'
  exit 0
fi
git -C "$site_dir" commit -m "Publicar compilacion de ${GITHUB_SHA}"
git -C "$site_dir" push origin HEAD:refs/heads/hosting

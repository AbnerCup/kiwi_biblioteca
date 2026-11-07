#!/usr/bin/env bash
set -euo pipefail
export PATH=/usr/local/cpanel/3rdparty/bin:/usr/local/cpanel/bin:/usr/local/bin:/usr/bin:/bin
export GIT_TERMINAL_PROMPT=0

repo_dir=/home/metrdpex/repositories/kiwi_biblioteca
stamp_file=/home/metrdpex/.kiwi-deployed-sha
git_bin=/usr/local/cpanel/3rdparty/bin/git

# Keep the lock and deployment stamp outside the Git checkout and public site.
exec 9>/home/metrdpex/.kiwi-sync.lock
/usr/bin/flock -n 9 || exit 0
cd "$repo_dir"
if [ "$("$git_bin" symbolic-ref --short HEAD)" != hosting ]; then
  echo 'ERROR: cPanel debe tener seleccionada la rama hosting.' >&2
  exit 1
fi
if ! "$git_bin" diff --quiet HEAD; then
  echo 'ERROR: hay cambios locales en el hosting. No se sobrescribiran.' >&2
  exit 1
fi

"$git_bin" fetch --quiet origin hosting
"$git_bin" merge --ff-only --quiet FETCH_HEAD
test -f .hosting-build
current_sha="$("$git_bin" rev-parse HEAD)"
deployed_sha=''
if [ -f "$stamp_file" ]; then
  deployed_sha="$(cat "$stamp_file")"
fi
if [ "$current_sha" = "$deployed_sha" ]; then
  exit 0
fi

# cPanel executes .cpanel.yml asynchronously. Only successful deployment writes
# the stamp, so a failed deployment is retried on the next cron invocation.
echo "$(date -u '+%Y-%m-%dT%H:%M:%SZ') Solicitando despliegue de $current_sha"
/usr/local/cpanel/bin/uapi VersionControlDeployment create repository_root="$repo_dir"

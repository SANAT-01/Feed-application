#!/bin/sh
# Runs as root (the Dockerfile's default here) just long enough to fix
# ownership of the media-data volume: Docker creates named volumes owned by
# root:root on first mount, but the app runs as the unprivileged "nodejs"
# user and needs to write uploads into /media, so without this every upload
# fails with EACCES. su-exec then drops to nodejs for the actual process.
set -e
chown -R nodejs:nodejs /media
exec su-exec nodejs "$@"

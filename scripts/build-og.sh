#!/usr/bin/env bash
# Regenerate the Open Graph share card from the landing-page hero.
#
# Not part of `pnpm build` -- it needs ImageMagick, which is a system package,
# and the source art changes about once a year. Run it by hand when the hero
# is re-exported, and commit the result.
#
# 1200x630 is the size every crawler crops to. JPEG rather than PNG: the hero
# is a photographic gradient, so PNG costs ~10x the bytes for no visible gain.
set -euo pipefail

cd "$(dirname "$0")/.."

magick public/img/ethglossary-hero.png \
  -resize 1200x630^ -gravity center -extent 1200x630 \
  -strip -interlace Plane -sampling-factor 4:2:0 -quality 82 \
  public/img/og.jpg

magick identify public/img/og.jpg

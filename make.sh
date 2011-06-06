#!/usr/bin/env bash
# Generate a "web" folder with the
# resources necessary to plug into a website.
mkdir -p -v ./web/lib
mkdir -p -v ./web/data
cp -v ./lib/arbor-graphics.js  ./lib/arbor.js  ./lib/arbor-tween.js  ./lib/graphics.js  ./lib/jquery.1.4.4.min.js  ./lib/jquery.address-1.3.1.min.js ./web/lib/
cp -v ./sol.js ./index.html ./style.css ./web
python ./generate_json.py -i ./data/grupos.txt -o ./web/data/grupos.json


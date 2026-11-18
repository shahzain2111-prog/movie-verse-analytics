#!/usr/bin/env bash
# Load generated JSON into MongoDB and print the four counts.
set -euo pipefail
URI="${MONGO_URI:-mongodb://localhost:27017}"; DB="${DB:-movieverse}"
cd "$(dirname "$0")/.."
python3 pipeline/transform.py data output
for c in movies users ratings tags; do
  mongoimport --uri "$URI" --db "$DB" --collection "$c" --file "output/$c.json" --drop
done
mongosh "$URI/$DB" --quiet --eval '
["movies","users","ratings","tags"].forEach(c => print(c.padEnd(8), db[c].countDocuments()))'
echo "Expected: movies 9742, users 610, ratings 100836, tags 3683"

#!/bin/bash

# Create the directory if it doesn't exist
mkdir -p public/flags/counties

# Download all 15 county flags from Wikipedia
echo "Downloading Liberian County Flags..."

# Bomi County
curl -L "https://upload.wikimedia.org/wikipedia/commons/7/7c/Flag_of_Bomi_County.svg" -o public/flags/counties/bomi.svg
echo "✓ Bomi County flag downloaded"

# Bong County
curl -L "https://upload.wikimedia.org/wikipedia/commons/1/10/Flag_of_Bong_County.svg" -o public/flags/counties/bong.svg
echo "✓ Bong County flag downloaded"

# Gbarpolu County
curl -L "https://upload.wikimedia.org/wikipedia/commons/e/e0/Flag_of_Gbarpolu_County.svg" -o public/flags/counties/gbarpolu.svg
echo "✓ Gbarpolu County flag downloaded"

# Grand Bassa County
curl -L "https://upload.wikimedia.org/wikipedia/commons/9/92/Flag_of_Grand_Bassa_County.svg" -o public/flags/counties/grand-bassa.svg
echo "✓ Grand Bassa County flag downloaded"

# Grand Cape Mount County
curl -L "https://upload.wikimedia.org/wikipedia/commons/5/54/Flag_of_Grand_Cape_Mount_County.svg" -o public/flags/counties/grand-cape-mount.svg
echo "✓ Grand Cape Mount County flag downloaded"

# Grand Gedeh County
curl -L "https://upload.wikimedia.org/wikipedia/commons/a/ae/Flag_of_Grand_Gedeh_County.svg" -o public/flags/counties/grand-gedeh.svg
echo "✓ Grand Gedeh County flag downloaded"

# Grand Kru County
curl -L "https://upload.wikimedia.org/wikipedia/commons/e/e9/Flag_of_Grand_Kru_County.svg" -o public/flags/counties/grand-kru.svg
echo "✓ Grand Kru County flag downloaded"

# Lofa County
curl -L "https://upload.wikimedia.org/wikipedia/commons/5/59/Flag_of_Lofa_County.svg" -o public/flags/counties/lofa.svg
echo "✓ Lofa County flag downloaded"

# Margibi County
curl -L "https://upload.wikimedia.org/wikipedia/commons/0/0f/Flag_of_Margibi_County.svg" -o public/flags/counties/margibi.svg
echo "✓ Margibi County flag downloaded"

# Maryland County
curl -L "https://upload.wikimedia.org/wikipedia/commons/3/3f/Flag_of_Maryland_County.svg" -o public/flags/counties/maryland.svg
echo "✓ Maryland County flag downloaded"

# Montserrado County
curl -L "https://upload.wikimedia.org/wikipedia/commons/d/d8/Flag_of_Montserrado_County.svg" -o public/flags/counties/montserrado.svg
echo "✓ Montserrado County flag downloaded"

# Nimba County
curl -L "https://upload.wikimedia.org/wikipedia/commons/b/b2/Flag_of_Nimba_County.svg" -o public/flags/counties/nimba.svg
echo "✓ Nimba County flag downloaded"

# River Cess County
curl -L "https://upload.wikimedia.org/wikipedia/commons/9/91/Flag_of_River_Cess_County.svg" -o public/flags/counties/river-cess.svg
echo "✓ River Cess County flag downloaded"

# River Gee County
curl -L "https://upload.wikimedia.org/wikipedia/commons/4/49/Flag_of_River_Gee_County.svg" -o public/flags/counties/river-gee.svg
echo "✓ River Gee County flag downloaded"

# Sinoe County
curl -L "https://upload.wikimedia.org/wikipedia/commons/8/89/Flag_of_Sinoe_County.svg" -o public/flags/counties/sinoe.svg
echo "✓ Sinoe County flag downloaded"

echo ""
echo "✅ All 15 county flags downloaded successfully!"
echo "Files saved to: public/flags/counties/"

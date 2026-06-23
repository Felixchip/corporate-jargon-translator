#!/bin/bash
# package-extension.sh
# Creates a clean ZIP for Chrome Web Store submission.
# Run from the project root: bash package-extension.sh

set -e

EXTENSION_NAME="cut-the-bs"
VERSION=$(node -p "require('./manifest.json').version" 2>/dev/null || python3 -c "import json; print(json.load(open('manifest.json'))['version'])")
OUTPUT="${EXTENSION_NAME}-v${VERSION}.zip"

echo "Packaging Cut the BS v${VERSION}..."

# Remove any previous package
rm -f "$OUTPUT"

# Create clean ZIP — exclude dev/meta files that Chrome doesn't need
zip -r "$OUTPUT" . \
  -x ".git/*" \
  -x ".gitignore" \
  -x ".DS_Store" \
  -x "Thumbs.db" \
  -x "*.sh" \
  -x "node_modules/*" \
  -x "*.map" \
  -x "*.log" \
  -x "CHROMEWEBSTORE.md" \
  -x "README.md" \
  -x "CHANGELOG.md" \
  -x "store-assets/*" \
  -x "server/*"

SIZE=$(du -h "$OUTPUT" | cut -f1)
echo ""
echo "Done! Created: $OUTPUT ($SIZE)"
echo ""
echo "Next steps:"
echo "  1. Load unpacked in chrome://extensions and test all features"
echo "  2. Upload $OUTPUT to https://chrome.google.com/webstore/devconsole"
echo "  3. Fill in the store listing using CHROMEWEBSTORE.md"

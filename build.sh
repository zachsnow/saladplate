# Clean.
rm -rf ./dist/*

# Build.
pnpm exec tsc

# The shebang lets us run the script directly as TypeScript
# via `ts-node`, but we need to change it to use `node` in
# the compiled JS.
sed -i '' '1 s/ts-node/node/' ./dist/bin/saladplate.js

# Embed version information in the build executable.
SALADPLATE_VERSION=$(node -e "console.info(require('./package.json').version)")
SALADPLATE_VERSION=$SALADPLATE_VERSION pnpm run saladplate ./dist/bin/saladplate.js --output ./dist/bin/saladplate.js

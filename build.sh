# Build.
pnpm exec tsc

# The shebang lets us run the script directly as TypeScript
# via `ts-node`, but we need to change it to use `node` in
# the compiled JS.
sed -i '' '1 s/ts-node/node/' ./dist/bin/saladplate.js

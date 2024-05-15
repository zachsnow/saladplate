#!/usr/bin/env bash
set -e

echo "Running tests..."

# Clean up previous runs.
rm -rf tests/out/*.out

# Process all tests.
set +e
FOO=fooooo pnpm run saladplate --debug --directory tests/out --suffix .out tests/*.test
STATUS=$?
set -e

# Make sure the run was successful.
if [ $STATUS -ne 0 ]; then
  >&2 echo "Error: failed to run tests."
  exit -1
fi

FAILURE_COUNT=0
SUCCESS_COUNT=0

# Check all passing tests.
for TEST_FILENAME in tests/*.test; do
  # Glob failed to match anything.
  if [[ "$TEST_FILENAME" == 'tests/*.test' ]]; then
    >&2 echo "Error: no tests found."
    exit -1
  fi

  BASENAME=$(basename "$TEST_FILENAME" ".test")
  EXPECTED_FILENAME="tests/${BASENAME}.expected"
  OUTPUT_FILENAME="tests/out/${BASENAME}.out"

  set +e
  diff $OUTPUT_FILENAME $EXPECTED_FILENAME
  STATUS=$?
  set -e

  if [ $STATUS -ne 0 ]; then
    >&2 echo "Error: test failed: $TEST_FILENAME"

    # Don't early out so we see all failures.
    FAILURE_COUNT=$((FAILURE_COUNT + 1))
  else
    SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
  fi
done

if [ "$FAILURE_COUNT" -ne 0 ]; then
  >&2 echo "Error: $FAILURE_COUNT of $TEST_COUNT tests failed."
  exit 1
fi

echo "$SUCCESS_COUNT tests passed."

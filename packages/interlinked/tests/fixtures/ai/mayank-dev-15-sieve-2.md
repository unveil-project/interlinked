## Location
Main scanner entry point

## Issue
If user provides a path that does not exist, the scanner exits with no error — exit code 0, no output. User thinks scan was successful.

## Steps
Run: python scanner.py --path /nonexistent → no error, exit 0

## Expected
Validate path exists. Print "ERROR: Path not found". Return exit code 1.

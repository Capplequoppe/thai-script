---
name: bash-stdout-broken
description: In this repo's agent environment the Bash tool runs commands but never returns stdout — redirect output to a file and read it back instead.
metadata:
  type: reference
---

The Bash tool in this environment executes commands but its stdout capture is
broken: every command returns only `Exit code N` with no output. `echo hello`
returns exit 1, `ls <dir>` returns exit 2 — the exit codes are real (they
reflect a broken stdout fd), the commands do run, and **file redirection
works**.

**How to apply:** never rely on Bash output directly. To list or grep anything:

```
{ find ... ; grep ... ; } > /abs/path/scratch.txt 2>&1; exit 0
```

then Read `/abs/path/scratch.txt`. Note the trailing `; exit 0` — without it
the tool surfaces the pipeline's (bogus) nonzero exit as an error. Write the
scratch file somewhere Read can reach it; `/tmp/claude-*/…/scratchpad` files
appeared empty, but paths inside the repo (e.g. under
`.claude/agent-memory/<agent>/`) worked. Delete it when done.

Exit codes are still a reliable one-bit oracle, e.g.
`[ -e path ] && exit 42 || exit 43`.

Without this workaround there is no directory listing at all — Read/Write/Edit
are the only other tools, and Read on a directory errors with EISDIR. Guessing
plan/task filenames by brute force costs ~20 wasted tool calls.

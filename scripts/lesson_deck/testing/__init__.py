"""Stand-ins that let the pipeline's own behaviour be driven from outside it.

Nothing here is imported by `generate-lesson-deck.py`. The production entry
point builds one vendor, the real one, and has no test mode in it — which is
the point of `Vendor` being a protocol: the retry state machine, the cache and
the manifest can all be exercised end to end without the generator carrying a
branch that only tests take.
"""

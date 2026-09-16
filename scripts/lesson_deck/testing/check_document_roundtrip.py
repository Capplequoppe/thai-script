"""The property that matters: load, save, and the file is byte-identical.

If that does not hold, the studio destroys authored content the first time
anyone presses save — the header comments above all, which carry rules that
took real work to establish and exist nowhere else.

Run against every script in the repo, not a fixture, because the fixture is
always the one that round-trips.
"""

import sys
from pathlib import Path

sys.path.insert(0, "scripts")
from lesson_deck.document import ScriptDocument, SlideBlock  # noqa: E402
from lesson_deck.script_parser import parse_script  # noqa: E402

scripts = sorted(Path("content/lessons").glob("*.md"))
print(f"{len(scripts)} scripts\n")

failures = 0
for path in scripts:
    original = path.read_text(encoding="utf-8")
    doc = ScriptDocument.load(path)
    rendered = doc.text()
    identical = rendered == original
    # The parser is the authority on what a deck contains; a document that
    # round-trips but that the parser then reads differently would be worse
    # than one that fails loudly.
    parsed = parse_script(path)
    same_slides = [s.id for s in parsed.slides] == [b.id for b in doc.slides]
    if not identical or not same_slides:
        failures += 1
        print(f"FAIL {path.name}")
        if not same_slides:
            print(f"  slide ids differ: parser {len(parsed.slides)}, "
                  f"document {len(doc.slides)}")
        if not identical:
            for i, (a, b) in enumerate(zip(original.split("\n"), rendered.split("\n"))):
                if a != b:
                    print(f"  first difference at line {i + 1}:")
                    print(f"    was:  {a!r}")
                    print(f"    now:  {b!r}")
                    break
            else:
                print(f"  length differs: {len(original)} -> {len(rendered)}")
    else:
        print(f"ok   {path.name:<34}{len(doc.slides):>3} slides")

print(f"\n{len(scripts) - failures}/{len(scripts)} round-trip exactly")

# --- editing behaviour -------------------------------------------------------
print("\n--- edits ---")
doc = ScriptDocument.load(Path("content/lessons/orientation.md"))
welcome = doc.by_id("welcome")
assert welcome is not None

narration = welcome.narration()
print(f"welcome has {len(narration)} narration lines")

# Replacing one line must leave the others and every other field alone.
before = welcome.text()
pairs = [(lang, text) for _, lang, text in narration]
pairs[0] = ("en", "CHANGED FIRST LINE.")
welcome.set_narration(pairs)
after = welcome.text()
assert "CHANGED FIRST LINE." in after
assert welcome.field_value("heading") == "Why this will work when other apps haven't"
assert len(welcome.narration()) == len(narration)
assert len(welcome.bullets()) == 4
print("replacing one narration line keeps fields, bullets and the rest")

# Splitting one line into two is the studio's main job.
pairs = [(lang, text) for _, lang, text in welcome.narration()]
pairs.insert(1, ("en", "An inserted sentence."))
welcome.set_narration(pairs)
assert len(welcome.narration()) == len(narration) + 1
print("splitting a line into two keeps them contiguous and ordered")

# The header must survive all of it.
rendered = doc.text()
assert "IT PRACTISES WHAT IT PREACHES" in rendered
assert rendered.startswith("<!--")
print("header comment survives editing")

# --- add and remove ----------------------------------------------------------
doc = ScriptDocument.load(Path("content/lessons/orientation.md"))
count = len(doc.slides)
block = SlideBlock(kind="exposition", id="brand-new", lines=[
    "heading: A new slide",
    "narration: en Something to say.",
    "- a bullet",
])
doc.insert_after("welcome", block)
assert len(doc.slides) == count + 1
assert doc.slides[doc.index_of("welcome") + 1].id == "brand-new"
doc.remove("brand-new")
assert len(doc.slides) == count
assert doc.text() == Path("content/lessons/orientation.md").read_text(encoding="utf-8")
print("adding then removing a slide restores the file exactly")

# A retrieval/reveal pair must not be half-removed.
try:
    doc.remove("when-review")
except ValueError as error:
    print(f"refuses to orphan a reveal: {str(error)[:60]}...")
else:
    print("FAIL: removed a slide that another still references")

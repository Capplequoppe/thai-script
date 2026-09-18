"""The review round trip: a lesson out as a document, edits back in.

Two properties matter and they pull against each other. The transform has to
be *exactly* identity when nothing was edited — otherwise every real edit
smuggles in a change of its own, and twenty lessons of that is a mess nobody
can review. And it has to actually carry an edit through, which a script that
discarded every change would satisfy the first property perfectly well.

So both are tested, and so is the third thing: that a malformed edit leaves
the lesson alone rather than half-written.
"""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import pytest

SCRIPTS = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS))

_spec = importlib.util.spec_from_file_location(
    "lesson_review", SCRIPTS / "lesson-review.py"
)
review = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(review)

from lesson_deck.script_parser import ScriptError  # noqa: E402

LESSON = """# A test lesson

lesson: lesson-test

## exposition meet-ngu
image: images/x/meet-ngu.jpg
scene: A snake rising from a coil of rope on a stone quay at dawn.
glyph: ง
heading: The first voice
narration: en This one is a hum you make at the back of your mouth.
narration: th งอ งู
narration: en That word means snake.
- A hum at the back of the mouth.
- Its word means snake.

## exposition see-ngu
thai: ง
heading: The snake's letter
narration: en A curve, and a head lifting off it.
- The snake's letter.

## retrieval check
reveal: check-answer
prompt: Which letter is the snake's?
narration: en Answer out loud before you turn this over.

## reveal check-answer
retrieval: check
narration: en The one that looks like a head rising off a coil.
- The snake's letter.
"""


@pytest.fixture
def lesson(tmp_path: Path) -> Path:
    path = tmp_path / "lesson-test.md"
    path.write_text(LESSON, encoding="utf-8")
    return path


@pytest.fixture
def document(tmp_path: Path, lesson: Path) -> Path:
    return review.export(lesson, tmp_path / "review.md")


class TestAnUneditedRoundTripChangesNothing:
    def test_the_lesson_is_byte_for_byte_identical(self, lesson, document):
        before = lesson.read_text(encoding="utf-8")
        review.apply(document, lesson)
        assert lesson.read_text(encoding="utf-8") == before

    def test_and_it_says_so_rather_than_claiming_to_have_worked(
        self, lesson, document, capsys
    ):
        review.apply(document, lesson)
        assert "no change" in capsys.readouterr().out


class TestTheDocumentItself:
    def test_carries_what_is_spoken_in_the_order_it_is_said(self, document):
        text = document.read_text(encoding="utf-8")
        hum = text.index("[en] This one is a hum")
        name = text.index("[th] งอ งู")
        means = text.index("[en] That word means snake.")
        assert hum < name < means

    def test_carries_the_picture_direction(self, document):
        assert "**Picture:** A snake rising from a coil" in document.read_text(
            encoding="utf-8"
        )

    def test_carries_the_retrieval_prompt(self, document):
        assert "**Prompt:** Which letter is the snake's?" in document.read_text(
            encoding="utf-8"
        )

    def test_does_not_carry_the_plumbing(self, document):
        """Image paths, glyph anchors and reveal wiring stay in the lesson. A
        reader cannot detach a clip from its slide by editing prose."""
        text = document.read_text(encoding="utf-8")
        for plumbing in ("images/x/meet-ngu.jpg", "reveal:", "retrieval:"):
            assert plumbing not in text


class TestAnEditReachesTheLesson:
    def edit(self, document: Path, old: str, new: str) -> None:
        text = document.read_text(encoding="utf-8")
        assert text.count(old) == 1
        document.write_text(text.replace(old, new), encoding="utf-8")

    def test_a_changed_heading(self, lesson, document):
        self.edit(document, "**Heading:** The first voice", "**Heading:** Start here")
        review.apply(document, lesson)
        assert "heading: Start here" in lesson.read_text(encoding="utf-8")

    def test_a_changed_narration_line(self, lesson, document):
        self.edit(
            document,
            "[en] That word means snake.",
            "[en] That word means snake, and you will not forget it.",
        )
        review.apply(document, lesson)
        body = lesson.read_text(encoding="utf-8")
        assert "narration: en That word means snake, and you will not forget it." in body

    def test_a_changed_bullet(self, lesson, document):
        self.edit(document, "- Its word means snake.", "- Its word means *snake*.")
        review.apply(document, lesson)
        assert "- Its word means *snake*." in lesson.read_text(encoding="utf-8")

    def test_a_changed_picture_direction(self, lesson, document):
        self.edit(
            document,
            "**Picture:** A snake rising from a coil of rope on a stone quay at dawn.",
            "**Picture:** A snake rearing from a rope coil, harbour behind, dusk.",
        )
        review.apply(document, lesson)
        body = lesson.read_text(encoding="utf-8")
        assert "scene: A snake rearing from a rope coil" in body
        # The image path it renders to is untouched by a scene edit.
        assert "image: images/x/meet-ngu.jpg" in body

    def test_a_line_wrapped_across_several_lines_is_rejoined(self, lesson, document):
        """An editor that hard-wraps a long paragraph must not turn one clip
        into several."""
        self.edit(
            document,
            "[en] That word means snake.",
            "[en] That word means snake,\nand the whole of the next minute\nis about one snake.",
        )
        review.apply(document, lesson)
        spoken = [
            line
            for line in lesson.read_text(encoding="utf-8").splitlines()
            if line.startswith("narration: en That word means snake")
        ]
        assert len(spoken) == 1
        assert "one snake." in spoken[0]

    def test_an_added_line_becomes_another_clip(self, lesson, document):
        self.edit(
            document,
            "[en] That word means snake.",
            "[en] That word means snake.\n\n[en] Say it once before you go on.",
        )
        review.apply(document, lesson)
        body = lesson.read_text(encoding="utf-8")
        assert "narration: en Say it once before you go on." in body

    def test_a_deleted_line_is_gone(self, lesson, document):
        """The spoken line goes; the bullet that happens to say the same thing
        stays, because it was not the thing deleted."""
        self.edit(document, "[en] That word means snake.\n\n", "")
        review.apply(document, lesson)
        body = lesson.read_text(encoding="utf-8")
        assert "narration: en That word means snake." not in body
        assert "- Its word means snake." in body


class TestWhatIsRefused:
    def test_a_renamed_slide_id(self, lesson, document):
        text = document.read_text(encoding="utf-8")
        document.write_text(
            text.replace("`meet-ngu`", "`meet-the-snake`"), encoding="utf-8"
        )
        with pytest.raises(ScriptError, match="slides the lesson does not have"):
            review.apply(document, lesson)

    def test_and_the_lesson_is_left_alone_when_it_is(self, lesson, document):
        before = lesson.read_text(encoding="utf-8")
        text = document.read_text(encoding="utf-8")
        document.write_text(text.replace("`meet-ngu`", "`elsewhere`"), encoding="utf-8")
        with pytest.raises(ScriptError):
            review.apply(document, lesson)
        assert lesson.read_text(encoding="utf-8") == before

    def test_an_edit_that_would_not_parse_leaves_the_lesson_alone(
        self, lesson, document, capsys
    ):
        """Thai in an English line. The English voice is not a Thai speaker,
        and the parser refuses it — here, rather than in a build later."""
        before = lesson.read_text(encoding="utf-8")
        text = document.read_text(encoding="utf-8")
        document.write_text(
            text.replace(
                "[en] That word means snake.", "[en] That word means snake — งู."
            ),
            encoding="utf-8",
        )
        assert review.apply(document, lesson) != 0
        assert lesson.read_text(encoding="utf-8") == before
        assert "does not parse" in capsys.readouterr().err

    def test_an_empty_document_is_refused_rather_than_emptying_the_lesson(
        self, lesson, tmp_path
    ):
        before = lesson.read_text(encoding="utf-8")
        empty = tmp_path / "empty.md"
        empty.write_text("# Nothing here\n", encoding="utf-8")
        assert review.apply(empty, lesson) != 0
        assert lesson.read_text(encoding="utf-8") == before

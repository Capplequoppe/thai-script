"""Repository-relative paths, resolved from this file rather than the cwd.

The verify command runs pytest from the repository root while the package lives
four directories down, so nothing here may depend on the working directory.
"""

from pathlib import Path

# paths.py -> generate_conversation_bank -> src -> generate-conversation-bank
# -> scripts -> <repo root>
REPO_ROOT = Path(__file__).resolve().parents[4]

VOCABULARY_JSON = REPO_ROOT / "src" / "domain" / "vocabulary" / "data" / "vocabulary.json"
BANK_JSON = REPO_ROOT / "backend" / "data" / "conversationStarters.json"

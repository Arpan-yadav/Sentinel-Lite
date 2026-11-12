"""Fix Tailwind v4 canonical class syntax: replace [var(--xxx)] with (--xxx) in TSX files."""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).parent.parent / "frontend" / "src"

TARGET_FILES = [
    ROOT / "app" / "dashboard" / "analytics" / "page.tsx",
    ROOT / "components" / "incidents" / "tkg-graph.tsx",
    ROOT / "components" / "layout" / "sidebar.tsx",
]

# Pattern: bg-[var(--background-card)] → bg-(--background-card)
# Handles: bg-, text-, border-, hover:bg-, hover:text-, hover:border-, fill-, stroke-, etc.
# Also handles: bg-[var(--xxx)]/40 → bg-(--xxx)/40
PATTERN = re.compile(r'\[var\((--[a-zA-Z0-9_-]+)\)\]')

def fix_file(path: Path) -> int:
    if not path.exists():
        print(f"  [SKIP] {path} not found")
        return 0
    text = path.read_text(encoding="utf-8")
    new_text, count = PATTERN.subn(r'(\1)', text)
    if count:
        path.write_text(new_text, encoding="utf-8")
        print(f"  [FIXED] {path.name}: {count} replacements")
    else:
        print(f"  [OK]    {path.name}: already canonical")
    return count

total = 0
for f in TARGET_FILES:
    total += fix_file(f)

# Also scan ALL tsx files for any remaining issues
print(f"\nScanning all .tsx files in {ROOT}...")
all_tsx = list(ROOT.rglob("*.tsx"))
for f in all_tsx:
    if f not in TARGET_FILES:
        text = f.read_text(encoding="utf-8")
        new_text, count = PATTERN.subn(r'(\1)', text)
        if count:
            f.write_text(new_text, encoding="utf-8")
            print(f"  [FIXED] {f.relative_to(ROOT)}: {count} replacements")
            total += count

print(f"\nTotal: {total} canonical class replacements across all files.")

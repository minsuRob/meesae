"""worklog/*.md 안의 상대 링크(파일#섹션)가 실제로 있는지 확인한다. GitHub 앵커 규칙으로 만든다.

    python3 worklog/check-links.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).parent


def slug(heading: str) -> str:
    s = heading.strip().lower()
    s = re.sub(r"[^\w\- ]", "", s)  # 글자·숫자·_·-·공백만 (한글은 \w 에 포함)
    return s.replace(" ", "-")


def anchors(path: pathlib.Path) -> set[str]:
    out, seen = set(), {}
    in_code = False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("```"):
            in_code = not in_code
        if in_code:
            continue
        m = re.match(r"^#{1,6}\s+(.*)$", line)
        if m:
            base = slug(m.group(1))
            n = seen.get(base, 0)
            out.add(base if n == 0 else f"{base}-{n}")
            seen[base] = n + 1
    return out


errors = []
total = 0
for md in sorted(ROOT.glob("*.md")):
    for target in re.findall(r"\]\(([^)\s]+)\)", md.read_text(encoding="utf-8")):
        if target.startswith(("http", "mailto:")):
            continue
        total += 1
        file_part, _, frag = target.partition("#")
        dest = (md.parent / file_part) if file_part else md
        if not dest.exists():
            errors.append(f"{md.name}: 파일 없음 → {target}")
        elif frag and frag not in anchors(dest):
            errors.append(f"{md.name}: 섹션 없음 → {target}")

print(f"링크 {total}개 확인")
for e in errors:
    print("  ✗", e)
sys.exit(1 if errors else 0)

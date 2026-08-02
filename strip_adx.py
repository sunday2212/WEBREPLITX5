#!/usr/bin/env python3
import re, sys, os

PATTERNS = [
    re.compile(r'[ \t]*<script[^>]*securepubads\.g\.doubleclick\.net/tag/js/gpt\.js[^>]*></script>\s*\n?', re.IGNORECASE),
    re.compile(r'[ \t]*<script>\s*window\.googletag = window\.googletag \|\| \{cmd: \[\]\};[\s\S]*?</script>\s*\n?', re.IGNORECASE),
    re.compile(r'[ \t]*<script src="[^"]*ads-adx\.js"[^>]*></script>\s*\n?', re.IGNORECASE),
    re.compile(r'[ \t]*<script>\s*window\.addEventListener\(\'rewardedAdGranted\'[\s\S]*?</script>\s*\n?', re.IGNORECASE),
    re.compile(r'[ \t]*<!--\s*/23205238319/anchor_bottom1/anchor_bottom2\s*-->[\s\S]*?<!--\s*=====\s*END REWARDED AD BODY\s*=====\s*-->\s*\n?', re.IGNORECASE),
    re.compile(r'[ \t]*<!--\s*Google Ad Manager \(ADX\)[^\n]*-->\s*\n?', re.IGNORECASE),
    re.compile(r'[ \t]*<!--\s*GAM/ADX top banner\s*-->\s*\n?', re.IGNORECASE),
]

def strip_adx(text):
    original = text
    for pat in PATTERNS:
        text = pat.sub('', text)
    return text, (text != original)

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 strip_adx.py <folder> [--dry-run]")
        sys.exit(1)
    root = sys.argv[1]
    dry_run = '--dry-run' in sys.argv
    changed_files = []
    total = 0
    for dirpath, _, filenames in os.walk(root):
        for fname in filenames:
            if not fname.lower().endswith('.html'):
                continue
            total += 1
            fpath = os.path.join(dirpath, fname)
            try:
                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception as e:
                print(f"SKIP (read error): {fpath} -> {e}")
                continue
            new_content, changed = strip_adx(content)
            if changed:
                changed_files.append(fpath)
                if not dry_run:
                    with open(fpath, 'w', encoding='utf-8') as f:
                        f.write(new_content)
    print(f"\nScanned {total} .html files.")
    print(f"{'Would change' if dry_run else 'Changed'}: {len(changed_files)} files.")
    if dry_run:
        for f in changed_files[:20]:
            print("  ", f)
        if len(changed_files) > 20:
            print(f"   ... and {len(changed_files) - 20} more")

if __name__ == '__main__':
    main()

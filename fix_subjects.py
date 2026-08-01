import os
import re
import random

MEDICAL_ICONS = [
    "fas fa-stethoscope",
    "fas fa-heartbeat",
    "fas fa-brain",
    "fas fa-bone",
    "fas fa-eye",
    "fas fa-tooth",
    "fas fa-lungs",
    "fas fa-heart",
    "fas fa-syringe",
    "fas fa-pills",
    "fas fa-vials",
    "fas fa-microscope",
    "fas fa-x-ray",
    "fas fa-dna",
    "fas fa-ambulance",
    "fas fa-hospital",
    "fas fa-user-md",
    "fas fa-notes-medical",
    "fas fa-file-medical",
    "fas fa-prescription",
    "fas fa-prescription-bottle",
    "fas fa-thermometer",
    "fas fa-band-aid",
    "fas fa-diagnoses",
    "fas fa-procedures",
    "fas fa-hospital-user",
    "fas fa-child",
    "fas fa-baby",
    "fas fa-deaf",
    "fas fa-allergies",
    "fas fa-book-medical",
    "fas fa-virus",
    "fas fa-bacterium",
    "fas fa-capsules",
    "fas fa-first-aid",
    "fas fa-medkit",
    "fas fa-radiation",
    "fas fa-wheelchair",
    "fas fa-pump-medical",
    "fas fa-head-side-mask",
    "fas fa-head-side-cough",
    "fas fa-lungs-virus",
    "fas fa-biohazard",
    "fas fa-flask",
    "fas fa-tablets",
]


def find_root():
    """Auto-detect the content root folder (1234xxx or 1234xx)."""
    for name in ["1234xxx", "1234xx"]:
        if os.path.isdir(name):
            return name
    return None


def rel_prefix(dirpath):
    """
    Return the relative prefix (e.g. '../../') needed to reach the
    project root from dirpath.
    e.g. '1234xxx/cerebellum'      -> depth 2 -> '../../'
         '1234xxx/dams/damsb2b'    -> depth 3 -> '../../../'
    """
    depth = len(dirpath.replace("\\", "/").strip("/").split("/"))
    return "../" * depth


def make_subjects_html(dirpath, folder_name, cards_html):
    """Create a brand-new subjects.html using the standard template."""
    prefix = rel_prefix(dirpath)
    title  = folder_name.upper()

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title} Subjects - NEXTPULSE | NEET PG Video Lectures</title>
  <meta name="description" content="Access {title} NEET PG video lectures across all medical subjects.">
  <link rel="stylesheet" href="{prefix}styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
  <script src="{prefix}access-control.js"></script>
</head>
<body>
  <script>
    if (!accessControl.initProtectedPage()) {{
      throw new Error('Access denied - redirecting to index.html');
    }}
  </script>
  <header>
    <div class="header-content">
      <button onclick="history.back()" style="position: fixed; top: 20px; left: 20px; background: transparent; color: white; border: none; padding: 10px; cursor: pointer; z-index: 1001; font-size: 20px;">
        <i class="fas fa-arrow-left"></i>
      </button>
      <h1>{title} Subjects</h1>
      <p class="header-subtitle">Expert Faculty Video Lectures</p>
      <div class="search-bar">
        <i class="fas fa-search"></i>
        <input type="text" placeholder="Search subjects..." id="searchInput">
      </div>
    </div>
  </header>
  <main>
{cards_html}
  </main>

  <script>
    document.getElementById('searchInput').addEventListener('input', function(e) {{
      const query = e.target.value.toLowerCase();
      const subjects = document.querySelectorAll('.subject-card');
      subjects.forEach(subject => {{
        const text = subject.textContent.toLowerCase();
        subject.style.display = text.includes(query) ? 'block' : 'none';
      }});
    }});
  </script>
  <script src="{prefix}stream-player-utils.js"></script>
  <script src="{prefix}theme.js"></script>
  <nav class="bottom-nav">
    <a href="{prefix}app.html" class="active"><i class="fas fa-lightbulb"></i><span>Home</span></a>
    <a href="{prefix}00x12345.html"><i class="fas fa-play-circle"></i><span>Videos</span></a>
    <a href="{prefix}searchx.html"><i class="fas fa-search"></i><span>Search</span></a>
    <a href="{prefix}quizx/index.html"><i class="fas fa-question-circle"></i><span>Q Bank</span></a>
  </nav>
</body>
</html>
"""


def build_cards(html_files):
    """Build subject card HTML for a list of html filenames."""
    cards = ""
    for html_file in sorted(html_files):
        name = html_file.replace(".html", "")
        icon = random.choice(MEDICAL_ICONS)
        cards += (
            f'    <div class="subject-card" onclick="window.location.href=\'{html_file}\'">\n'
            f'      <i class="{icon}"></i>\n'
            f'      <span>{name}</span>\n'
            f'    </div>\n\n'
        )
    return cards


def get_referenced_htmls(content):
    """Extract same-folder .html hrefs already present in subjects.html."""
    pattern = re.compile(r"""(?:href|location\.href)\s*=\s*['"]([^'"]+\.html)['"]""")
    return {m.group(1) for m in pattern.finditer(content) if "/" not in m.group(1)}


def process_folder(dirpath, filenames):
    html_files = sorted(
        f for f in filenames
        if f.endswith(".html") and f != "subjects.html"
    )

    if not html_files:
        return  # nothing to do in empty folders

    subjects_path = os.path.join(dirpath, "subjects.html")
    folder_name   = os.path.basename(dirpath)

    # ── CASE 1: subjects.html does not exist → create it ──────────────────
    if "subjects.html" not in filenames:
        print(f"\nCREATING  {subjects_path}")
        cards_html = build_cards(html_files)
        content    = make_subjects_html(dirpath, folder_name, cards_html)
        with open(subjects_path, "w", encoding="utf-8") as f:
            f.write(content)
        for hf in html_files:
            print(f"  + {hf}")
        print(f"  -> Created with {len(html_files)} card(s)")
        return

    # ── CASE 2: subjects.html exists → add only missing cards ─────────────
    with open(subjects_path, "r", encoding="utf-8") as f:
        content = f.read()

    referenced = get_referenced_htmls(content)
    missing    = sorted(f for f in html_files if f not in referenced)

    if not missing:
        print(f"OK  {subjects_path}")
        return

    print(f"\nUPDATING  {subjects_path}")
    new_cards = "\n" + build_cards(missing)

    idx = content.rfind("</main>")
    if idx == -1:
        idx = content.rfind("</body>")
    updated = content[:idx] + new_cards + content[idx:]

    with open(subjects_path, "w", encoding="utf-8") as f:
        f.write(updated)

    for hf in missing:
        print(f"  + {hf}")
    print(f"  -> Added {len(missing)} card(s)")


def main():
    root = find_root()
    if not root:
        print("Folder '1234xxx' (or '1234xx') not found. Run from project root.")
        return

    print(f"Scanning '{root}/'")
    print("=" * 60)

    for dirpath, _, filenames in os.walk(root):
        process_folder(dirpath, filenames)

    print("\n" + "=" * 60)
    print("Done.")


if __name__ == "__main__":
    main()

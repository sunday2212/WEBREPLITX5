import os

# The nav template (we'll insert the correct relative paths dynamically)
NAV_TEMPLATE = """
<nav class="bottom-nav">
  <a href="{app}" class="active"><i class="fas fa-lightbulb"></i><span>Home</span></a>
  <a href="{platforms}"><i class="fas fa-play-circle"></i><span>Videos</span></a>
  <a href="{search}"><i class="fas fa-search"></i><span>Search</span></a>
  <a href="{quiz}"><i class="fas fa-question-circle"></i><span>Q Bank</span></a>
</nav>
"""

# Function to calculate relative path
def rel_path(from_file, to_file):
    return os.path.relpath(to_file, start=os.path.dirname(from_file))

# Walk through project and replace nav
for root, _, files in os.walk("."):
    for file in files:
        if file.endswith(".html"):
            file_path = os.path.join(root, file)

            # Compute correct relative paths
            nav_code = NAV_TEMPLATE.format(
                app=rel_path(file_path, "./app.html"),
                platforms=rel_path(file_path, "./00x1234.html"),
                search=rel_path(file_path, "./search.html"),
                quiz=rel_path(file_path, "./quiz/index.html"),
            )

            # Read file
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()

            # Replace old <nav>...</nav> with new one
            if "<nav class=\"bottom-nav\">" in content:
                start = content.find("<nav class=\"bottom-nav\">")
                end = content.find("</nav>", start) + 6
                content = content[:start] + nav_code + content[end:]

                # Write back
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(content)
                print(f"Updated nav in: {file_path}")


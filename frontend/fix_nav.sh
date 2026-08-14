#!/bin/bash

find . -name "*.html" | while read file; do

  depth=$(echo "$file" | awk -F"/" '{print NF-1}')

  prefix=""
  for ((i=1; i<depth; i++)); do
    prefix+="../"
  done

  new_nav="<nav class=\"bottom-nav\">
      <a href=\"${prefix}appx.html\" class=\"active\"><i class=\"fas fa-lightbulb\"></i><span>Home</span></a>
      <a href=\"${prefix}00x12345.html\"><i class=\"fas fa-play-circle\"></i><span>Videos</span></a>
      <a href=\"${prefix}searchx.html\"><i class=\"fas fa-search\"></i><span>Search</span></a>
      <a href=\"${prefix}quizx/index.html\"><i class=\"fas fa-question-circle\"></i><span>Q Bank</span></a>
    </nav>"

  # Remove old nav
  awk '
  BEGIN {skip=0}
  /<nav class="bottom-nav">/ {skip=1}
  /<\/nav>/ {skip=0; next}
  skip==0 {print}
  ' "$file" > temp.html

  # Insert new nav before </body>
  awk -v nav="$new_nav" '
  /<\/body>/ {
    print nav
  }
  {print}
  ' temp.html > "$file"

  rm temp.html

  echo "Fixed: $file"

done

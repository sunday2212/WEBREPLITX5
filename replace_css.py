import os
import glob

old_code = '''    .option-btn.selected {
        background-color: #2c5282;
        color: white;
    }'''

new_code = '''    .option-btn.selected {
        background-color: #2c5282;
        color: white;
    }
    .option-btn.correct {
  background-color: #38a169 !important; /* green */
  color: white !important;
  border-color: #38a169 !important;
}
.option-btn.incorrect {
  background-color: #e53e3e !important; /* red */
  color: white !important;
  border-color: #e53e3e !important;
}'''

# Process all HTML files
for filepath in glob.glob('*.html'):
    with open(filepath, 'r') as file:
        content = file.read()
    
    content = content.replace(old_code, new_code)
    
    with open(filepath, 'w') as file:
        file.write(content)
    print(f'Updated: {filepath}')

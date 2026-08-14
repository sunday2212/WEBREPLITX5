import os
import glob

# Define the old and new link paths
old_link = '<link rel="stylesheet" href="../../styles.css">'
new_link = '<link rel="stylesheet" href="../../../styles.css">'

# Start from the current directory and search recursively
for filepath in glob.glob('**/*.html', recursive=True):
    try:
        # Read the file
        with open(filepath, 'r', encoding='utf-8') as file:
            content = file.read()
        
        # Replace the link if found
        if old_link in content:
            content = content.replace(old_link, new_link)
            
            # Write back the updated content
            with open(filepath, 'w', encoding='utf-8') as file:
                file.write(content)
            print(f'Updated: {filepath}')
        else:
            print(f'Pattern not found in: {filepath}')
            
    except Exception as e:
        print(f'Error processing {filepath}: {e}')

print('\nAll files processed!')

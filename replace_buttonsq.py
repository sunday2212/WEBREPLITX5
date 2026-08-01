import os

def replace_button_code():
    folder_path = "quiz/Testmode/AMCQS"
    
    # Original and replacement strings
    original_code = '''&nbsp;&lt;button class=&quot;bg-[#2c5281] text-white px-6 py-2 rounded-lg hover:bg-[#2c5281] transition w-full sm:w-auto text-base font-semibold&quot; id=&quot;start-normal-mode&quot;&gt;Normal Mode&lt;/button&gt;
&nbsp;&lt;button class=&quot;bg-[#2c5281] text-white px-6 py-2 rounded-lg hover:bg-[#2c5281] transition w-full sm:w-auto text-base font-semibold&quot; id=&quot;start-test&quot;&gt;Test Mode&lt;/button&gt; &lt;!-- Add this button in the instructions section --&gt;
'''
    
    replacement_code = '''&lt;button class=&quot;bg-[#2c5281] text-white px-6 py-2 rounded-lg hover:bg-[#2c5281] transition w-full sm:w-auto text-base font-semibold block mx-auto mb-4&quot; id=&quot;start-normal-mode&quot;&gt;Normal Mode&lt;/button&gt;
&lt;button class=&quot;bg-[#2c5281] text-white px-6 py-2 rounded-lg hover:bg-[#2c5281] transition w-full sm:w-auto text-base font-semibold block mx-auto&quot; id=&quot;start-test&quot;&gt;Test Mode&lt;/button&gt;'''
    
    # Count files processed
    files_processed = 0
    replacements_made = 0
    
    # Walk through all HTML files in the directory
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith('.html'):
                file_path = os.path.join(root, file)
                files_processed += 1
                
                try:
                    # Read the file content
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Check if the original code exists in the file
                    if original_code in content:
                        # Replace the code
                        new_content = content.replace(original_code, replacement_code)
                        
                        # Write the updated content back to the file
                        with open(file_path, 'w', encoding='utf-8') as f:
                            f.write(new_content)
                        
                        replacements_made += 1
                        print("✓ Replaced in: " + file_path)
                    else:
                        print("- Not found in: " + file_path)
                        
                except Exception as e:
                    print("✗ Error processing " + file_path + ": " + str(e))
    
    print("\nSummary:")
    print("Files processed: " + str(files_processed))
    print("Replacements made: " + str(replacements_made))

replace_button_code()

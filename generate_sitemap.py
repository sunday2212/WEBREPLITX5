import os
import subprocess
from datetime import datetime
from xml.etree.ElementTree import Element, SubElement, tostring
from xml.dom import minidom

def get_git_modification_date(file_path):
    try:
        result = subprocess.run(['git', 'log', '-1', '--format=%aI', '--', file_path], 
                              capture_output=True, text=True)
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip()
    except:
        pass
    return datetime.now().strftime("%Y-%m-%dT%H:%M:%S+00:00")

# Find all HTML files
result = subprocess.run(['find', '.', '-name', '*.html', '-type', 'f'], 
                       capture_output=True, text=True)
html_files = result.stdout.strip().split('\n')
html_files = [f for f in html_files if f]

# Create XML structure
urlset = Element('urlset')
urlset.set('xmlns', 'http://www.sitemaps.org/schemas/sitemap/0.9')
urlset.set('xmlns:xsi', 'http://www.w3.org/2001/XMLSchema-instance')
urlset.set('xsi:schemaLocation', 'http://www.sitemaps.org/schemas/sitemap/0.9 http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd')

# Function to determine priority based on file path
def get_priority(file_path):
    file_path_lower = file_path.lower()
    if file_path == './index.html' or file_path == './main.html' or 'home' in file_path_lower:
        return '1.00'
    elif any(keyword in file_path_lower for keyword in ['app', 'platform', 'search', 'quiz', 'product', 'service']):
        return '0.80'
    elif any(keyword in file_path_lower for keyword in ['about', 'contact', 'blog', 'article', 'post']):
        return '0.70'
    else:
        return '0.64'

# Add URLs to sitemap
for html_file in html_files:
    # Get actual modification date from git
    mod_date = get_git_modification_date(html_file)
    
    # Convert file path to URL format
    url_path = html_file[2:] if html_file.startswith('./') else html_file
    url_path = url_path.replace(' ', '%20')
    
    url_elem = SubElement(urlset, 'url')
    
    loc = SubElement(url_elem, 'loc')
    loc.text = f'https://afrahtafreeh.site/{url_path}'
    
    lastmod = SubElement(url_elem, 'lastmod')
    lastmod.text = mod_date
    
    priority = SubElement(url_elem, 'priority')
    priority.text = get_priority(html_file)

# Convert to pretty XML
rough_string = tostring(urlset, 'utf-8')
parsed = minidom.parseString(rough_string)
pretty_xml = parsed.toprettyxml(indent="  ")

# Remove the XML declaration from minidom and add our own
pretty_xml = pretty_xml.split('\n', 1)[1]  # Remove first line
pretty_xml = '<?xml version="1.0" encoding="UTF-8"?>\n' + pretty_xml

# Write to sitemap.xml
with open('sitemap.xml', 'w', encoding='utf-8') as f:
    f.write(pretty_xml)

print("✅ Sitemap generated successfully!")
print(f"📄 Found {len(html_files)} HTML files")
print("🌐 Website: https://afrahtafreeh.site")

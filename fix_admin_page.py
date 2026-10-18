import re

# Read the file
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the broken section and fix it
# The issue is extra </div> tags after files tab and qr codes tab

# Fix pattern: remove extra </div> and fix the structure
pattern = r'(        </div>\s+\)}\s+)(</div>\s+)(/\* Committee Modal \*/\s+\{activeTab === \'qr-codes\' && \(\s+<div className="card">\s+<QrCodeManagement />\s+</div>\s+\)}\s+)(</div>\s+)(/\* Committee Modal \*/\})'

replacement = r'\1\3'

content = re.sub(pattern, replacement, content)

# Write the file
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")

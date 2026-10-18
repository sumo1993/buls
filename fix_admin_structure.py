import re

# Read the file
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the structure issue around line 1990-2005
# The files tab content ends with:
#         </div>
#       )}

# But there's an extra </div> and the QR codes tab is misplaced

# Let's find the exact broken section and fix it
# The issue is around line 1997-2005

# Find the files tab ending and QR codes tab
files_tab_pattern = r'(files\}\s+\{\s+activeTab === \'qr-codes\' && \(\s+<div className="card">\s+<QrCodeManagement />\s+</div>\s+\)}\s+\}\s+)(</div>)\s+(/\*\s+Committee Modal \*/\s+\{showCommitteeModal)'

# The correct structure should be:
# 1. Files tab content
# 2. QR codes tab content
# 3. Committee Modal

# Let's rewrite the section properly
content = re.sub(
    r'(files\}\s+\{\s+activeTab === \'qr-codes\' && \(\s+<div className="card">\s+<QrCodeManagement />\s+</div>\s+\)}\s+\}\s+)(</div>)\s+(/\*\s+Committee Modal \*/\s+\{showCommitteeModal)',
    r'\1\n\n      {/* Committee Modal */}\n      {showCommitteeModal',
    content
)

# Also fix the closing tags
content = re.sub(
    r'(\s+activeTab === \'qr-codes\' && \(\s+<div className="card">\s+<QrCodeManagement />\s+</div>\s+\)}\s+)(</div>)\s+(</div>\s+/\*\s+Committee Modal \*/)',
    r'\1\n\n      {/* Committee Modal */}\n      {showCommitteeModal',
    content
)

# Write the file
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed!")

import re

# Read the file
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Split into lines for easier manipulation
lines = content.split('\n')

# Find and fix the broken section around line 1997-2003
# The correct structure should be:
# Line 1997:         </div>
# Line 1998:       )}
# Line 1999: (empty)
# Line 2000: {/* QR Codes Tab */}
# Line 2001: {activeTab === 'qr-codes' && (
# Line 2002:         <div className="card">
# Line 2003:           <QrCodeManagement />
# Line 2004:         </div>
# Line 2005:       )}
# Line 2006: (empty)
# Line 2007: {/* Committee Modal */}
# Line 2008: {showCommitteeModal && (

# Find the broken section
for i, line in enumerate(lines):
    if i >= 1995 and i <= 2005:
        print(f"{i}: {line}")

# Fix the broken section
# Remove line 2000 (extra </div>)
# Remove line 2002 (malformed comment)
# Insert QR Codes tab comment and content properly

# First, remove the malformed comment on line 2002
if len(lines) > 2002 and 'Committee Modal */)' in lines[2002]:
    lines[2002] = '      {/* Committee Modal */}'

# Remove the extra </div> on line 2000
if len(lines) > 2000 and '</div>' in lines[2000]:
    lines.pop(2000)

# Now insert the QR codes tab content properly after files tab
# The files tab ends with )} on line 1998
# Insert QR codes tab content after line 1999 (empty line)

qr_codes_section = [
    '      {/* QR Codes Tab */}',
    "      {activeTab === 'qr-codes' && (",
    '        <div className="card">',
    '          <QrCodeManagement />',
    '        </div>',
    '      )}'
]

# Insert after line 1999
for j, line in enumerate(qr_codes_section):
    lines.insert(2000 + j, line)

# Fix the Committee Modal comment if needed
if len(lines) > 2010 and 'Committee Modal */)' in lines[2010]:
    lines[2010] = '      {/* Committee Modal */}'

# Write back
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print("Fixed!")

# Show the result
print("\nAfter fix:")
with open(r'c:\Users\dell\Documents\buls-main\buls-main\app\admin\page.tsx', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')
for i in range(1995, 2015):
    if i < len(lines):
        print(f"{i}: {lines[i]}")

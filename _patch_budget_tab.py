import pathlib

p = pathlib.Path(r"C:\Users\dell\Documents\buls-main\buls-main\app\secretary\page.tsx")
s = p.read_text(encoding="utf-8")
start = s.find("        {/* Budget Proposals Tab */}")
end = s.find("        {/* Committee Members Modal */}")
print("start", start, "end", end)
assert start > 0 and end > start
repl = """        {/* Budget Proposals Tab */}
        {activeTab === 'budget_proposals' && (
          <div className=\"card\">
            <BudgetProposalsPanel
              mode=\"staff\"
              canManage
              canPay={false}
              title=\"Budget Proposals\"
              subtitle=\"Assign proposals to committee heads, then approve or reject submissions\"
            />
          </div>
        )}

"""
p.write_text(s[:start] + repl + s[end:], encoding="utf-8")
print("done", end - start, "chars replaced")

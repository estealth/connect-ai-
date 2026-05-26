import re

with open('src/ui/sidebar-chat.ts', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

fixes = {
    1928: "if (ALWAYS_ON_AGENTS.has(aid)) {",
    1932: "if (LOCKED_AGENTS_DEFAULT[aid] && want) {",
    1946: "if (CompanyDashboardPanel.current) CompanyDashboardPanel.current.refresh();",
    1960: "if (!aid || !LOCKED_AGENTS_DEFAULT[aid]) break;",
    1977: "if (CompanyDashboardPanel.current) CompanyDashboardPanel.current.refresh();",
    1924: "case 'toggleAgentActive': {", # In line 1924: `case '': {` -- wait, `toggleAgentActive` was the string? Let me check line 1924
}

# The regex removed `toggleAgentActive`? No, wait. Did the regex remove `'toggleAgentActive'`?
# No, my moves didn't contain `'toggleAgentActive'`.
# Let's check line 1924.
# `case '': {`
# Ah, I had `setAgentActive` in the replacements. The regex was `r'\bsetAgentActive\('`, but wait! If the original code was `case 'setAgentActive':`, the regex `\bsetAgentActive\b,?\s*` would remove it and leave `case '':` !! Yes! Because `setAgentActive` was in `moves.keys()`!
# And it became `case '':`.
fixes[1924] = "case 'setAgentActive': {"

for line_idx, fix in fixes.items():
    i = line_idx - 1 # 0-indexed
    indent = len(lines[i]) - len(lines[i].lstrip())
    lines[i] = ' ' * indent + fix

with open('src/ui/sidebar-chat.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print("Fixed lines")

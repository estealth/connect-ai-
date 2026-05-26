import re

with open('src/ui/sidebar-chat.ts', 'r', encoding='utf-8') as f:
    lines = f.read().split('\n')

fixes = {
    351: "ensureCompanyStructure();",
    714: "companyName: CompanyService.getInstance().readCompanyName(),",
    723: "companyDay: configured ? CompanyService.getInstance().getCompanyDay() : 1,",
    728: "hiredAgents: CompanyService.getInstance().readHiredAgents(),",
    729: "activeAgents: CompanyService.getInstance().readActiveAgents()",
    1165: "const map = CompanyService.getInstance().readAgentModelMap();",
    1196: "const map = CompanyService.getInstance().readAgentModelMap();",
    1202: "CompanyService.getInstance().writeAgentModelMap(map);",
    1213: "CompanyService.getInstance().writeAgentModelMap(auto);",
    1232: "CompanyService.getInstance().writeAgentModelMap(map);",
    1258: "ensureCompanyStructure();",
    1396: "ensureCompanyStructure();",
    1405: "ensureCompanyStructure();",
    1414: "ensureCompanyStructure();",
    1509: "ensureCompanyStructure();",
    1722: "companyName: CompanyService.getInstance().readCompanyName(),",
    1726: "companyDay: configured ? CompanyService.getInstance().getCompanyDay() : 1",
    1735: "const dir = getCompanyDir();", # wait, line 1735? "const dir = CompanyService.getInstance().();" => probably getCompanyDir()
    1748: "ensureCompanyStructure();",
    1760: "ensureCompanyStructure();",
    1787: "ensureCompanyStructure();",
    1825: "ensureCompanyStructure();",
    1936: "const ok = CompanyService.getInstance().setAgentActive(aid, want);",
    1940: "try { this._view?.webview.postMessage({ type: 'activeAgents', value: CompanyService.getInstance().readActiveAgents() }); } catch { /* ignore */ }",
    1966: "const ok = CompanyService.getInstance().markAgentHired(aid);",
    1974: "this._view?.webview.postMessage({ type: 'hiredAgents', value: CompanyService.getInstance().readHiredAgents() });",
    2079: "webviewView.webview.postMessage({ type: 'companyMetrics', metrics: CompanyService.getInstance().getCompanyMetrics() });",
}

for line_idx, fix in fixes.items():
    i = line_idx - 1 # 0-indexed
    # only replace if it's broken
    if '.getInstance().(' in lines[i] or '.getInstance().()' in lines[i] or '.()' in lines[i]:
        # replace the broken part with the fix.
        # But wait, my fixes are the FULL LINE for some, and partial for others.
        # Let's just replace the whole line, keeping the original indentation!
        indent = len(lines[i]) - len(lines[i].lstrip())
        lines[i] = ' ' * indent + fix

# Write back
with open('src/ui/sidebar-chat.ts', 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))
print("Fixed lines")

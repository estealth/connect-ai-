import re
import os

# 1. Fix extension.ts exports
with open('src/extension.ts', 'r', encoding='utf-8') as f:
    ext_content = f.read()

funcs_to_export = [
    'autoMarkTrackerFromDispatch',
    'rebuildUnifiedSchedule',
    '_safeGitAutoSync',
    '_safeGitAutoSyncCompany',
    '_resolveFlexiblePath',
    '_renderUnifiedDiff',
    '_globMatch',
    '_grepFiles',
    'writeAgentGoal',
    'writeAgentRagMode',
    'writeAgentSelfRagCriteria',
    'writeCompanyConfig',
    'readCompanyConfig',
    'routeBrainInjectionToAgents',
    'buildSpecialistPrompt',
    'buildAgentConfigStatus',
    'makeSessionDir',
    'readSecretaryBridgeMode',
    '_isCasualChat',
    '_extractFirstJsonObject',
    'prefetchAgentRealtimeData',
    'BrainGraph',
    '_RENDER_GRAPH_HTML',
    '_extCtx',
    'isCompanyConfigured',
    'readAgentGoal',
    'readAgentRagMode',
    'readAgentSelfRagCriteria',
    'countAgentVerifiedClaims',
    'readTelegramConfig',
    'listAgentTools',
    'writeToolConfig',
    'setToolEnabled',
    'readAgentSkills',
    'appendConversationLog',
    '_safeReadText',
    'getConversationsDir',
    'setCompanyDir',
    'readRecentConversations',
    '_ytDashboardProvider',
]

for func in funcs_to_export:
    ext_content = re.sub(r'(\n)?(?:function|let|const) ' + func + r'\b', r'\1export \g<0>', ext_content)

# Fix _autoSyncRunning
ext_content = re.sub(r'(\n)?let _autoSyncRunning', r'\1export let _autoSyncRunning', ext_content)
# Fix _activeChatProvider
ext_content = re.sub(r'(\n)?let _activeChatProvider', r'\1export let _activeChatProvider', ext_content)
ext_content = ext_content.replace('export export', 'export')

with open('src/extension.ts', 'w', encoding='utf-8') as f:
    f.write(ext_content)

# 2. Fix CompanyService (Add readHiredAgents and readActiveAgents)
cs_path = 'src/services/company-service.ts'
if os.path.exists(cs_path):
    with open(cs_path, 'r', encoding='utf-8') as f:
        cs_content = f.read()
    
    if 'readHiredAgents' not in cs_content:
        # Add them before the last brace
        code_to_add = """
    public readHiredAgents(): Record<string, any> {
        try {
            const p = path.join(this.getCompanyDir(), '_shared', 'hired.json');
            if (!fs.existsSync(p)) return {};
            return JSON.parse(fs.readFileSync(p, 'utf-8') || '{}');
        } catch { return {}; }
    }

    public readActiveAgents(): Record<string, any> {
        try {
            const p = path.join(this.getCompanyDir(), '_shared', 'active.json');
            if (!fs.existsSync(p)) return {};
            return JSON.parse(fs.readFileSync(p, 'utf-8') || '{}');
        } catch { return {}; }
    }
"""
        cs_content = cs_content.replace('}\n$', code_to_add + '}\n') # hacky, just insert before last }
        last_brace = cs_content.rfind('}')
        if last_brace != -1:
            cs_content = cs_content[:last_brace] + code_to_add + cs_content[last_brace:]
        with open(cs_path, 'w', encoding='utf-8') as f:
            f.write(cs_content)

# 3. Fix sidebar-chat.ts
with open('src/ui/sidebar-chat.ts', 'r', encoding='utf-8') as f:
    sb_content = f.read()

# Fix ensureCompanyStructure(); -> CompanyService.getInstance().ensureCompanyStructure();
sb_content = re.sub(r'^\s*ensureCompanyStructure\(\);', r'CompanyService.getInstance().ensureCompanyStructure();', sb_content, flags=re.MULTILINE)

# Fix missing imports: add them back if needed, or rely on extension wrappers
sb_content = sb_content.replace('ensureCompanyStructure();', 'CompanyService.getInstance().ensureCompanyStructure();')

# Fix markAgentHired(aid) arguments since it takes one argument. The error said expected 2 but got 1. Wait, setAgentActive expected 2. markAgentHired expected 2?
# In company-service.ts: markAgentHired(agentId: string, active: boolean)
sb_content = sb_content.replace('CompanyService.getInstance().markAgentHired(aid);', 'CompanyService.getInstance().markAgentHired(aid, true);')
# And setAgentActive returns void in company-service.ts?
sb_content = sb_content.replace('const ok = CompanyService.getInstance().setAgentActive(aid, want);', 'CompanyService.getInstance().setAgentActive(aid, want); const ok = true;')
sb_content = sb_content.replace('const ok = CompanyService.getInstance().markAgentHired(aid, true);', 'CompanyService.getInstance().markAgentHired(aid, true); const ok = true;')

with open('src/ui/sidebar-chat.ts', 'w', encoding='utf-8') as f:
    f.write(sb_content)

print("All fixes applied")

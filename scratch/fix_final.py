import re
import os

# Fix sidebar-chat.ts
with open('src/ui/sidebar-chat.ts', 'r', encoding='utf-8') as f:
    sb_content = f.read()

# Fix CompanyService.getInstance().CompanyService.getInstance().ensureCompanyStructure();
sb_content = sb_content.replace('CompanyService.getInstance().CompanyService.getInstance().', 'CompanyService.getInstance().')
with open('src/ui/sidebar-chat.ts', 'w', encoding='utf-8') as f:
    f.write(sb_content)

# Fix extension.ts exports
with open('src/extension.ts', 'r', encoding='utf-8') as f:
    ext_content = f.read()

funcs_to_export = [
    '_migrateCompanyToSubdir',
    '_migrateYouTubeCredsToCanonical',
    '_autoOrchestrateModelMap',
    '_recoverEngineUrlIfMismatched',
    '_autoPickInstalledModelIfMissing',
    'startTelegramPolling',
    'startTrackerNudgeLoop',
    'startDailyBriefingLoop',
    'startRevenueWatcherLoop',
    'startReportScheduler',
    'startRecurrenceLoop',
    'startPreAlarmLoop',
    'sendTelegramLong',
    'sendTelegramReport',
    '_pushTelegramHistory',
    '_readYtOAuthClient',
    'appendAgentMemory',
    'promoteGroundedClaimsFromOutput',
    '_harvestActionItems',
    '_personalizePrompt',
    'readAgentSharedContext',
]

for func in funcs_to_export:
    ext_content = re.sub(r'(\n)?(?:function|let|const|class) ' + func + r'\b', r'\1export \g<0>', ext_content)

# Fix setAutoSyncRunning
if 'setAutoSyncRunning' not in ext_content:
    ext_content += '\nexport function setAutoSyncRunning(v: boolean) { _autoSyncRunning = v; }\n'
# Fix addTrackerTask
if 'export function addTrackerTask' not in ext_content:
    ext_content += '\nexport function addTrackerTask(t: any): any { return appendTrackerTask(t); }\n'

with open('src/extension.ts', 'w', encoding='utf-8') as f:
    f.write(ext_content)

# Fix src/services/model-service.ts
with open('src/services/model-service.ts', 'r', encoding='utf-8') as f:
    ms_content = f.read()
ms_content = ms_content.replace('totalRAMGB', 'totalRamGB')
with open('src/services/model-service.ts', 'w', encoding='utf-8') as f:
    f.write(ms_content)

print("Applied final fixes")

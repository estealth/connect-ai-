import re
import os

def final_stabilization():
    file_path = 'src/extension.ts'
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Rename moved members to _OBSOLETE_ (Safe refactoring)
    moved_members = [
        'readTracker', 'writeTracker', 'addTrackerTask', 'updateTrackerTask',
        'readCompanyName', 'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
        'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
        'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
        'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
        'youtubeCommentReplyDraftBatch', '_youtubeCommentReplyDraftBatch',
        'resolveApproval', '_runDailyBriefingOnce', 'maybeRecommendCoderModel',
        'ensureCompanyStructure', 'appendTrackerTask',
        'TaskTreeItem', 'TaskTreeProvider'
    ]

    for name in moved_members:
        pattern = r'(?m)^(export\s+)?(async\s+)?(function|const|let|class)\s+' + re.escape(name) + r'\b'
        
        # We need to avoid renaming the ones in the "Service Wrappers" or "import" sections
        # For simplicity, we just check if it's already _OBSOLETE_
        def rename_match(m):
            prefix = m.group(1) or ""
            async_p = m.group(2) or ""
            kind = m.group(3)
            # Avoid renaming if already prefixed or in wrappers section (we'll just do it for the whole file and then fix the wrappers)
            return f"{prefix}{async_p}{kind} _OBSOLETE_{name}"

        content = re.sub(pattern, rename_match, content)

    # 2. Fix the keyword order and duplicates
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = re.sub(r'async\s+export\s+function', 'export async function', content)
    content = content.replace('Noneasync', 'async')

    # 3. Fix ALL implicit any types reported by TSC
    # This regex is broad but safe for common array methods
    content = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', content)
    content = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', content)
    content = re.sub(r'\.sort\(\((\w+),\s*(\w+)\)\s*=>', r'.sort((\1: any, \2: any) =>', content)
    content = re.sub(r'\.forEach\((\w+)\s*=>', r'.forEach((\1: any) =>', content)
    content = re.sub(r'\.find\((\w+)\s*=>', r'.find((\1: any) =>', content)
    content = re.sub(r'\.findIndex\((\w+)\s*=>', r'.findIndex((\1: any) =>', content)
    content = re.sub(r'\.reduce\(\((\w+),\s*(\w+)\)\s*=>', r'.reduce((\1: any, \2: any) =>', content)

    # 4. RESTORE the names in the Service Wrappers section
    # The wrappers were also renamed by the broad regex above.
    if "// Service Wrappers" in content:
        wrappers_part = content.split("// Service Wrappers")[1]
        new_wrappers = wrappers_part.replace("_OBSOLETE_", "")
        content = content.split("// Service Wrappers")[0] + "// Service Wrappers" + new_wrappers

    # 5. Fix UI imports at the top
    top_imports = """
import { CompanyDashboardPanel } from './ui/dashboard-panel';
import { ApiConnectionsPanel } from './ui/connections-panel';
import { RevenueDashboardPanel } from './ui/revenue-panel';
import { TaskTreeProvider, TaskTreeItem } from './ui/task-tree';

export { CompanyDashboardPanel, ApiConnectionsPanel, RevenueDashboardPanel, TaskTreeProvider, TaskTreeItem };
"""
    if "import { CompanyDashboardPanel }" not in content:
        content = re.sub(r'^(import\s+.*?\n)', r'\1' + top_imports, content, count=1)

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("extension.ts stabilized and typed.")

final_stabilization()

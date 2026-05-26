import re
import os

def clean_extension_ts_safely():
    file_path = 'src/extension.ts'
    if not os.path.exists(file_path):
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix the double exports and async order first to get to a cleaner state
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = re.sub(r'async\s+export\s+function', 'export async function', content)
    content = content.replace('Noneasync', 'async')

    # 2. List of members moved to services
    moved_members = [
        'readTracker', 'writeTracker', 'addTrackerTask', 'updateTrackerTask',
        'readCompanyName', 'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
        'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
        'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
        'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
        'youtubeCommentReplyDraftBatch', '_youtubeCommentReplyDraftBatch',
        'resolveApproval', '_runDailyBriefingOnce', 'maybeRecommendCoderModel',
        'ensureCompanyStructure'
    ]

    # Instead of deleting, just RENAME them to _OBSOLETE_NAME
    # This prevents the "catch or finally expected" errors if we accidentally deleted a function head but not the body.
    wrappers_start = content.find('// Service Wrappers')
    if wrappers_start == -1:
        wrappers_start = len(content)

    for name in moved_members:
        # Match function/const/let/class definition before the wrappers section
        # We use a lambda to replace ONLY if it's before wrappers_start
        pattern = r'(?m)^(export\s+)?(async\s+)?(function|const|let|class)\s+' + re.escape(name) + r'\b'
        
        def rename_func(m):
            if m.start() < wrappers_start:
                # Check if it was already renamed
                if name.startswith('_OBSOLETE_'): return m.group(0)
                prefix = m.group(1) or ""
                async_p = m.group(2) or ""
                kind = m.group(3)
                return f"{prefix}{async_p}{kind} _OBSOLETE_{name}"
            return m.group(0)

        content = re.sub(pattern, rename_func, content)

    # 3. Add 'any' type to implicit any array parameters
    content = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', content)
    content = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', content)

    # 4. Fix TaskTree redeclaration by renaming the local ones
    content = content.replace('export class TaskTreeItem', 'export class _OBSOLETE_TaskTreeItem')
    content = content.replace('export class TaskTreeProvider', 'export class _OBSOLETE_TaskTreeProvider')
    # But wait, the wrappers might need them? No, the wrappers export them from ui/task-tree

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("extension.ts stabilized.")

clean_extension_ts_safely()

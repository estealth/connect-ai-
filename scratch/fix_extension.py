import re
import os

def fix_extension_ts():
    file_path = 'src/extension.ts'
    if not os.path.exists(file_path):
        print(f"Error: {file_path} not found")
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. List of moved functions to services
    moved_members = [
        'readTracker', 'writeTracker', 'addTrackerTask', 'updateTrackerTask',
        'readCompanyName', 'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
        'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
        'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
        'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
        'youtubeCommentReplyDraftBatch', '_youtubeCommentReplyDraftBatch',
        'resolveApproval', '_runDailyBriefingOnce', 'maybeRecommendCoderModel',
        'ensureCompanyStructure', 'appendTrackerTask'
    ]

    # Remove the full bodies of these functions from the middle of the file
    # We look for "export async function NAME" or "function NAME"
    for name in moved_members:
        # We need to be careful not to delete the wrappers at the end
        # We search for definitions BEFORE the "Service Wrappers" section
        wrappers_start = content.find('// Service Wrappers')
        if wrappers_start == -1:
            wrappers_start = len(content)

        search_content = content[:wrappers_start]
        
        # Match function definition
        # Handles: export async function name, async function name, export function name, function name
        pattern = r'(?m)^(export\s+)?(async\s+)?function\s+' + re.escape(name) + r'\b'
        
        for match in list(re.finditer(pattern, search_content)):
            # Find the end of the function body by counting braces
            start_idx = match.start()
            brace_start = search_content.find('{', match.end())
            if brace_start != -1:
                brace_count = 1
                i = brace_start + 1
                while brace_count > 0 and i < len(search_content):
                    if search_content[i] == '{':
                        brace_count += 1
                    elif search_content[i] == '}':
                        brace_count -= 1
                    i += 1
                
                # Replace with comment
                content = content[:start_idx] + f"// [Moved to service] {name}" + content[i:]
                # Update search_content for subsequent matches of other functions
                wrappers_start = content.find('// Service Wrappers')
                search_content = content[:wrappers_start]

    # 2. Fix multiple export keywords and async order
    content = content.replace('export export ', 'export ')
    content = content.replace('export async export ', 'export async ')
    content = re.sub(r'async\s+export\s+function', 'export async function', content)

    # 3. Add 'any' type to implicit any array parameters to fix TSC errors
    # e.g. .filter(t => ... ) -> .filter((t: any) => ... )
    content = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', content)
    content = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', content)
    content = re.sub(r'\.sort\(\((\w+),\s*(\w+)\)\s*=>', r'.sort((\1: any, \2: any) =>', content)

    # 4. Fix TS1064: The return type of an async function or method must be the global Promise<T> type.
    # This happens when we have "async function foo(): void" or similar
    # We'll fix specific wrappers if they are wrong
    content = content.replace('async function _runDailyBriefingOnce(force: boolean = false): void', 'async function _runDailyBriefingOnce(force: boolean = false): Promise<void>')

    # 5. Fix UI Panel Exports
    # Ensure they are both imported and exported at the top
    ui_imports = [
        "import { CompanyDashboardPanel } from './ui/dashboard-panel';",
        "import { ApiConnectionsPanel } from './ui/connections-panel';",
        "import { RevenueDashboardPanel } from './ui/revenue-panel';",
        "import { TaskTreeProvider, TaskTreeItem } from './ui/task-tree';"
    ]
    
    for imp in ui_imports:
        if imp not in content:
            content = "import * as vscode from 'vscode';\n" + imp + "\n" + content.replace("import * as vscode from 'vscode';", "")

    # Add re-exports for these if missing
    re_exports = [
        "export { CompanyDashboardPanel };",
        "export { ApiConnectionsPanel };",
        "export { RevenueDashboardPanel };",
        "export { TaskTreeProvider, TaskTreeItem };"
    ]
    for rex in re_exports:
        if rex not in content:
            content = content.replace("// Service Wrappers", rex + "\n// Service Wrappers")

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("extension.ts fixed.")

fix_extension_ts()

import re
import os

def final_surgical_cleanup():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Remove redundant wrappers for things already exported
    # List of functions that are likely already exported in the main body
    redundant_wrappers = [
        'readTracker', 'writeTracker', 'appendTrackerTask', 'addTrackerTask', 'updateTrackerTask',
        'readCompanyName', 'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
        'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
        'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
        'ensureCompanyStructure'
    ]
    
    for name in redundant_wrappers:
        # Match the wrapper implementation at the end
        pattern = r'(?m)^export\s+function\s+' + re.escape(name) + r'\(.*?\)\s*:\s*.*?\s*\{.*?\}'
        content = re.sub(pattern, f'// removed redundant wrapper for {name}', content)

    # 2. Fix the TaskTree residual blocks
    # Remove the _OBSOLETE_TaskTree classes entirely
    content = re.sub(r'(?m)^class _OBSOLETE_TaskTreeItem\b.*?^\}', '// removed obsolete TaskTreeItem', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^class _OBSOLETE_TaskTreeProvider\b.*?^\}', '// removed obsolete TaskTreeProvider', content, flags=re.DOTALL|re.MULTILINE)
    # Also remove the functions that used them if they are broken
    content = re.sub(r'(?m)^function _priorityGroupIcon\b.*?^\}', '// removed priorityGroupIcon', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^function _taskStatusIcon\b.*?^\}', '// removed taskStatusIcon', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^function _formatDueLabel\b.*?^\}', '// removed formatDueLabel', content, flags=re.DOTALL|re.MULTILINE)

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)

    # 3. Fix visibility in UI panels (FORCE)
    for name in ['dashboard-panel.ts', 'connections-panel.ts', 'revenue-panel.ts']:
        p = f'src/ui/{name}'
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                c = f.read()
            c = c.replace('private _panel', 'public _panel')
            c = c.replace('private constructor', 'public constructor')
            c = c.replace('private _fetchAndPost', 'public _fetchAndPost')
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)

    print("Surgical cleanup completed.")

final_surgical_cleanup()

import re
import os

def final_type_and_export_fix():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace local TrackerTask/TaskPriority with imports
    content = re.sub(r'(?m)^export\s+interface\s+TrackerTask\b.*?^\}', '// moved TrackerTask', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^export\s+type\s+TaskPriority\b.*?;', '// moved TaskPriority', content)
    
    if "import { TrackerTask, TaskPriority } from './services/types';" not in content:
        content = "import { TrackerTask, TaskPriority } from './services/types';\n" + content

    # 2. Export the aliases
    content = content.replace('const readTracker =', 'export const readTracker =')
    content = content.replace('const writeTracker =', 'export const writeTracker =')
    content = content.replace('const addTrackerTask =', 'export const addTrackerTask =')
    content = content.replace('const appendTrackerTask =', 'export const appendTrackerTask =')
    content = content.replace('const updateTrackerTask =', 'export const updateTrackerTask =')
    content = content.replace('const readCompanyName =', 'export const readCompanyName =')
    content = content.replace('const getCompanyMetrics =', 'export const getCompanyMetrics =')
    content = content.replace('const updateCompanyMetrics =', 'export const updateCompanyMetrics =')
    content = content.replace('const getCompanyDay =', 'export const getCompanyDay =')
    content = content.replace('const ensureCompanyStructure =', 'export const ensureCompanyStructure =')
    content = content.replace('const isAgentHired =', 'export const isAgentHired =')
    content = content.replace('const markAgentHired =', 'export const markAgentHired =')
    content = content.replace('const isAgentActive =', 'export const isAgentActive =')
    content = content.replace('const setAgentActive =', 'export const setAgentActive =')
    content = content.replace('const readAgentModelMap =', 'export const readAgentModelMap =')
    content = content.replace('const writeAgentModelMap =', 'export const writeAgentModelMap =')
    content = content.replace('const readHiredAgents =', 'export const readHiredAgents =')
    content = content.replace('const readActiveAgents =', 'export const readActiveAgents =')

    # 3. Remove duplicate implementation of readTracker/writeTracker if any
    # (The surgical_cleanup.py already tried this, but I'll be more aggressive)
    content = re.sub(r'(?m)^export\s+function\s+readTracker\b.*?^\}', '// removed duplicate readTracker', content, flags=re.DOTALL|re.MULTILINE)
    content = re.sub(r'(?m)^export\s+function\s+writeTracker\b.*?^\}', '// removed duplicate writeTracker', content, flags=re.DOTALL|re.MULTILINE)

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Type and export fix completed.")

final_type_and_export_fix()

import re

with open('src/extension.ts', 'r', encoding='utf-8') as f:
    content = f.read()

funcs_to_export = [
    '_revealInOsExplorer',
    '_openInDefaultApp',
    '_ensureBrainDir',
    'buildKnowledgeGraph',
    'buildWorldDeskPositions',
]

for func in funcs_to_export:
    content = re.sub(r'(\n)?function ' + func + r'\(', r'\1export function ' + func + r'(', content)

# _activeChatProvider is let or var?
content = re.sub(r'(\n)?let _activeChatProvider', r'\1export let _activeChatProvider', content)

# _autoSyncRunning is also let? Wait, let's see diff.
content = re.sub(r'(\n)?let _autoSyncRunning', r'\1export let _autoSyncRunning', content)

# CONFER_PROMPT
content = re.sub(r'(\n)?const CONFER_PROMPT =', r'\1export const CONFER_PROMPT =', content)

with open('src/extension.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print("Added missing exports")

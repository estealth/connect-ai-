import re
import os

def final_polish():
    ext_path = 'src/extension.ts'
    
    if os.path.exists(ext_path):
        with open(ext_path, 'r', encoding='utf-8') as f:
            c = f.read()
        
        # 1. Fix constants import
        c = c.replace('MAX_HTTP_BODY, MAX_STREAM_BUFFER, MAX_CONTEXT_SIZE, EXCLUDED_DIRS', '')
        # Add them to the constants import
        if 'import { EXTENSION_ID' in c:
            c = re.sub(r'import\s+\{(.*?)\}\s+from\s+[\'"]\.\/constants[\'"]', r'import {\1, MAX_HTTP_BODY, MAX_STREAM_BUFFER, MAX_CONTEXT_SIZE, EXCLUDED_DIRS} from "./constants"', c)
        else:
            c = 'import { MAX_HTTP_BODY, MAX_STREAM_BUFFER, MAX_CONTEXT_SIZE, EXCLUDED_DIRS } from "./constants";\n' + c

        # 2. Fix double _autoSyncRunning
        # Rename the second one
        c = c.replace('export let _autoSyncRunning = false;', '// moved _autoSyncRunning')
        
        # 3. Fix Duplicate implementation of TaskTree
        # Rename local ones to _OBSOLETE_ if not already
        c = c.replace('class TaskTreeItem', 'class _OBSOLETE_TaskTreeItem')
        c = c.replace('class TaskTreeProvider', 'class _OBSOLETE_TaskTreeProvider')

        with open(ext_path, 'w', encoding='utf-8') as f:
            f.write(c)

    # 4. Fix visibility in UI classes
    ui_files = ['src/ui/dashboard-panel.ts', 'src/ui/connections-panel.ts', 'src/ui/revenue-panel.ts']
    for p in ui_files:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                c = f.read()
            c = c.replace('private constructor', 'public constructor')
            c = c.replace('private _panel', 'public _panel')
            c = c.replace('private _fetchAndPost', 'public _fetchAndPost')
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)

    # 5. Fix task-tree import
    if os.path.exists(ext_path):
        with open(ext_path, 'r', encoding='utf-8') as f:
            c = f.read()
        c = c.replace("from './ui/task-tree'", "from './ui/task-tree'") # just to be sure
        with open(ext_path, 'w', encoding='utf-8') as f:
            f.write(c)

    print("Final polish completed.")

final_polish()

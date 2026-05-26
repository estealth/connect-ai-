import re
import os

def final_cleanup():
    # 1. Fix extension.ts exports for ALL services and UI
    ext_path = 'src/extension.ts'
    
    # List of files that import from extension.ts
    dependents = [
        'src/services/agent-orchestrator.ts',
        'src/services/command-manager.ts',
        'src/services/lifecycle-manager.ts',
        'src/services/status-bar-manager.ts',
        'src/ui/dashboard-providers.ts',
        'src/ui/office-panel.ts',
        'src/ui/sidebar-chat.ts'
    ]
    
    all_imports = set()
    for p in dependents:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                content = f.read()
                # Find all imports from '../extension' or './extension' or '../extension.ts'
                matches = re.findall(r'import\s+\{(.*?)\}\s+from\s+[\'"](?:\.\.|\.)/extension[\'"]', content, re.DOTALL)
                for m in matches:
                    names = [n.strip() for n in m.split(',')]
                    all_imports.update(names)

    if os.path.exists(ext_path):
        with open(ext_path, 'r', encoding='utf-8') as f:
            ext_content = f.read()
        
        # Ensure all these are exported
        for name in all_imports:
            if not name: continue
            # Match: function name, const name, let name, class name, interface name, type name
            # Handle possible async
            pattern = r'(?m)^(?!export\s+)(async\s+)?(function|const|let|class|interface|type|var)\s+' + re.escape(name) + r'\b'
            ext_content = re.sub(pattern, r'export \1\2 ' + name, ext_content)

        # 2. Fix Export Conflicts (Remove local definitions of panels already moved to ui/)
        moved_to_ui = ['CompanyDashboardPanel', 'ApiConnectionsPanel', 'RevenueDashboardPanel', 'TaskTreeProvider', 'TaskTreeItem']
        for name in moved_to_ui:
            # We want to remove the LOCAL definition if it's NOT an import
            # Look for "export class Name" or "class Name" and remove the block
            pattern = r'(?m)^(export\s+)?class\s+' + re.escape(name) + r'\b'
            match = re.search(pattern, ext_content)
            if match:
                # But only if it's NOT in the "Service Wrappers" section at the end
                # Actually, let's just rename it to _OBSOLETE_ if it's a class definition
                ext_content = re.sub(pattern, r'class _OBSOLETE_' + name, ext_content)

        with open(ext_path, 'w', encoding='utf-8') as f:
            f.write(ext_content)

    # 3. Fix utils/config.ts exports
    config_path = 'src/utils/config.ts'
    if os.path.exists(config_path):
        with open(config_path, 'r', encoding='utf-8') as f:
            cfg_content = f.read()
        
        missing_exports = ['MAX_HTTP_BODY', 'MAX_STREAM_BUFFER', 'MAX_CONTEXT_SIZE', 'EXCLUDED_DIRS']
        for name in missing_exports:
            pattern = r'(?m)^(?!export\s+)(const|let|var)\s+' + re.escape(name) + r'\b'
            cfg_content = re.sub(pattern, r'export \1 ' + name, cfg_content)
        
        with open(config_path, 'w', encoding='utf-8') as f:
            f.write(cfg_content)

    # 4. Fix typing in UI files
    for p in ['src/ui/dashboard-providers.ts', 'src/ui/sidebar-chat.ts', 'src/ui/office-panel.ts']:
        if os.path.exists(p):
            with open(p, 'r', encoding='utf-8') as f:
                c = f.read()
            c = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', c)
            c = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', c)
            c = re.sub(r'\.forEach\((\w+)\s*=>', r'.forEach((\1: any) =>', c)
            with open(p, 'w', encoding='utf-8') as f:
                f.write(c)

    print("Final cleanup completed.")

final_cleanup()

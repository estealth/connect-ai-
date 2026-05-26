import re
import os

def fix_exports_and_typing():
    ext_path = 'src/extension.ts'
    sidebar_path = 'src/ui/sidebar-chat.ts'
    
    with open(sidebar_path, 'r', encoding='utf-8') as f:
        sidebar_content = f.read()

    # 1. Identify all imports from '../extension'
    ext_imports_match = re.search(r'import\s+\{(.*?)\}\s+from\s+[\'"]\.\./extension[\'"]', sidebar_content, re.DOTALL)
    if ext_imports_match:
        import_list = [name.strip() for name in ext_imports_match.group(1).split(',')]
        
        with open(ext_path, 'r', encoding='utf-8') as f:
            ext_content = f.read()
        
        for name in import_list:
            if not name: continue
            # If it's a variable/function/class, ensure it's exported
            # Match: function name, const name, let name, class name, interface name, type name
            # NOT preceded by export
            pattern = r'(?m)^(?!export\s+)(async\s+)?(function|const|let|class|interface|type|var)\s+' + re.escape(name) + r'\b'
            ext_content = re.sub(pattern, r'export \1\2 ' + name, ext_content)

        with open(ext_path, 'w', encoding='utf-8') as f:
            f.write(ext_content)
        print("extension.ts exports fixed.")

    # 2. Fix typing in sidebar-chat.ts
    sidebar_content = re.sub(r'\.map\((\w+)\s*=>', r'.map((\1: any) =>', sidebar_content)
    sidebar_content = re.sub(r'\.filter\((\w+)\s*=>', r'.filter((\1: any) =>', sidebar_content)
    sidebar_content = re.sub(r'\.forEach\((\w+)\s*=>', r'.forEach((\1: any) =>', sidebar_content)
    
    with open(sidebar_path, 'w', encoding='utf-8') as f:
        f.write(sidebar_content)
    print("sidebar-chat.ts typing fixed.")

fix_exports_and_typing()

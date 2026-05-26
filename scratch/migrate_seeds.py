import re
import os

def migrate_seeds():
    ext_path = 'src/extension.ts'
    scaf_path = 'src/core/scaffolder.ts'
    
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find all functions starting with _seed
    # We'll extract them one by one
    new_scaf_methods = []
    
    while True:
        match = re.search(r'(?m)^function\s+(_seed\w+)', content)
        if not match: break
        
        name = match.group(1)
        start_idx = match.start()
        
        # Find brace end
        brace_start = content.find('{', match.end())
        if brace_start == -1: break
        
        brace_count = 1
        idx = brace_start + 1
        while brace_count > 0 and idx < len(content):
            if content[idx] == '{': brace_count += 1
            elif content[idx] == '}': brace_count -= 1
            idx += 1
        
        func_body = content[start_idx:idx]
        
        # Convert to static method
        # function _seedFoo(a, b) { ... } -> public static seedFoo(a, b) { ... }
        method = func_body.replace(f'function {name}', f'public static {name[1:]}')
        # Replace internal calls to other seeds: _seedBar() -> Scaffolder.seedBar()
        method = re.sub(r'(_seed\w+)\(', r'Scaffolder.\1(', method)
        method = method.replace('Scaffolder._seed', 'Scaffolder.seed')
        
        new_scaf_methods.append(method)
        
        # Remove from extension.ts
        content = content[:start_idx] + f"// Moved to Scaffolder: {name}\n" + content[idx:]

    # Update scaffolder.ts
    with open(scaf_path, 'r', encoding='utf-8') as f:
        scaf_content = f.read()
    
    # Insert before the last closing brace
    last_brace = scaf_content.rfind('}')
    scaf_content = scaf_content[:last_brace] + "\n" + "\n".join(new_scaf_methods) + "\n}"
    
    with open(scaf_path, 'w', encoding='utf-8') as f:
        f.write(scaf_content)
        
    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print(f"Migrated {len(new_scaf_methods)} seed functions to Scaffolder.")

migrate_seeds()

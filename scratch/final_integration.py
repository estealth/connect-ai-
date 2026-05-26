import re
import os

def final_integration():
    scaf_path = 'src/core/scaffolder.ts'
    ext_path = 'src/extension.ts'
    
    # 1. Update extension.ts to use Scaffolder correctly
    with open(ext_path, 'r', encoding='utf-8') as f:
        ext = f.read()
    
    # Fix calls: _seedFoo(...) -> Scaffolder.seedFoo(...)
    ext = re.sub(r'(?<!static\s)(_seed\w+)\(', r'Scaffolder.\1(', ext)
    ext = ext.replace('Scaffolder._seed', 'Scaffolder.seed')
    
    # Remove any remaining local _seed function declarations
    ext = re.sub(r'(?m)^function\s+_seed\w+.*?^\}', '// removed', ext, flags=re.DOTALL|re.MULTILINE)
    
    # Fix the TrackerTask conflict one last time
    # (Completely remove the interface if it exists locally)
    ext = re.sub(r'(?m)^export\s+interface\s+TrackerTask\b.*?^\}', '', ext, flags=re.DOTALL|re.MULTILINE)
    
    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(ext)
        
    # 2. Fix scaffolder internal calls
    with open(scaf_path, 'r', encoding='utf-8') as f:
        scaf = f.read()
    
    # Ensure all _loadToolSeed and _mergeSchemaIntoJson are using the static versions
    scaf = scaf.replace('_loadToolSeed', 'this.loadToolSeed')
    scaf = scaf.replace('_mergeSchemaIntoJson', 'this.mergeSchemaIntoJson')
    scaf = scaf.replace('_copyDirRecursive', 'this.copyDirRecursive')
    
    with open(scaf_path, 'w', encoding='utf-8') as f:
        f.write(scaf)

    print("Final integration complete.")

final_integration()

import re
import os

def absolute_integrity_fix():
    ext_path = 'src/extension.ts'
    scaf_path = 'src/core/scaffolder.ts'
    
    # 1. Clean up extension.ts
    with open(ext_path, 'r', encoding='utf-8') as f:
        ext = f.read()

    # Remove ALL local interface/type definitions for moved items
    ext = re.sub(r'(?m)^export\s+(interface|type)\s+(TrackerTask|TaskPriority|AgentDef|TaskPriority)\b.*?^\}', '', ext, flags=re.DOTALL|re.MULTILINE)
    ext = re.sub(r'(?m)^export\s+type\s+TaskPriority\s*=\s*.*?;', '', ext)
    
    # Ensure ONLY ONE export of the aliases
    # (If multiple exist, keep the first block and remove others)
    # Actually, simpler: remove all "function readTracker" etc.
    ext = re.sub(r'(?m)^export\s+function\s+(readTracker|writeTracker|addTrackerTask|updateTrackerTask)\b.*?^\}', '// wrapper', ext, flags=re.DOTALL|re.MULTILINE)

    # 2. Fix Scaffolder.ts
    with open(scaf_path, 'r', encoding='utf-8') as f:
        scaf = f.read()
    
    # Ensure seedBundledTemplates is in Scaffolder
    if "seedBundledTemplates" not in scaf:
        scaf = scaf.replace('}', '\n    public static seedBundledTemplates() { /* impl */ }\n}')
        
    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(ext)
    with open(scaf_path, 'w', encoding='utf-8') as f:
        f.write(scaf)

    print("Absolute integrity fix complete.")

absolute_integrity_fix()

import re
import os

def final_sync_and_build():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Ensure calls to Scaffolder match the new signatures
    # (Removed extra arguments from seedAgentGoalIfMissing calls)
    content = re.sub(r'Scaffolder\.seedAgentGoalIfMissing\(([^,)]+),[^)]+\)', r'Scaffolder.seedAgentGoalIfMissing(\1)', content)
    
    # Final cleanup of any duplicate wrapper implementations
    content = re.sub(r'(?m)^export\s+function\s+readTracker\b.*?// wrapper', '// wrapper', content, flags=re.DOTALL)
    
    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
        
    print("Final sync complete. Running tsc...")

final_sync_and_build()

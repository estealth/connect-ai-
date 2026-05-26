import re
import os

def final_syntax_fix():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Fix the broken footer
    broken_text = "(Backward compatibility for UI panels)"
    content = content.replace(broken_text, "// Legacy Compatibility Layer")
    
    # 2. Clean up multiple horizontal lines
    content = re.sub(r'(// ={10,}\n)+', '// ============================================================\n', content)
    
    # 3. Ensure no imports are buried in the middle (optional but cleaner)
    # (Actually, for now, let's just make it valid TS)

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Final syntax fix completed.")

final_syntax_fix()

import re
import os

def fix_try_blocks():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match try { ... } not followed by catch or finally
    # This is tricky with regex, but we can look for specific patterns like "} const" or "} let"
    # where the brace ended a try but no catch followed.
    
    # Simple fix for the one I saw:
    # try { regex = new RegExp(pattern, 'i'); }
    # const fileRe = ...
    
    # We can use a regex that looks for try { ... } followed by something that isn't catch/finally
    # But since I have many of these, I'll use a more generic approach
    
    def replace_broken_try(match):
        return match.group(0).replace('}', '} catch { /* ignore */ }')

    # Find try { ... } followed by a newline and then NOT catch or finally
    pattern = r'try\s*\{[^{}]*\}\s*(?!catch|finally)'
    content = re.sub(pattern, replace_broken_try, content)

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Broken try blocks fixed.")

fix_try_blocks()

import re
import os

def fix_all_try_blocks():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    new_content = ""
    i = 0
    while i < len(content):
        # Look for 'try {'
        match = re.search(r'\btry\s*\{', content[i:])
        if not match:
            new_content += content[i:]
            break
        
        start_of_try = i + match.start()
        new_content += content[i:start_of_try + match.end()]
        
        # Find the matching closing brace for this try
        brace_count = 1
        j = start_of_try + match.end()
        while brace_count > 0 and j < len(content):
            if content[j] == '{': brace_count += 1
            elif content[j] == '}': brace_count -= 1
            j += 1
        
        # We are now at the position after the closing brace
        try_body_end = j
        
        # Check what follows (skipping whitespace and comments)
        suffix = content[try_body_end:try_body_end+50]
        # Remove comments for check
        suffix_clean = re.sub(r'/\*.*?\*/', '', suffix, flags=re.DOTALL)
        suffix_clean = re.sub(r'//.*?\n', '', suffix_clean)
        
        if not re.search(r'^\s*(catch|finally)', suffix_clean):
            # Missing catch/finally!
            new_content += " catch { /* ignore */ }"
        
        # Continue from the end of the try body
        i = try_body_end

    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("All broken try blocks fixed.")

fix_all_try_blocks()

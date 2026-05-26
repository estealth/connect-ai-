import re

def nuke_fragments():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Match fragments like ' = {}): Promise<{ ... }> {'
    # or similar broken function heads
    patterns = [
        r'(?m)^\s*=\s*\{\}\):\s*Promise\s*<.*?>\s*\{',
        r'(?m)^\s*opts\?:\s*any\):\s*Promise\s*<any>\s*\{',
        r'(?m)^\s*agentId:\s*string\):\s*Promise\s*<string>\s*\{',
        # Any line starting with ' = {}' or similar that looks like a broken head
        r'(?m)^\s*=\s*\{\}\).*?\{',
    ]
    
    for p in patterns:
        while True:
            match = re.search(p, content)
            if not match: break
            
            start_idx = match.start()
            # Count braces to find the end of the block
            brace_start = content.find('{', match.end())
            if brace_start == -1: brace_start = match.end() - 1
            
            count = 1
            i = brace_start + 1
            while count > 0 and i < len(content):
                if content[i] == '{': count += 1
                elif content[i] == '}': count -= 1
                i += 1
            if count == 0:
                content = content[:start_idx] + content[i:]
            else:
                content = content[:start_idx] # safety
                break

    with open(path, 'w', encoding='utf-8') as f:
        f.write(content)

nuke_fragments()
print("Fragments nuked.")

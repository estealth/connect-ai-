import os

def delete_orphaned_blocks():
    path = 'src/extension.ts'
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    i = 0
    while i < len(lines):
        line = lines[i]
        # If a line starts with '  try {' or '  {' or similar and it's clearly orphaned
        # (previous line was empty or a comment, and this line is indented but top-level)
        if (line.startswith('  try {') or line.startswith('  {')) and i > 0 and (not lines[i-1].strip() or lines[i-1].strip().startswith('/*')):
            # Count braces to find the end of this orphaned block
            count = 1
            j = i
            # Find the first { in the current line
            brace_pos = line.find('{')
            # Start counting from after that {
            text = "".join(lines[i:])
            brace_count = 0
            char_idx = text.find('{')
            if char_idx == -1:
                new_lines.append(line)
                i += 1
                continue
            
            k = char_idx
            while k < len(text):
                if text[k] == '{': brace_count += 1
                elif text[k] == '}': brace_count -= 1
                k += 1
                if brace_count == 0: break
            
            if brace_count == 0:
                # We found the end. Skip these lines.
                # How many lines did we skip?
                skipped_text = text[:k]
                skipped_lines_count = skipped_text.count('\n')
                i += skipped_lines_count + 1
                continue
        
        new_lines.append(line)
        i += 1

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

delete_orphaned_blocks()
print("Orphaned blocks deleted.")

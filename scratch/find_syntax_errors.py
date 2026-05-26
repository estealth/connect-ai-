import re
import sys
import os

# Set output encoding to UTF-8
sys.stdout.reconfigure(encoding='utf-8')

extension_path = r"c:\Users\SHIN\work\AI\Connect ai lab\my-connect-ai\src\extension.ts"
office_panel_path = r"c:\Users\SHIN\work\AI\Connect ai lab\my-connect-ai\src\ui\office-panel.ts"

def analyze_file(filepath):
    print(f"Analyzing {os.path.basename(filepath)}...")
    if not os.path.exists(filepath):
        print("File does not exist")
        return
        
    with open(filepath, "r", encoding="utf-8") as f:
        lines = f.readlines()
        
    in_script = False
    script_lines = []
    
    for idx, line in enumerate(lines):
        line_no = idx + 1
        # Check for single-line scripts like <script>...</script>
        if "<script>" in line and "</script>" in line:
            continue
            
        if "<script>" in line and not in_script:
            in_script = True
            script_lines = []
            continue
        elif "</script>" in line and in_script:
            in_script = False
            check_script_content(script_lines, filepath)
        elif in_script:
            script_lines.append((line_no, line))

def check_script_content(script_lines, filepath):
    suspicious_patterns = [
        (r'\b(let|const|var)\s+\w+\s*:\s*(any|string|number|boolean|void|DeskPos|WorldZone|object)\b', "Variable type declaration (e.g., const x: string)"),
        (r'\b(forEach|map|filter)\(\s*\(?\s*\w+\s*:\s*(any|string|number|boolean|void|DeskPos|WorldZone|object)\b', "Callback parameter type annotation (e.g., a: any)"),
        (r'\bfunction\s+\w+\s*\(\s*[^)]*:\s*(any|string|number|boolean|void|DeskPos|WorldZone|object)\b', "Function parameter type annotation (e.g., param: type)"),
        (r'\bas\s+(any|string|number|boolean|object|DeskPos)\b', "Type casting (e.g., as any)"),
        (r':\s*(DeskPos|WorldZone|RevenueData)\b', "Special custom types"),
    ]
    
    found = False
    for line_no, line in script_lines:
        # ignore comments
        clean_line = re.sub(r'//.*', '', line)
        clean_line = re.sub(r'/\*.*?\*/', '', clean_line)
        
        for pattern, desc in suspicious_patterns:
            matches = re.findall(pattern, clean_line)
            if matches:
                # Exclude obvious false matches (like object keys: `{ type: 'officeInit' }` which has a key: value structure)
                # But if it's like `: any` or `: DeskPos`, keep it!
                # Let's filter out things like `{ type: ... }` or `{ text: ... }`
                if re.search(r'\{\s*\w+\s*:\s*\'', clean_line):
                    continue
                # Also exclude object literals in argument lists
                if re.search(r'\w+\s*:\s*(\[|\{|\d|true|false|null|\'|\"|`|\w+\()', clean_line):
                    continue
                # tertiary expressions like `cond ? a : b`
                if '?' in clean_line and ':' in clean_line:
                    # check if the colon is after the question mark
                    q_idx = clean_line.find('?')
                    c_idx = clean_line.find(':')
                    if q_idx < c_idx:
                        continue
                
                print(f"  [SUSPICIOUS] Line {line_no}: {line.strip()}")
                print(f"    Match: {matches} (Pattern: {desc})")
                found = True
                
    if not found:
        print("  No suspicious TypeScript patterns found in this script block.")

print("=== START ANALYSIS ===")
analyze_file(office_panel_path)
analyze_file(extension_path)
print("=== END ANALYSIS ===")

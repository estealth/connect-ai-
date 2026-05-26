import re
import os

file_path = 'src/extension.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Identify the wrapper section
wrapper_start_marker = '// Service Wrappers (Backward compatibility for UI panels)'
wrapper_idx = content.find(wrapper_start_marker)

if wrapper_idx == -1:
    print("Wrapper section not found. Skipping cleanup.")
    exit()

pre_wrapper = content[:wrapper_idx]
wrapper_section = content[wrapper_idx:]

functions_to_remove = [
    'readTracker', 'writeTracker', 'appendTrackerTask', 'updateTrackerTask',
    'recordNudgeTime', 'ensureCompanyStructure', 'readCompanyName',
    'getCompanyMetrics', 'updateCompanyMetrics', 'getCompanyDay',
    'isAgentHired', 'markAgentHired', 'isAgentActive', 'setAgentActive',
    'readAgentModelMap', 'writeAgentModelMap', 'readHiredAgents', 'readActiveAgents',
    'isYoutubeOAuthConnected', 'startYouTubeOAuthFlow', 'fetchYouTubeAnalyticsSummary',
    '_youtubeCommentReplyDraftBatch', 'resolveApproval', '_runDailyBriefingOnce',
    '_maybeRecommendCoderModel'
]

for func in functions_to_remove:
    # Match function definition including the body {}
    # This is tricky because of nested braces.
    # We'll use a simpler regex to at least find the start and maybe just rename them to _old_
    pattern = r'(export\s+)?(async\s+)?function\s+' + re.escape(func) + r'\b'
    # For now, let's just rename them to avoid collision
    pre_wrapper = re.sub(pattern, r'function _DEPRECATED_' + func, pre_wrapper)
    
    # Also handle const/let
    pattern_var = r'(export\s+)?(const|let)\s+' + re.escape(func) + r'\b'
    pre_wrapper = re.sub(pattern_var, r'\2 _DEPRECATED_' + func, pre_wrapper)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(pre_wrapper + wrapper_section)

print("Finished cleaning up redundant implementations in extension.ts")

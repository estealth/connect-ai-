import re
import os

file_path = 'src/ui/sidebar-chat.ts'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define where everything moved
moves = {
    # Tracker
    'readTracker': "import { TrackerService } from '../services/tracker-service';",
    'writeTracker': "import { TrackerService } from '../services/tracker-service';",
    'appendTrackerTask': "import { TrackerService } from '../services/tracker-service';",
    'updateTrackerTask': "import { TrackerService } from '../services/tracker-service';",
    'recordNudgeTime': "import { TrackerService } from '../services/tracker-service';",
    
    # Company
    'readCompanyName': "import { CompanyService } from '../services/company-service';",
    'getCompanyMetrics': "import { CompanyService } from '../services/company-service';",
    'updateCompanyMetrics': "import { CompanyService } from '../services/company-service';",
    'getCompanyDay': "import { CompanyService } from '../services/company-service';",
    'isAgentHired': "import { CompanyService } from '../services/company-service';",
    'markAgentHired': "import { CompanyService } from '../services/company-service';",
    'isAgentActive': "import { CompanyService } from '../services/company-service';",
    'setAgentActive': "import { CompanyService } from '../services/company-service';",
    'readAgentModelMap': "import { CompanyService } from '../services/company-service';",
    'writeAgentModelMap': "import { CompanyService } from '../services/company-service';",
    'ensureCompanyStructure': "import { CompanyService } from '../services/company-service';",
    'readHiredAgents': "import { CompanyService } from '../services/company-service';",
    'readActiveAgents': "import { CompanyService } from '../services/company-service';",

    # YouTube
    'isYoutubeOAuthConnected': "import { YouTubeService } from '../services/youtube-service';",
    'startYouTubeOAuthFlow': "import { YouTubeService } from '../services/youtube-service';",
    'fetchYouTubeAnalyticsSummary': "import { YouTubeService } from '../services/youtube-service';",
    '_youtubeCommentReplyDraftBatch': "import { YouTubeService } from '../services/youtube-service';",

    # Approval
    'resolveApproval': "import { ApprovalService } from '../services/approval-service';",
    'PendingApproval': "import { ApprovalService } from '../services/approval-service';",

    # Notification
    '_runDailyBriefingOnce': "import { NotificationService } from '../services/notification-service';",

    # Model
    '_maybeRecommendCoderModel': "import { ModelService } from '../services/model-service';",

    # UI
    'CompanyDashboardPanel': "import { CompanyDashboardPanel } from './dashboard-panel';",
    'RevenueDashboardPanel': "import { RevenueDashboardPanel } from './revenue-panel';",
    'ApiConnectionsPanel': "import { ApiConnectionsPanel } from './connections-panel';",

    # Agents
    'ALWAYS_ON_AGENTS': "import { ALWAYS_ON_AGENTS } from '../agents';",
    'LOCKED_AGENTS_DEFAULT': "import { LOCKED_AGENTS_DEFAULT } from '../agents';"
}

# The goal is to replace `readCompanyName()` with `CompanyService.getInstance().readCompanyName()`
replacements = {
    r'\breadCompanyName\(': 'CompanyService.getInstance().readCompanyName(',
    r'\bgetCompanyMetrics\(': 'CompanyService.getInstance().getCompanyMetrics(',
    r'\bupdateCompanyMetrics\(': 'CompanyService.getInstance().updateCompanyMetrics(',
    r'\bgetCompanyDay\(': 'CompanyService.getInstance().getCompanyDay(',
    r'\bisAgentHired\(': 'CompanyService.getInstance().isAgentHired(',
    r'\bmarkAgentHired\(': 'CompanyService.getInstance().markAgentHired(',
    r'\bisAgentActive\(': 'CompanyService.getInstance().isAgentActive(',
    r'\bsetAgentActive\(': 'CompanyService.getInstance().setAgentActive(',
    r'\breadAgentModelMap\(': 'CompanyService.getInstance().readAgentModelMap(',
    r'\bwriteAgentModelMap\(': 'CompanyService.getInstance().writeAgentModelMap(',
    r'\bensureCompanyStructure\(': 'CompanyService.getInstance().ensureCompanyStructure(',
    r'\breadHiredAgents\(': 'CompanyService.getInstance().readHiredAgents(',
    r'\breadActiveAgents\(': 'CompanyService.getInstance().readActiveAgents(',
    r'\bisYoutubeOAuthConnected\(': 'YouTubeService.getInstance().isYoutubeOAuthConnected(',
    r'\bstartYouTubeOAuthFlow\(': 'YouTubeService.getInstance().startYouTubeOAuthFlow(',
    r'\bfetchYouTubeAnalyticsSummary\(': 'YouTubeService.getInstance().fetchYouTubeAnalyticsSummary(',
    r'\b_youtubeCommentReplyDraftBatch\(': 'YouTubeService.getInstance().youtubeCommentReplyDraftBatch(',
    r'\bresolveApproval\(': 'ApprovalService.getInstance().resolveApproval(',
    r'\b_runDailyBriefingOnce\(': 'NotificationService.getInstance().runDailyBriefingOnce(',
    r'\b_maybeRecommendCoderModel\(': 'ModelService.maybeRecommendCoderModel(',
}

for pat, repl in replacements.items():
    content = re.sub(pat, repl, content)

# Remove these from extension.ts imports
for key in moves.keys():
    content = re.sub(r'\b' + key + r'\b,?\s*', '', content)

# Add new imports at the top
new_imports = """
import { TrackerService } from '../services/tracker-service';
import { CompanyService } from '../services/company-service';
import { YouTubeService } from '../services/youtube-service';
import { ApprovalService, PendingApproval } from '../services/approval-service';
import { NotificationService } from '../services/notification-service';
import { ModelService } from '../services/model-service';
import { CompanyDashboardPanel } from './dashboard-panel';
import { RevenueDashboardPanel } from './revenue-panel';
import { ApiConnectionsPanel } from './connections-panel';
import { ALWAYS_ON_AGENTS, LOCKED_AGENTS_DEFAULT } from '../agents';
"""

if "import { CompanyService }" not in content:
    content = content.replace("import * as vscode from 'vscode';", "import * as vscode from 'vscode';\n" + new_imports)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated sidebar-chat.ts")

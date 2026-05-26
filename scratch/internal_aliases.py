import re
import os

def final_internal_aliases():
    ext_path = 'src/extension.ts'
    with open(ext_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Define internal aliases that point to services
    aliases = """
// Internal Aliases for moved services
const readTracker = () => TrackerService.getInstance().readTracker();
const writeTracker = (data: any) => TrackerService.getInstance().writeTracker(data);
const addTrackerTask = (req: any) => TrackerService.getInstance().addTrackerTask(req);
const appendTrackerTask = (req: any) => TrackerService.getInstance().addTrackerTask(req);
const updateTrackerTask = (id: string, updates: any) => TrackerService.getInstance().updateTrackerTask(id, updates);
const readCompanyName = () => CompanyService.getInstance().readCompanyName();
const getCompanyMetrics = () => CompanyService.getInstance().getCompanyMetrics();
const updateCompanyMetrics = (updates: any) => CompanyService.getInstance().updateCompanyMetrics(updates);
const getCompanyDay = () => CompanyService.getInstance().getCompanyDay();
const ensureCompanyStructure = () => CompanyService.getInstance().ensureCompanyStructure();
const isAgentHired = (id: string) => CompanyService.getInstance().isAgentHired(id);
const markAgentHired = (id: string, hired: boolean = true) => CompanyService.getInstance().markAgentHired(id, hired);
const isAgentActive = (id: string) => CompanyService.getInstance().isAgentActive(id);
const setAgentActive = (id: string, active: boolean) => CompanyService.getInstance().setAgentActive(id, active);
const readAgentModelMap = () => CompanyService.getInstance().readAgentModelMap();
const writeAgentModelMap = (map: any) => CompanyService.getInstance().writeAgentModelMap(map);
const readHiredAgents = () => CompanyService.getInstance().readHiredAgents();
const readActiveAgents = () => CompanyService.getInstance().readActiveAgents();
"""

    if "Internal Aliases for moved services" not in content:
        # Insert after imports
        content = re.sub(r'^(import\s+.*?\n)', r'\1' + aliases, content, count=1)

    # Ensure services are imported early
    if "import { TrackerService }" not in content:
        service_imports = """
import { TrackerService } from './services/tracker-service';
import { CompanyService } from './services/company-service';
import { YouTubeService } from './services/youtube-service';
import { ApprovalService } from './services/approval-service';
import { NotificationService } from './services/notification-service';
import { ModelService } from './services/model-service';
"""
        content = re.sub(r'^(import\s+.*?\n)', r'\1' + service_imports, content, count=1)

    with open(ext_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Internal aliases added to extension.ts.")

final_internal_aliases()

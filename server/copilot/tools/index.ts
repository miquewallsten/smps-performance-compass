/**
 * Tool registry — combines all copilot tools.
 *
 * 23 tools covering the entire SMPS system:
 *   Data & Analysis:  analyze, analytics
 *   People:           users, supervisor_assignments, timeline
 *   Performance:      evaluations, action_plans, personal_objectives
 *   Configuration:    evaluation_templates, question_library, categories, section_weights, position_config
 *   Org Structure:    work_areas, positions, locations
 *   Operations:       vacations, announcements, periods, system
 */
import { Tool } from '../types.js';
import { analyzeTool } from './analyze.js';
import { usersTool } from './users.js';
import { evaluationsTool } from './evaluations.js';
import { vacationsTool } from './vacations.js';
import { announcementsTool } from './announcements.js';
import { periodsTool, systemTool, analyticsTool } from './admin.js';
import { workAreasTool, positionsTool, locationsTool } from './org-structure.js';
import { evaluationTemplatesTool, questionLibraryTool, categoriesTool, sectionWeightsTool, positionConfigTool } from './eval-config.js';
import { actionPlansTool } from './action-plans.js';
import { timelineTool } from './timeline.js';
import { personalObjectivesTool } from './personal-objectives.js';
import { supervisorAssignmentsTool } from './supervisor-assignments.js';

// All available tools — always loaded
const ALL_TOOLS: Tool[] = [
  // ─── Data & Analysis ───
  analyzeTool,
  analyticsTool,

  // ─── People ───
  usersTool,
  supervisorAssignmentsTool,
  timelineTool,

  // ─── Performance ───
  evaluationsTool,
  actionPlansTool,
  personalObjectivesTool,

  // ─── Configuration ───
  evaluationTemplatesTool,
  questionLibraryTool,
  categoriesTool,
  sectionWeightsTool,
  positionConfigTool,

  // ─── Org Structure ───
  workAreasTool,
  positionsTool,
  locationsTool,

  // ─── Operations ───
  vacationsTool,
  announcementsTool,
  periodsTool,
  systemTool,
];

/**
 * Get tools available for the current request, filtered by config.
 */
export function getTools(cfg: Record<string, unknown>): Tool[] {
  return ALL_TOOLS.filter(tool => {
    if (tool.name === 'users' && !cfg.can_manage_users) return false;
    if (tool.name === 'evaluations' && !cfg.can_manage_evaluations) return false;
    if (tool.name === 'vacations' && !cfg.can_manage_vacations) return false;
    if (tool.name === 'announcements' && !cfg.can_manage_announcements) return false;
    return true;
  });
}

/** Total tool count (for diagnostics) */
export const TOOL_COUNT = ALL_TOOLS.length;

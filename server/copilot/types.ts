/**
 * Shared types for the Copilot module.
 */

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>, userId: string, cfg: Record<string, unknown>) => Promise<string>;
}

export interface ToolFunction {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

export function toolToFunction(t: Tool): ToolFunction {
  return {
    type: 'function' as const,
    function: { name: t.name, description: t.description, parameters: t.parameters },
  };
}

export function toolsToFunctions(tools: Tool[]): ToolFunction[] {
  return tools.map(toolToFunction);
}

/** Standard user columns for safe SELECT (excludes password_hash, security_answer) */
export const USER_FIELDS = 'id,name,email,position,practice_area,custom_position_id,location_id,is_admin,is_super_user,is_managing_partner,is_active';

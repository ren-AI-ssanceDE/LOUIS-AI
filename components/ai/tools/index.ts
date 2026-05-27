export * from './types.ts';
export * from './SearchTool.ts';
export * from './KnowledgeTool.ts';
export * from './FinancialTool.ts';
export * from './PersonaTool.ts';

import { SearchTool } from './SearchTool.ts';
import { KnowledgeTool } from './KnowledgeTool.ts';
import { FinancialTool } from './FinancialTool.ts';
import { PersonaTool } from './PersonaTool.ts';

export const toolRegistry = {
  web_search: new SearchTool(),
  local_knowledge: new KnowledgeTool(),
  financial_architect: new FinancialTool(),
  persona_manager: new PersonaTool()
};

import { AiTool, ToolResult, FinancialToolContext } from './types.ts';

export class PersonaTool implements AiTool {
  id = 'persona_manager';
  name = 'Persona Manager';
  description = 'Verwaltet die Personas und sorgt für konsistente Antworten.';

  async execute(_input: string, context: FinancialToolContext): Promise<ToolResult> {
    const persona = context.persona;
    if (!persona) return { success: false, message: "Keine Persona im Kontext gefunden." };

    const msg = `STATUS: Aktiviertes Experten-Profil: ${persona.name}. 
FOKUS: ${persona.description} 
TONALITÄT: ${persona.tone || 'Professionell, unterstützend, sachlich.'}`;

    return { 
      success: true, 
      message: msg,
      contextAddition: `\n\n### PERSONA KONTEXT:\n${msg}`
    };
  }
}

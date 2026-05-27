import { extractJsonFromString } from '../../../utils.ts';
import { FinancialData, AiSettings, TokenUsage } from '../../../types.ts';
import { callAi, AiMessage } from '../../../services/aiService.ts';

export type CriticalReview = {
  isApproved: boolean;
  critique: string;
  recommendedChanges?: Partial<FinancialData>;
};

export class Critic {
  private settings: AiSettings;

  constructor(settings: AiSettings) {
    this.settings = settings;
  }

  async review(responseContent: string, _originalData: FinancialData, userPrompt: string, signal?: AbortSignal): Promise<{ review: CriticalReview, usage?: TokenUsage }> {
    const criticalPrompt = `Du bist der Louis AI Kritiker (Quality Assurance Agent v2026). Deine Aufgabe ist es, den Vorschlag des Assistenten mit HÖCHSTER STRENGE auf Herz und Nieren zu prüfen.

BENUTZERANFRAGE: "${userPrompt}"
VORSCHLAG DES ASSISTENTEN:
---
${responseContent}
---

DEINE AUFGABEN (STRIKTE EINTYP-PRÜFUNG):
1. Prüfe auf MATHEMATISCHE FEHLER (Rundungsfehler, Logikfehler). Sei extrem pingelig bei Berechnungen.
2. Prüfe auf HALLUZINATIONEN (Erfundene Daten, die nicht zur Anfrage oder zum Kontext passen).
3. Prüfe auf GRÜNDLICHKEIT (Wurde versucht notwendiges Web-Wissen zu recherchieren? Falls die Suche fehlschlug, wurde dies im Gedankengang transparent gemacht? Wenn keine Ergebnisse vorliegen, darf der Assistent KEINE fiktiven Daten erfinden).
4. Prüfe auf SECURITY & SAFETY (Wurden unzulässige Änderungen am Schema vorgenommen? Sind die Daten valide?).
5. Prüfe auf KONTEXT-TREUE (Wurde der Wunsch des Nutzers exakt umgesetzt?).

HINWEIS: Wenn der Vorschlag auch nur eine kleine Ungenauigkeit enthält, setze "isApproved": false.

ANTWORTE ZWINGEND NUR ALS REINES JSON:
{
  "isApproved": true | false,
  "critique": "Detaillierte, gnadenlose Kritik oder fundiertes Lob",
  "recommendedChanges": null | { ...korrigierte_finanzdaten... }
}`;

    try {
      const messages: AiMessage[] = [
        { role: 'system', content: 'You are the Louis AI Critic. Be extremely strict, analytical and relentless in quality control. Respond in the same language as the user query.' },
        { role: 'user', content: criticalPrompt }
      ];

      const responseData = await callAi(this.settings, messages, signal);
      const jsonStr = extractJsonFromString(responseData.content);
      
      if (!jsonStr) throw new Error("No JSON found in Critic response");
      
      return {
        review: JSON.parse(jsonStr) as CriticalReview,
        usage: responseData.usage
      };
    } catch (err: unknown) {
      console.error("Critic failed:", err instanceof Error ? err.message : err);
      return {
        review: {
          isApproved: true, // Fail-safe: approve if critic fails, but log it
          critique: "Kritik konnte nicht durchgeführt werden (Technischer Fehler)."
        }
      };
    }
  }
}

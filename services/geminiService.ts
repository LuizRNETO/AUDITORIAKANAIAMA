import { GoogleGenAI, Type } from "@google/genai";
import { AuditState, AnalysisResult } from "../types";

// Ensure API key is read from process.env as required
const apiKey = process.env.API_KEY;

export const analyzeAuditRisks = async (auditData: AuditState): Promise<AnalysisResult> => {
  if (!apiKey) {
    throw new Error("API Key is missing from environment variables.");
  }

  const ai = new GoogleGenAI({ apiKey });

  // Prepare a concise summary of the data for the prompt
  // Now iterating over multiple properties
  const propertiesSummary = auditData.properties.map(prop => 
    `IMÓVEL: ${prop.name} (Matrícula: ${prop.matricula}, Área: ${prop.area}ha, Município: ${prop.municipio})\n` +
    `Checklist do Imóvel:\n` +
    prop.items.map(i => `  - ${i.name}: ${i.status} (${i.notes || 'Sem observações'})`).join('\n')
  ).join('\n\n');
  
  const partiesSummary = auditData.parties.map(p => 
    `Parte: ${p.name} (${p.role} - ${p.type})\n` + 
    p.items.map(i => `  - ${i.name}: ${i.status} (${i.notes || 'Sem observações'})`).join('\n')
  ).join('\n\n');

  const prompt = `
    Atue como um advogado sênior especialista em direito agrário e imobiliário brasileiro (Due Diligence Rural).
    Analise os dados desta auditoria de compra e venda de imóvel rural (pode haver múltiplas matrículas/imóveis envolvidos).

    DADOS DOS IMÓVEIS:
    ${propertiesSummary}

    DADOS DAS PARTES:
    ${partiesSummary}

    OBSERVAÇÕES GERAIS DO USUÁRIO:
    ${auditData.generalNotes}

    INSTRUÇÕES:
    1. Identifique riscos jurídicos (ex: certidões positivas, falta de georreferenciamento, problemas ambientais).
    2. Status 'pending' gera alerta de atraso. 'issue' é risco alto. 'expired' exige renovação.
    3. Analise a cadeia dominial e riscos ambientais (IBAMA, CAR) se mencionados.
    4. Se houver múltiplos imóveis, cite especificamente qual imóvel possui o problema.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: {
              type: Type.STRING,
              enum: ["Baixo", "Médio", "Alto"],
              description: "O nível geral de risco jurídico desta transação."
            },
            summary: {
              type: Type.STRING,
              description: "Um resumo executivo da situação da auditoria focado em pontos críticos."
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Lista de ações práticas recomendadas para mitigar os riscos identificados."
            }
          },
          required: ["riskLevel", "summary", "recommendations"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as AnalysisResult;
    }
    
    throw new Error("Empty response from AI");

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return {
      riskLevel: "Médio",
      summary: "Não foi possível realizar a análise automática no momento. Verifique se a chave de API está configurada corretamente ou tente novamente.",
      recommendations: ["Realizar análise manual", "Verificar conexão com a API"]
    };
  }
};
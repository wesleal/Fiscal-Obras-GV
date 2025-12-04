
import { GoogleGenAI } from "@google/genai";

const geminiService = {
  summarizeText: async (text: string): Promise<string> => {
    if (!process.env.API_KEY) {
      return "Chave de API não configurada. A sumarização está desabilitada.";
    }
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Resuma o seguinte relatório de fiscalização em um parágrafo conciso, destacando a constatação principal e a ação tomada. Relatório: "${text}"`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });
      
      return response.text?.trim() || "Não foi possível gerar um resumo.";
    } catch (error) {
      console.error("Error calling Gemini API:", error);
      return "Erro ao se comunicar com o serviço de IA. Tente novamente mais tarde.";
    }
  },
};

export { geminiService };

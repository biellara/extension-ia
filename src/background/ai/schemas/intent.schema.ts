// Define o schema JSON para a detecção de intenção
export const intentSchema = {
  type: "OBJECT",
  properties: {
    is_technical_visit: {
      type: "BOOLEAN",
      description: "Responda 'true' se o objetivo principal da conversa for agendar ou tratar de uma visita técnica para um problema físico (ex: sem conexão, equipamento quebrado). Caso contrário, responda 'false'."
    },
    reason: {
        type: "STRING",
        description: "Justificativa curta para a decisão."
    }
  },
  required: ["is_technical_visit", "reason"]
};

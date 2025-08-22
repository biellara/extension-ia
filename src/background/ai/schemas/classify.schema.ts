// Define o schema JSON para a resposta de classificação
export const classificationSchema = {
  type: "OBJECT",
  properties: {
    reason: {
      type: "STRING",
      description: "O principal motivo do contato (ex: 'Dúvida sobre fatura', 'Problema técnico', 'Cancelamento')."
    },
    urgency: {
      type: "STRING",
      enum: ["Baixa", "Média", "Alta"],
      description: "O nível de urgência do atendimento."
    },
    sentiment: {
      type: "STRING",
      enum: ["Positivo", "Neutro", "Negativo"],
      description: "O sentimento geral do cliente."
    }
  },
  required: ["reason", "urgency", "sentiment"]
};

// Define o schema JSON para a resposta do resumo
export const summarySchema = {
  type: "OBJECT",
  properties: {
    topics: {
      type: "ARRAY",
      description: "Uma lista de 5 a 7 tópicos principais discutidos na conversa.",
      items: { type: "STRING" }
    },
    next_steps: {
      type: "ARRAY",
      description: "Uma lista de ações ou próximos passos objetivos a serem tomados.",
      items: { type: "STRING" }
    },
    customer_requests: {
      type: "ARRAY",
      description: "Pedidos específicos feitos pelo cliente, se houver.",
      items: { type: "STRING" }
    }
  },
  required: ["topics", "next_steps"]
};

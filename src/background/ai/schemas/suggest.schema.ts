// Define o schema JSON para a resposta de sugestão
export const suggestionSchema = {
  type: "OBJECT",
  properties: {
    suggestions: {
      type: "ARRAY",
      description: "Uma lista de 1 a 3 sugestões de resposta para o atendente.",
      items: {
        type: "OBJECT",
        properties: {
          tone: {
            type: "STRING",
            description: "O tom da resposta (ex: 'Amigável', 'Formal', 'Neutro')."
          },
          text: {
            type: "STRING",
            description: "O texto da resposta sugerida."
          }
        },
        required: ["tone", "text"]
      }
    }
  },
  required: ["suggestions"]
};

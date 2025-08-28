// Define o schema JSON para a checklist de finalização
export const finalizationSchema = {
  type: "OBJECT",
  properties: {
    nome_cliente: {
      type: "STRING",
      description: "O nome completo do cliente, conforme identificado na conversa. Se não for mencionado, responda 'Não informado'."
    },
    telefone_contato: {
        type: "STRING",
        description: "O número de telefone de contato do cliente. Se não for mencionado, responda 'Não informado'."
    },
    endereco_cliente: {
        type: "STRING",
        description: "O endereço do cliente, se mencionado. Se não for mencionado, responda 'Não informado'."
    },
    problema_relatado: {
      type: "STRING",
      description: "Descreva de forma objetiva o problema relatado pelo cliente ou o procedimento que ele solicitou."
    },
    resolucao_proximo_passo: {
      type: "STRING",
      description: "Qual foi a resolução final do problema ou qual o próximo passo definido pelo atendente? (Ex: 'Visita técnica agendada', 'Cliente orientado a reiniciar o equipamento', 'Caso resolvido')."
    }
  },
  required: ["nome_cliente", "telefone_contato", "endereco_cliente", "problema_relatado", "resolucao_proximo_passo"]
};
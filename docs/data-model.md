Índice de Conversas (conversationsIndex)
O índice de conversas armazena metadados essenciais para cada atendimento. Cada entrada inclui os seguintes campos:

conversationId: Um identificador único gerado a partir da conversationKey.
platform: O canal do atendimento, como whatsapp ou telegram, caso seja exibido pelo ERP.
contactName: O nome do contato (campo opcional).
lastSeenAt: Data e hora da última visualização da conversa (em formato ISO).
latestTimestamp: Data e hora da última mensagem da conversa (em formato ISO).
messageCount: O número total de mensagens na conversa.
chunks: O número de blocos de mensagens.
retentionUntil: Data e hora até quando a conversa deve ser retida.

Mensagens por Conversa em Blocos
As mensagens são organizadas em blocos para otimizar o processamento e a limpeza de dados.

Chaves: Cada bloco é identificado por uma chave no formato conv:{conversationId}:chunk:0001, 0002, etc.
Capacidade: Cada bloco tem uma capacidade de até 200 mensagens, o que facilita a rotatividade e a limpeza dos dados.

Esquema da Mensagem
Cada mensagem armazenada possui a seguinte estrutura:

digest: Um hash estável da mensagem para garantir sua unicidade.
timestamp: O carimbo de data e hora em formato ISO.
authorType: O tipo do autor da mensagem, que pode ser agent, customer ou system.
authorLabel: O rótulo do autor (campo opcional).
textRaw: O texto original da mensagem.
textNormalized: O texto da mensagem normalizado para análise.
attachments: Um array com metadados mínimos de anexos, se houver.
scrapedAt: O carimbo de data e hora de quando a mensagem foi capturada.

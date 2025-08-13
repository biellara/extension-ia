Este documento descreve o escopo mínimo para a primeira entrega da extensão, focando nas funcionalidades essenciais para validar a ideia.

O que está incluído no MVP
Coleta de Dados: Coleta de snapshot inicial visível e mensagens incrementais em tempo real.

Armazenamento: Persistência de dados com retenção de 7 dias ou até 2000 mensagens por conversa (o que ocorrer primeiro).
Dedupicação: Mecanismo para evitar o armazenamento de mensagens duplicadas.
Popup da Extensão: Interface para pausar/retomar o monitoramento e limpar os dados da conversa atual.
Página de Opções: Uma tela de configurações com switches para controlar funcionalidades básicas.

O que NÃO está incluído no MVP
Análise de IA: Nenhum processamento ou análise de texto por inteligência artificial.

Exportação de Dados: Funcionalidade para exportar conversas (ex.: JSON, CSV).
Integrações Externas: Conexão com qualquer outra plataforma ou serviço além da coleta de dados local.

Critérios de Sucesso
O MVP será considerado um sucesso se atingir os seguintes objetivos:

Coleta de Dados: A extensão deve coletar ≥95% das mensagens sem gerar duplicatas.
Performance: A extensão deve rodar sem causar lentidão perceptível ou consumo excessivo de recursos do navegador.
Logs: Os logs do console devem estar limpos, sem erros ou warnings que possam comprometer a estabilidade.
Estabilidade: O processo de coleta não deve falhar ou travar após 1 hora de observação contínua.

Contrato de Mensagens

Este documento detalha os eventos e payloads para a comunicação entre os scripts da extensão.

CS → BG (Content Script para Background)

CS_CONVERSATION_CHANGE: Notifica sobre a mudança de cabeçalho da conversa; contém tabId, conversationKey e header.
CS_SNAPSHOT_RESULT: Envia o estado completo de uma conversa; contém tabId, conversationKey e o array de messages.
CS_NEW_MESSAGES: Envia um lote ascendente de novas mensagens desde o último evento; usa debounce de ~350ms e contém tabId, conversationKey, since e o array de messages.
CS_ERROR: Comunica um erro ocorrido no script de conteúdo; contém tabId, o step do processo, a reason do erro, um campo fatal: boolean e hint?: string (ex: "seletor de timestamp ausente").

BG → CS (Background para Content Script)

BG_START_OBSERVE: Inicia o monitoramento de uma conversa específica; contém a conversationKey.
BG_REQUEST_SNAPSHOT: Solicita um snapshot completo da conversa; contém a conversationKey e um limit opcional.
BG_STOP_OBSERVE: Interrompe o monitoramento de uma conversa; contém a conversationKey.
BG_HEARTBEAT: Um evento leve de ping para depuração.

POPUP → BG / BG → POPUP

POPUP_TOGGLE_PAUSE: Altera o estado de pausa da extensão; contém tabId e conversationKey.
POPUP_CLEAR_CONVERSATION: Limpa os dados de uma conversa específica; contém tabId e conversationKey.
POPUP_GET_STATUS: O popup solicita o status atual da extensão.
BG_STATUS: Retorna o status atual da extensão para o popup; contém os campos { tabId, conversationKey, state, paused, messageCount, latestTimestamp, retention }.
BG_ACTION_OK: Indica que uma ação do Background foi bem-sucedida.
BG_ACTION_ERR: Sinaliza que uma ação do Background falhou.

Parâmetros Sugeridos

Debounce (CS → BG): ~350 ms (range 250–500 ms)
Timeout de resposta do CS: ~4 s
Lote incremental: até 100 mensagens
Snapshot inicial: até 200 mensagens (em “pedaços” se exceder)

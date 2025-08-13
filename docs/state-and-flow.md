Estados da Aba

idle: Estado inicial. A extensão está ativa, mas não está monitorando nenhuma conversa.
observing: A extensão está ativamente lendo e processando as mensagens da conversa.
paused: O monitoramento da conversa está temporariamente suspenso, geralmente por uma ação do usuário.

Transições e Gatilhos
As transições entre os estados ocorrem com base nos seguintes gatilhos:

idle → observing:
Gatilho: A extensão reconhece uma conversa ativa na aba. Isso pode ser acionado por eventos como uma troca de cabeçalho da conversa ou mutações no contêiner de mensagens.

observing → paused:
Gatilho: O usuário pausa a extensão através do popup.

paused → observing:
Gatilho: O usuário retoma a extensão através do popup.

observing → idle:
Gatilho: O ERP sai da visualização da conversa, ou a aba é fechada.

paused → idle:
Gatilho: O ERP sai da visualização da conversa, ou a aba é fechada.

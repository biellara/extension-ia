// Aqui ficará o catálogo de seletores semânticos (estáveis) para:
// contêiner de lista (ul...), item de mensagem (li...), nome/telefone/protocolo no cabeçalho, timestamp e texto da mensagem

export const selectors = {
  headerContainer: 'div[aria-label="Atendimento ERP"] div.MuiTab-root.Mui-selected',
  protocolCandidates: 'span[class*="MuiTypography-root"]',
  nameCandidates: 'p.MuiTypography-body1',

  // Seletores para a lista de mensagens
  messageList: 'ul.MuiList-root',
  messageListItem: 'li.MuiListItem-root',
  
  // Seletores mais robustos para o conteúdo da mensagem
  messageAuthor: 'p[class*="MuiTypography-body1"]', // O nome do autor
  messageText: 'div[class*="jss399"]', // O contêiner do texto principal
  messageTimestamp: 'span[class*="jss370"]', // A hora da mensagem
  messageAvatar: 'div.MuiAvatar-root', // O avatar do remetente
  messageGridContainer: '.MuiGrid-container.MuiGrid-spacing-xs-1', // O contêiner que alinha avatar e texto
};

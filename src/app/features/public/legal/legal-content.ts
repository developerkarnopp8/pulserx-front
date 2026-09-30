/**
 * Textos legais padrão da plataforma (decisão do dono, 2026-09-28): em nome da AEVON SOFTWARE, iguais
 * pra todo coach. Descrevem SÓ o que o sistema faz de fato (terceiros, armazenamento, direitos) — ao
 * mudar o tratamento de dados, atualizar aqui, trocar LEGAL_LAST_UPDATED e o TERMS_VERSION do backend.
 * Recomendação: revisão por advogado antes da operação comercial.
 */
export const LEGAL_COMPANY = {
  name: 'AEVON SOFTWARE',
  cnpj: '67.882.334/0001-07',
  city: 'Vera Cruz/RS',
  email: 'aevonaevon52@gmail.com',
  forum: 'Santa Cruz do Sul/RS',
};

export const LEGAL_LAST_UPDATED = '30/09/2026';

export type LegalDocKey = 'termos' | 'privacidade' | 'cookies' | 'reembolso' | 'termo-coach';

export interface LegalSection {
  title: string;
  paragraphs: string[];
  items?: string[];
}

export interface LegalDoc {
  key: LegalDocKey;
  title: string;
  intro: string;
  sections: LegalSection[];
}

const C = LEGAL_COMPANY;

export const LEGAL_DOCS: Record<LegalDocKey, LegalDoc> = {
  termos: {
    key: 'termos',
    title: 'Termos de Uso',
    intro: `Estes Termos regem o uso da plataforma PulseRx, mantida pela ${C.name} (CNPJ ${C.cnpj}, com sede em ${C.city}). Ao criar uma conta ou assinar um plano, você declara que leu e concorda com estes Termos e com a Política de Privacidade.`,
    sections: [
      {
        title: '1. O que é o PulseRx',
        paragraphs: [
          'O PulseRx é uma plataforma que conecta treinadores (coaches) e alunos: o treinador publica planos de treino, vídeos e orientações, e o aluno acompanha os treinos, registra sua evolução e se comunica com o treinador pelo app.',
          'O conteúdo de treino, as prescrições e as orientações são de responsabilidade do treinador que você escolheu. A AEVON SOFTWARE fornece a tecnologia e processa as assinaturas, mas não presta o serviço de treinamento.',
        ],
      },
      {
        title: '2. Sua conta',
        paragraphs: [
          'Você deve informar dados verdadeiros e manter sua senha em sigilo. A conta é pessoal e intransferível. A plataforma é destinada a maiores de 18 anos.',
          'Cada conta de aluno fica vinculada a um treinador. Não é possível assinar planos de dois treinadores com a mesma conta.',
        ],
      },
      {
        title: '3. Saúde e segurança',
        paragraphs: [
          'Atividade física envolve riscos. Antes de iniciar qualquer programa de treino, consulte um médico. Respeite seus limites e interrompa o exercício em caso de dor ou mal-estar.',
          'Se você autorizar o compartilhamento de dados de saúde (pode autorizar ou retirar a qualquer momento no Perfil), pode informar ao seu treinador pelo app lesões ou dores ao pular um treino. Sem essa autorização, o app não pede nem registra esse tipo de informação — trate o assunto com o seu treinador por outro meio.',
        ],
      },
      {
        title: '4. Assinatura e pagamento',
        paragraphs: [
          'Os planos pagos são assinaturas mensais com renovação automática. A cobrança é feita pelo Asaas (instituição de pagamento), e você escolhe na página de pagamento como pagar: PIX, boleto ou cartão de crédito. Os dados do cartão são informados diretamente ao Asaas e não passam pela nossa plataforma. Se você pagar com cartão de crédito, o Asaas guarda o cartão e as mensalidades seguintes são cobradas nele automaticamente, até você cancelar a assinatura; no app aparecem só a bandeira e o final do cartão.',
          'O valor pago é dividido automaticamente entre o treinador e a plataforma. O preço de cada plano é definido pelo treinador e aparece antes da contratação.',
          'Com pagamento em atraso ou assinatura cancelada, o acesso ao conteúdo pago pode ser suspenso.',
        ],
      },
      {
        title: '5. Cancelamento e arrependimento',
        paragraphs: [
          'Você pode cancelar a assinatura a qualquer momento pelo app, em "Minha Assinatura". O cancelamento interrompe as cobranças futuras.',
          'Você tem direito de arrependimento em até 7 dias da contratação (Código de Defesa do Consumidor, art. 49). Detalhes na Política de Reembolso.',
        ],
      },
      {
        title: '6. Uso permitido',
        paragraphs: ['Não é permitido:'],
        items: [
          'compartilhar sua conta ou revender o conteúdo dos treinos;',
          'copiar, gravar ou distribuir os vídeos e materiais dos treinadores sem autorização;',
          'tentar acessar dados de outros usuários ou interferir no funcionamento da plataforma.',
        ],
      },
      {
        title: '7. Alterações',
        paragraphs: [
          'Podemos atualizar estes Termos. A versão válida é sempre a publicada nesta página, com a data da última atualização. Mudanças relevantes serão avisadas pelo app ou por e-mail.',
        ],
      },
      {
        title: '8. Contato, lei aplicável e foro',
        paragraphs: [
          `Dúvidas: ${C.email}. Estes Termos seguem a legislação brasileira. Fica eleito o foro da comarca de ${C.forum}, ressalvado o direito do consumidor de ajuizar ação no foro do seu domicílio.`,
        ],
      },
    ],
  },

  privacidade: {
    key: 'privacidade',
    title: 'Política de Privacidade',
    intro: `Esta Política explica como a ${C.name} (CNPJ ${C.cnpj}, com sede em ${C.city}) trata os dados pessoais na plataforma PulseRx, nos termos da Lei nº 13.709/2018 (LGPD).`,
    sections: [
      {
        title: '1. Quem é responsável',
        paragraphs: [
          'A AEVON SOFTWARE é a controladora dos dados da plataforma (conta, assinatura e pagamento). O seu treinador também acessa os dados de treino que você registra, para acompanhar sua evolução e ajustar sua prescrição, e é responsável pelo uso que faz deles.',
        ],
      },
      {
        title: '2. Dados que tratamos',
        paragraphs: [],
        items: [
          'Conta: nome, e-mail e senha (guardada de forma irreversível, com hash), além da data e da versão em que você aceitou estes termos, da data em que você confirmou o e-mail e da data do seu último login.',
          'Treino e evolução: treinos concluídos, pulos de treino e o motivo informado, recordes pessoais (PRs), hidratação e calorias que você registrar, e as mensagens trocadas com o treinador.',
          'Dados de saúde — somente se você autorizar: o motivo "Lesão / dor" e as observações que você escrever ao pular um treino (que também chegam ao seu treinador como mensagem e notificação). O que você escrever sobre saúde nas mensagens também é dado de saúde; sem a autorização, o app avisa para não enviar esse tipo de informação por ali.',
          'Assinatura e pagamento: plano, status, histórico de cobranças, CPF (exigido pelo meio de pagamento para emitir a cobrança) e o identificador do cliente no Asaas. Não guardamos dados de cartão.',
          'Contato pela página do treinador: nome, e-mail, telefone e mensagem que você enviar.',
          'Dados técnicos: endereço IP, usado em tempo real para limitar tentativas abusivas (não fica guardado em cadastro). Os links enviados por e-mail (confirmar o e-mail, criar ou trocar a senha) valem por pouco tempo, só podem ser usados uma vez e ficam guardados apenas de forma irreversível (hash).',
        ],
      },
      {
        title: '3. Para que usamos e com qual base legal',
        paragraphs: [],
        items: [
          'Prestar o serviço contratado: criar a conta, liberar o conteúdo do plano, registrar treinos e permitir a comunicação com o treinador (execução de contrato, LGPD art. 7º, V).',
          'Cobrar a assinatura e emitir a cobrança, inclusive com o CPF (execução de contrato e cumprimento de obrigação legal, art. 7º, II e V).',
          'Segurança e prevenção de fraude e abuso (legítimo interesse, art. 7º, IX).',
          'Dados de saúde: somente com o seu consentimento específico e destacado (art. 11, I), pedido separado dos Termos. É opcional — sem ele você usa o app normalmente. Você pode dar ou retirar o consentimento a qualquer momento no Perfil; ao retirar, o motivo "Lesão / dor" dos pulos já registrados é substituído por "removido a pedido do aluno" e as observações são apagadas (também nas mensagens e notificações automáticas que o pulo gerou) — o registro de que o treino foi pulado continua.',
          'Responder ao contato enviado pela página do treinador (procedimentos preliminares a pedido do titular, art. 7º, V).',
        ],
      },
      {
        title: '4. Com quem compartilhamos',
        paragraphs: ['Somente com o seu treinador e com fornecedores necessários para a plataforma funcionar:'],
        items: [
          'Asaas: processamento das cobranças (nome, e-mail, CPF e valores).',
          'Hostinger: hospedagem dos servidores e do banco de dados.',
          'Cloudinary: armazenamento das imagens enviadas pelos treinadores.',
          'Resend: envio de e-mails da plataforma.',
          'Anthropic: quando o treinador importa um plano de treino em PDF, o arquivo é lido por inteligência artificial para montar o plano (pode conter o seu nome).',
          'YouTube: os vídeos de exercício só carregam quando você clica para assistir, no modo sem cookies de rastreamento (youtube-nocookie.com).',
          'Google Fonts: as fontes da interface são carregadas dos servidores do Google, que recebem o seu endereço IP.',
        ],
      },
      {
        title: '5. Transferência internacional',
        paragraphs: [
          'Alguns desses fornecedores (Cloudinary, Resend, Anthropic, YouTube e Google) processam dados fora do Brasil, principalmente nos Estados Unidos, com as garantias previstas no art. 33 da LGPD.',
        ],
      },
      {
        title: '6. Por quanto tempo guardamos',
        paragraphs: [
          'Enquanto sua conta estiver ativa. Depois de um pedido de exclusão, apagamos ou anonimizamos os dados, exceto os que precisamos manter para cumprir obrigações legais (por exemplo, registros de pagamento), pelo prazo exigido em lei.',
          'Inscrição feita pela página do treinador e não confirmada pelo link enviado por e-mail em 7 dias é apagada automaticamente, junto com o aviso de inscrição enviado ao treinador.',
        ],
      },
      {
        title: '7. Seus direitos',
        paragraphs: [
          `Você pode pedir a qualquer momento: confirmação e acesso aos seus dados, correção, anonimização, bloqueio ou eliminação, portabilidade, informação sobre compartilhamentos e revogação de consentimento (LGPD art. 18). Envie o pedido para ${C.email}. Respondemos em até 15 dias. Para excluir sua conta você também pode usar o próprio app, em Perfil → Excluir minha conta. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).`,
        ],
      },
      {
        title: '8. Segurança',
        paragraphs: [
          'Usamos conexão criptografada (HTTPS), senhas com hash, controle de acesso por perfil e limites contra tentativas abusivas. Nenhum sistema é 100% invulnerável; em caso de incidente relevante, os titulares afetados e a ANPD serão comunicados.',
        ],
      },
      {
        title: '9. Encarregado e contato',
        paragraphs: [`Encarregado pelo tratamento de dados (DPO): ${C.email}.`],
      },
    ],
  },

  cookies: {
    key: 'cookies',
    title: 'Política de Cookies',
    intro: 'Explicamos aqui o que o PulseRx guarda no seu navegador e por quê.',
    sections: [
      {
        title: '1. O que guardamos',
        paragraphs: ['Usamos apenas armazenamento essencial do navegador (localStorage e sessionStorage), necessário para a plataforma funcionar:'],
        items: [
          'Sessão: mantém você conectado depois do login.',
          'Rascunho do treino: guarda o progresso do treino em andamento, para não perder o que você registrou se a página recarregar.',
          'Preferências de aviso: lembra se você dispensou avisos da interface (como o de notificações e o de cookies).',
        ],
      },
      {
        title: '2. O que não usamos',
        paragraphs: ['O PulseRx não usa cookies de publicidade, de rastreamento nem de análise de audiência.'],
      },
      {
        title: '3. Terceiros',
        paragraphs: [
          'Os vídeos de exercício usam o modo sem cookies do YouTube (youtube-nocookie.com) e só carregam quando você clica para assistir. Na página de pagamento do Asaas valem as políticas do próprio Asaas.',
        ],
      },
      {
        title: '4. Como remover',
        paragraphs: [
          'Você pode apagar os dados salvos nas configurações do navegador a qualquer momento. Sem o armazenamento de sessão, será preciso entrar na conta de novo.',
        ],
      },
    ],
  },

  reembolso: {
    key: 'reembolso',
    title: 'Política de Reembolso e Cancelamento',
    intro: 'Como funcionam o cancelamento e o reembolso das assinaturas feitas pelo PulseRx.',
    sections: [
      {
        title: '1. Direito de arrependimento (7 dias)',
        paragraphs: [
          `Como a contratação é feita pela internet, você pode desistir em até 7 dias corridos da contratação, com devolução integral do valor pago (Código de Defesa do Consumidor, art. 49). Cancele a assinatura pelo app e envie o pedido de reembolso para ${C.email}, informando o e-mail da sua conta.`,
          'O reembolso é feito pelo mesmo meio de pagamento usado, conforme os prazos do meio de pagamento (no cartão de crédito, o estorno pode aparecer em até duas faturas).',
        ],
      },
      {
        title: '2. Cancelamento depois de 7 dias',
        paragraphs: [
          'Você pode cancelar a qualquer momento pelo app, em "Minha Assinatura". O cancelamento interrompe as cobranças futuras. Garantias ou condições além das previstas em lei, quando existirem, são oferecidas pelo seu treinador e aparecem na página dele.',
        ],
      },
      {
        title: '3. Cobrança indevida',
        paragraphs: [
          `Se identificar uma cobrança que não reconhece, escreva para ${C.email}. Cobranças indevidas são devolvidas em dobro, com correção, conforme o art. 42 do Código de Defesa do Consumidor, salvo engano justificável.`,
        ],
      },
      {
        title: '4. Formas de pagamento',
        paragraphs: ['As cobranças são feitas pelo Asaas. Na página de pagamento você escolhe PIX, boleto ou cartão de crédito.'],
      },
    ],
  },
  // Termo do Coach (LGPD, decisão do dono 2026-09-30): aceito no próximo acesso ao painel; versão no backend
  // (COACH_TERMS_VERSION). RASCUNHO para revisão de advogado — não afirma o papel de cada parte na LGPD
  // (controlador/operador), que é decisão jurídica. Mudou o texto: trocar também a versão no backend.
  'termo-coach': {
    key: 'termo-coach',
    title: 'Termo do Coach',
    intro: `Este Termo vale para quem usa o painel de coach da plataforma PulseRx, mantida pela ${C.name} (CNPJ ${C.cnpj}). No painel você acessa dados pessoais dos seus alunos. Ao aceitar, você se compromete a usá-los só como descrito aqui.`,
    sections: [
      {
        title: '1. Quais dados você acessa',
        paragraphs: ['Pelo painel você vê dados dos alunos vinculados a você:'],
        items: [
          'nome, e-mail e objetivo;',
          'planos, treinos realizados, tempo de treino, recordes pessoais, hidratação e calorias registradas;',
          'mensagens trocadas com você;',
          'dados de assinatura e pagamento (plano, situação e valores — nunca o número do cartão);',
          'dados de saúde, só dos alunos que autorizaram: motivo "lesão/dor" e observações ao pular um treino.',
        ],
      },
      {
        title: '2. Para que você pode usar',
        paragraphs: [
          'Somente para planejar, acompanhar e ajustar o treino dos seus alunos e para falar com eles sobre o serviço que eles contrataram com você.',
          'É proibido usar esses dados para outra finalidade: vender, ceder ou repassar a terceiros, montar listas de contato para outros negócios, divulgar resultados de alunos identificados sem autorização deles, ou treinar sistemas de terceiros com eles.',
        ],
      },
      {
        title: '3. Sigilo',
        paragraphs: [
          'Você mantém em sigilo tudo o que vê dos seus alunos. Prints, exportações (planilha, PDF) e anotações fora da plataforma só podem ser feitos para a finalidade do item 2, e devem ser guardados com o mesmo cuidado.',
        ],
      },
      {
        title: '4. Dados de saúde',
        paragraphs: [
          'Lesão, dor e observações de saúde são dados sensíveis (LGPD, art. 11). Eles só aparecem para você com o consentimento do aluno, e só podem ser usados para ajustar o treino dele — nunca divulgados.',
          'Se o aluno retirar o consentimento, esses registros são apagados da plataforma; não guarde cópias deles.',
        ],
      },
      {
        title: '5. Segurança da sua conta',
        paragraphs: [
          'Sua senha é pessoal e intransferível: não compartilhe o acesso ao painel com ninguém. Saia da conta em computadores e celulares de uso compartilhado.',
        ],
      },
      {
        title: '6. Incidentes',
        paragraphs: [
          `Se você suspeitar de acesso indevido à sua conta, de vazamento ou de uso indevido de dados dos seus alunos, avise a ${C.name} imediatamente pelo e-mail ${C.email}, com o que souber do ocorrido.`,
        ],
      },
      {
        title: '7. Direitos dos alunos',
        paragraphs: [
          `Cada aluno pode pedir acesso, correção ou exclusão dos próprios dados a qualquer momento — a exclusão pode ser feita no próprio app. Se um pedido desses chegar a você, encaminhe para ${C.email} e não dificulte o atendimento.`,
        ],
      },
      {
        title: '8. Fim do vínculo',
        paragraphs: [
          'Ao desvincular um aluno ou encerrar a sua conta, você não deve manter fora da plataforma cópias dos dados dele, exceto o que a lei obrigue a guardar (por exemplo, registros fiscais seus).',
        ],
      },
      {
        title: '9. Descumprimento',
        paragraphs: [
          `O uso dos dados em desacordo com este Termo pode levar à suspensão do acesso ao painel, e você responde pelos danos que esse uso causar aos alunos ou à ${C.name}.`,
        ],
      },
      {
        title: '10. Atualizações',
        paragraphs: [
          'Quando este Termo mudar, você será avisado no próximo acesso e precisará aceitar a nova versão para continuar usando o painel.',
        ],
      },
    ],
  },
};

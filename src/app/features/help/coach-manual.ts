/**
 * Manual do coach — fonte ÚNICA do texto da página "Ajuda" (/coach/ajuda), da versão pública para imprimir
 * (/manual-coach) e do PDF (gerado a partir dela, em public/manual-coach-pulserx.pdf).
 * Só descreve o que o app faz de verdade: mudou uma tela, atualizar aqui e gerar o PDF de novo.
 */
export interface ManualStep {
  title: string;
  text: string;
  /** Onde fica no app (ex.: "Menu → Assinaturas"). */
  where?: string;
}

export interface ManualSection {
  id: string;
  icon: string;
  title: string;
  intro: string;
  steps: ManualStep[];
  /** Dica em destaque no fim da seção. */
  tip?: string;
}

export const COACH_MANUAL_UPDATED = '06/10/2026';

export const COACH_MANUAL: ManualSection[] = [
  {
    id: 'antes',
    icon: 'checklist',
    title: 'Antes de começar',
    intro: 'Tenha isto em mãos para configurar tudo de uma vez:',
    steps: [
      { title: 'O e-mail da sua conta', text: 'É para ele que chega o convite do PulseRx. Se não achar, procure no spam ou em "Promoções".' },
      { title: 'Uma conta no Asaas', text: 'É onde você recebe as mensalidades dos alunos. Se ainda não tem, crie a sua grátis em asaas.com (pessoa física ou empresa).' },
      { title: 'Os preços dos seus planos', text: 'Quanto você cobra por mês em cada plano (Combo, Core, LPO).' },
      { title: 'Fotos e textos da sua página', text: 'Uma foto sua, um banner, uma frase de destaque e um pouco da sua história. Dá para ajustar depois.' },
    ],
  },
  {
    id: 'acesso',
    icon: 'login',
    title: '1. Primeiro acesso',
    intro: 'A equipe do PulseRx cria a sua conta de treinador e você recebe um e-mail de boas-vindas.',
    steps: [
      { title: 'Abra o e-mail "Crie sua senha — PulseRx"', text: 'Toque em "Criar minha senha". O link vale 7 dias e só pode ser usado uma vez.' },
      { title: 'Crie a sua senha', text: 'Pelo menos 8 caracteres. Use uma senha que você não usa em outros sites.' },
      { title: 'Entre no app', text: 'Acesse pulserx.com.br/login com o seu e-mail e a senha nova. Funciona no computador e no celular, pelo navegador.' },
      { title: 'Aceite o Termo do Coach', text: 'No primeiro acesso aparece o Termo do Coach, que explica como os dados dos seus alunos devem ser usados. Leia, marque "Li e aceito" e o painel abre.' },
    ],
    tip: 'O link venceu? Na tela de entrada, toque em "Esqueci minha senha" e receba outro.',
  },
  {
    id: 'recebimento',
    icon: 'account_balance_wallet',
    title: '2. Configure o recebimento',
    intro: 'Sem isto, nenhum aluno consegue assinar um plano pago. Você faz uma vez só.',
    steps: [
      { title: 'Como o dinheiro chega até você', text: 'O aluno paga a mensalidade pelo PulseRx (PIX, boleto ou cartão). O Asaas divide o pagamento na hora: a sua parte vai direto para a sua conta Asaas e a parte da plataforma fica com a AEVON. Você saca pela sua conta Asaas, nas regras e prazos do Asaas.' },
      { title: 'Encontre o seu Wallet ID', text: 'No painel do Asaas, procure o "Wallet ID" (identificador da carteira) da sua conta. Ele tem o formato xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx. Não achou? Peça ao suporte do Asaas: "Qual é o Wallet ID da minha conta?".' },
      { title: 'Cole no PulseRx', where: 'Menu → Assinaturas → Carteira Asaas', text: 'Cole o código e toque em "Salvar carteira". O app confere o formato na hora; o Asaas confirma a carteira no primeiro pagamento de um aluno.' },
    ],
    tip: 'O Wallet ID só serve para receber: com ele ninguém tira dinheiro da sua conta. Nunca passe a senha nem a chave de API do seu Asaas para ninguém.',
  },
  {
    id: 'planos-assinatura',
    icon: 'workspace_premium',
    title: '3. Defina os seus planos',
    intro: 'Os planos são o que o aluno assina e paga todo mês.',
    steps: [
      { title: 'Planos sugeridos', where: 'Menu → Assinaturas', text: 'A sua conta já vem com Combo (Core + LPO + Performance), Core, LPO e Free. Os pagos começam inativos e sem preço — quem decide o valor é você.' },
      { title: 'Defina o preço e ative', text: 'Toque em "Editar" no plano, coloque o preço mensal e ligue "Ativo". Só planos ativos aparecem na sua página.' },
      { title: 'O plano Free', text: 'Já vem ativo e dá ao aluno uma amostra do Core para conhecer o seu trabalho. Se não quiser oferecer, desative.' },
      { title: 'Crie outros planos, se quiser', text: 'Em "Novo plano" você escolhe nome, descrição, preço e quais categorias de treino (Core, LPO, Performance) o plano libera.' },
    ],
  },
  {
    id: 'treinos',
    icon: 'fitness_center',
    title: '4. Monte os treinos',
    intro: 'Existem dois tipos de plano de treino:',
    steps: [
      { title: 'Plano compartilhado (Core ou LPO)', where: 'Menu → Planos → Criar plano compartilhado', text: 'Uma grade só para todos os alunos que têm Core ou LPO na assinatura. Escolha a categoria, o título e a data de início (vale para todos). Depois monte as semanas e as sessões.' },
      { title: 'Plano individual (Performance)', where: 'Menu → Planos → Planos individuais', text: 'Um plano por atleta, montado no construtor: semanas, sessões e exercícios, com carga, repetições e observações.' },
      { title: 'Atalho: importar um PDF', where: 'Botão "Novo treino" no menu', text: 'Escolha o atleta, dê um título e envie o PDF do treino. A IA monta um rascunho em até 1 minuto — você revisa e publica depois.' },
    ],
    tip: 'A Biblioteca reúne os exercícios dos seus planos (com capa e vídeo, quando houver) para você reaproveitar.',
  },
  {
    id: 'pagina',
    icon: 'storefront',
    title: '5. Monte e publique a sua página',
    intro: 'A sua página é o seu site de vendas: o aluno conhece você, escolhe o plano e assina por ela.',
    steps: [
      { title: 'Preencha as seções', where: 'Menu → Minha Página', text: 'São 9 seções numeradas: endereço público, primeira impressão (frase de destaque), sobre você, números que você declara, contato e vídeo (WhatsApp), garantia e suporte, textos da página, depoimentos e perguntas frequentes. Use só informações verdadeiras.' },
      { title: 'Fotos', text: 'Envie o banner (topo da página) e a sua foto (JPG, PNG ou WEBP, até 5 MB).' },
      { title: 'Publique', text: 'Toque em "Publicar". Antes de divulgar, use "Ver como visitante" para conferir como fica.' },
      { title: 'Divulgue o link', text: 'Use "Copiar link" e compartilhe no Instagram, WhatsApp e onde mais quiser. O endereço é pulserx.com.br/c/seu-nome.' },
    ],
    tip: 'Se aparecer o aviso "Seus planos pagos ainda não podem ser assinados", falta configurar a carteira Asaas (passo 2).',
  },
  {
    id: 'alunos',
    icon: 'group',
    title: '6. Traga os seus alunos',
    intro: 'Há dois jeitos de um aluno entrar:',
    steps: [
      { title: 'Pela sua página (recomendado)', text: 'O aluno abre o seu link, escolhe o plano, cria a conta e confirma o e-mail. No plano pago ele paga com PIX dentro do app (aprovação na hora) ou abre a fatura do Asaas para boleto ou cartão. Você recebe o aviso "Novo aluno pela sua página" quando ele se inscreve, e os treinos são liberados assim que o pagamento é confirmado.' },
      { title: 'Cadastrando você mesmo', where: 'Menu → Alunos → Novo atleta', text: 'Informe o nome e o e-mail. O aluno recebe um e-mail para criar a própria senha (você não define a senha de ninguém). Depois, em "Assinatura", você pode atribuir um plano a ele.' },
    ],
    tip: 'Aluno que paga pelo app tem a cobrança feita pelo Asaas todo mês. Para trocar o plano dele à mão, remova a assinatura antes — isso cancela a cobrança no Asaas.',
  },
  {
    id: 'dia-a-dia',
    icon: 'today',
    title: '7. No dia a dia',
    intro: 'O que cada parte do menu faz:',
    steps: [
      { title: 'Dashboard', text: 'Conclusão dos treinos, engajamento e assinaturas dos seus alunos, com os que estão precisando de atenção.' },
      { title: 'Mensagens', text: 'Conversa com cada aluno, em tempo real. Dá para filtrar as não lidas e buscar por nome.' },
      { title: 'Financeiro', text: 'Quanto entrou no mês: valor bruto, taxa do Asaas, parte da plataforma e o seu líquido, aluno por aluno.' },
      { title: 'Assinaturas', text: 'Seus planos, a carteira Asaas e quem está ativo, em atraso ou cancelado.' },
      { title: 'Alterar senha', text: 'No rodapé do menu, ao lado do "Sair", toque no cadeado.' },
    ],
  },
  {
    id: 'problemas',
    icon: 'help',
    title: 'Problemas comuns',
    intro: 'Antes de pedir ajuda, confira:',
    steps: [
      { title: 'O aluno não recebeu o e-mail', text: 'Peça para olhar no spam e em "Promoções". Em Alunos, você pode reenviar o link de senha para ele.' },
      { title: 'O aluno pagou e os treinos não liberaram', text: 'Pagamento com PIX costuma ser confirmado em segundos; boleto pode levar até 3 dias úteis. Peça para o aluno fechar e abrir o app de novo.' },
      { title: 'Ninguém consegue assinar plano pago', text: 'Confira a carteira Asaas (passo 2) e se o plano está ativo e com preço (passo 3).' },
      { title: 'Mudei o endereço da minha página', text: 'Os links antigos que você já divulgou deixam de funcionar. Compartilhe o link novo.' },
    ],
  },
];

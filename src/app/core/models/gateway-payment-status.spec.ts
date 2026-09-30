import {
  GATEWAY_PAYMENT_STATUS_ICON, GATEWAY_PAYMENT_STATUS_LABEL, GatewayPaymentStatus, isOpenGatewayPayment, isReversedGatewayPayment,
} from './subscription.model';

describe('status de cobrança do Asaas', () => {
  it.each<[GatewayPaymentStatus, boolean, boolean, string, string]>([
    ['pending', true, false, 'Em aberto', 'schedule'],
    ['overdue', true, false, 'Vencida', 'error'],
    ['paid', false, false, 'Paga', 'task_alt'],
    ['refunded', false, true, 'Estornada', 'undo'],
    ['chargeback', false, true, 'Contestada', 'gavel'],
  ])('%s: a pagar=%s, não ficou com o coach=%s, "%s", ícone %s', (status, aberta, revertida, rotulo, icone) => {
    expect(isOpenGatewayPayment(status)).toBe(aberta);
    expect(isReversedGatewayPayment(status)).toBe(revertida);
    expect(GATEWAY_PAYMENT_STATUS_LABEL[status]).toBe(rotulo);
    expect(GATEWAY_PAYMENT_STATUS_ICON[status]).toBe(icone);
  });
});

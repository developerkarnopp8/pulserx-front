import { NotificationsBellComponent } from './notifications-bell.component';

describe('NotificationsBellComponent.iconFor', () => {
  const component = new NotificationsBellComponent({} as any, {} as any, {} as any);

  it.each([
    ['plan_published', 'calendar_month'],
    ['new_message', 'chat'],
    ['workout_skipped', 'skip_next'],
    ['new_pr', 'military_tech'],
    ['ai_credit_exhausted', 'credit_card_off'],
    ['new_lead', 'contact_mail'],
    ['subscription_canceled', 'cancel'],
    ['new_student', 'person_add'],
  ])('%s → %s', (type, icon) => {
    expect(component.iconFor(type as any)).toBe(icon);
  });

  it('tipo desconhecido usa o sino genérico', () => {
    expect(component.iconFor('outro' as any)).toBe('notifications');
  });
});

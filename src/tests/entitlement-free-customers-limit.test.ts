import { describe, it, expect, beforeEach } from 'vitest';
import { InMemoryCustomerRepository } from '../infrastructure/repositories/InMemoryCustomerRepository';
import { InMemorySubscriptionRepository } from '../infrastructure/repositories/InMemorySubscriptionRepository';
import { UsageService } from '../application/subscription/UsageService';
import { EntitlementService } from '../application/subscription/EntitlementService';
import { CreateCustomer } from '../application/customers/CreateCustomer';

describe('Entitlement - Free Customers Limit (50 Active)', () => {
  let customerRepo: InMemoryCustomerRepository;
  let subRepo: InMemorySubscriptionRepository;
  let usageService: UsageService;
  let entitlementService: EntitlementService;
  let createCustomer: CreateCustomer;

  beforeEach(() => {
    customerRepo = new InMemoryCustomerRepository();
    subRepo = new InMemorySubscriptionRepository();
    usageService = new UsageService(subRepo, { customerRepo });
    entitlementService = new EntitlementService(subRepo, usageService);
    createCustomer = new CreateCustomer(customerRepo, entitlementService);
  });

  it('allows creating up to 50 active customers on Free plan', async () => {
    for (let i = 1; i <= 50; i++) {
      const res = await createCustomer.execute('biz-cust-test', {
        name: `Cliente ${i}`,
        email: `cliente${i}@test.com`,
      });
      expect(res.customer.name).toBe(`Cliente ${i}`);
    }

    const count = await usageService.getActiveCustomersCount('biz-cust-test');
    expect(count).toBe(50);

    // 51st active customer must throw with limit reached
    await expect(
      createCustomer.execute('biz-cust-test', {
        name: 'Cliente 51',
        email: 'cliente51@test.com',
      })
    ).rejects.toThrow(/alcanzado el límite de 50/i);
  });

  it('deactivating a customer frees up slot to allow creating another customer', async () => {
    let firstCustomerId = '';
    for (let i = 1; i <= 50; i++) {
      const c = await customerRepo.create('biz-cust-test', {
        name: `Cliente ${i}`,
      });
      if (i === 1) firstCustomerId = c.id;
    }

    expect(await usageService.getActiveCustomersCount('biz-cust-test')).toBe(50);

    // Deactivate 1 customer
    await customerRepo.update('biz-cust-test', firstCustomerId, { active: false });
    expect(await usageService.getActiveCustomersCount('biz-cust-test')).toBe(49);

    // 51st can now be created
    const res = await createCustomer.execute('biz-cust-test', {
      name: 'Cliente 51',
    });
    expect(res.customer.name).toBe('Cliente 51');
    expect(await usageService.getActiveCustomersCount('biz-cust-test')).toBe(50);
  });

  it('Pro plan allows creating beyond 50 customers', async () => {
    await subRepo.setPlan('biz-cust-test', 'PRO');

    for (let i = 1; i <= 55; i++) {
      await customerRepo.create('biz-cust-test', {
        name: `Cliente Pro ${i}`,
      });
    }

    const res = await createCustomer.execute('biz-cust-test', {
      name: 'Cliente Pro 56',
    });
    expect(res.customer.name).toBe('Cliente Pro 56');
  });
});

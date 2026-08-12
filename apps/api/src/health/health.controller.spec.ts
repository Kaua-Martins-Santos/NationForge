import { Test } from '@nestjs/testing';
import { HealthController } from './health.controller';

describe('HealthController', () => {
  let controller: HealthController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController],
    }).compile();

    controller = moduleRef.get(HealthController);
  });

  it('retorna status "ok"', () => {
    expect(controller.check().status).toBe('ok');
  });

  it('retorna um timestamp ISO válido', () => {
    const { timestamp } = controller.check();

    expect(Number.isNaN(Date.parse(timestamp))).toBe(false);
  });
});

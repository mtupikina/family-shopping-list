import { Test, TestingModule } from '@nestjs/testing';
import { WelcomeController } from './welcome.controller';

describe('WelcomeController', () => {
  let controller: WelcomeController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WelcomeController],
    }).compile();

    controller = module.get<WelcomeController>(WelcomeController);
  });

  it('should return the welcome message', () => {
    const result = controller.getWelcomeMessage();
    expect(result).toEqual({
      message: 'BE is welcoming you to the family shopping list',
    });
  });
});

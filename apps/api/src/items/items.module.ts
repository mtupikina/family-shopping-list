import { Module } from '@nestjs/common';
import { ItemEventsService } from './item-events.service';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';

@Module({
  controllers: [ItemsController],
  providers: [ItemsService, ItemEventsService],
})
export class ItemsModule {}

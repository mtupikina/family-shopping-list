import { Injectable } from '@nestjs/common';
import { Subject, filter } from 'rxjs';
import { ShoppingItemResponse } from './items.types';

export type ItemEventType = 'created' | 'updated';

export interface ItemEvent {
  familyId: string;
  type: ItemEventType;
  item: ShoppingItemResponse;
}

@Injectable()
export class ItemEventsService {
  private readonly stream$ = new Subject<ItemEvent>();

  publish(event: ItemEvent): void {
    this.stream$.next(event);
  }

  forFamily(familyId: string) {
    return this.stream$.pipe(filter(event => event.familyId === familyId));
  }
}

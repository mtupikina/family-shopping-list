import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Sse,
} from '@nestjs/common';
import { MessageEvent } from '@nestjs/common';
import { Observable, map } from 'rxjs';
import { RequiresMember, CurrentUser } from '../auth/auth.decorators';
import { JwtMemberPayload } from '../auth/auth.types';
import { ArchiveItemsDto } from './dto/archive-items.dto';
import { CompleteItemDto } from './dto/complete-item.dto';
import { CreateItemDto } from './dto/create-item.dto';
import { RejectItemDto } from './dto/reject-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ListArchivedItemsQueryDto } from './dto/list-archived-items.dto';
import { ItemEventsService } from './item-events.service';
import { ItemsService } from './items.service';

@Controller('items')
@RequiresMember()
export class ItemsController {
  constructor(
    private readonly itemsService: ItemsService,
    private readonly itemEvents: ItemEventsService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: JwtMemberPayload,
    @Query('updatedSince') updatedSince?: string,
    @Query('includeArchived') includeArchived?: string,
  ) {
    return this.itemsService.list(user.familyId, {
      updatedSince: updatedSince ? new Date(updatedSince) : undefined,
      includeArchived: includeArchived === 'true',
    });
  }

  @Get('stores')
  listStores(@CurrentUser() user: JwtMemberPayload) {
    return this.itemsService.listStores(user.familyId);
  }

  @Get('suggestions')
  listSuggestions(@CurrentUser() user: JwtMemberPayload, @Query('q') query = '') {
    return this.itemsService.listSuggestions(user.familyId, query);
  }

  @Get('archived')
  listArchived(@CurrentUser() user: JwtMemberPayload, @Query() query: ListArchivedItemsQueryDto) {
    return this.itemsService.listArchived(user.familyId, query);
  }

  @Post()
  create(@CurrentUser() user: JwtMemberPayload, @Body() dto: CreateItemDto) {
    return this.itemsService.create(user.familyId, user.sub, dto);
  }

  @Post('archive')
  archiveMany(@CurrentUser() user: JwtMemberPayload, @Body() dto: ArchiveItemsDto) {
    return this.itemsService.archiveMany(user.familyId, dto.ids);
  }

  @Sse('stream')
  stream(@CurrentUser() user: JwtMemberPayload): Observable<MessageEvent> {
    return this.itemEvents.forFamily(user.familyId).pipe(
      map(event => ({
        id: event.item.updatedAt,
        type: event.type,
        data: event.item,
      })),
    );
  }

  @Patch(':id')
  update(
    @CurrentUser() user: JwtMemberPayload,
    @Param('id') id: string,
    @Body() dto: UpdateItemDto,
  ) {
    return this.itemsService.update(user.familyId, id, dto);
  }

  @Post(':id/reject')
  reject(
    @CurrentUser() user: JwtMemberPayload,
    @Param('id') id: string,
    @Body() dto: RejectItemDto,
  ) {
    return this.itemsService.reject(user.familyId, user.sub, id, dto);
  }

  @Post(':id/complete')
  complete(
    @CurrentUser() user: JwtMemberPayload,
    @Param('id') id: string,
    @Body() dto: CompleteItemDto,
  ) {
    return this.itemsService.complete(user.familyId, user.sub, id, dto);
  }

  @Post(':id/archive')
  archive(@CurrentUser() user: JwtMemberPayload, @Param('id') id: string) {
    return this.itemsService.archive(user.familyId, id);
  }

  @Post(':id/unarchive')
  unarchive(@CurrentUser() user: JwtMemberPayload, @Param('id') id: string) {
    return this.itemsService.unarchive(user.familyId, id);
  }
}

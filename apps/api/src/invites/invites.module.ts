import { Module } from '@nestjs/common';
import { FamilyInvitesController, InvitesPreviewController } from './invites.controller';
import { InvitesService } from './invites.service';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [EmailModule],
  controllers: [FamilyInvitesController, InvitesPreviewController],
  providers: [InvitesService],
  exports: [InvitesService],
})
export class InvitesModule {}

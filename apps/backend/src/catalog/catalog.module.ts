import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { TmdbProvider } from './providers/tmdb.provider';
import { TicketmasterProvider } from './providers/ticketmaster.provider';

@Module({
  imports: [HttpModule.register({ timeout: 10000, maxRedirects: 5 })],
  controllers: [CatalogController],
  providers: [CatalogService, TmdbProvider, TicketmasterProvider],
  exports: [CatalogService],
})
export class CatalogModule {}

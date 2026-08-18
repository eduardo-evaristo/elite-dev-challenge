import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { EventsModule } from './events/events.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: ['.env.production', '.env', '.env.development'],
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    CatalogModule,
    EventsModule,
  ],
})
export class AppModule {}

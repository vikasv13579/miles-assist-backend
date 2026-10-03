import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
// import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
// import { APP_GUARD } from '@nestjs/core';
import { AuthModule } from './auth/auth.module.js';
import { DashboardModule } from './dashboard/dashboard.module.js';
import { UsersModule } from './users/users.module.js';
import { TransactionsModule } from './transactions/transactions.module.js';
import { BookingsModule } from './bookings/bookings.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // ThrottlerModule.forRoot([{
    //   ttl: 60000,
    //   limit: 100,
    // }]),
    PrismaModule,
    AuthModule,
    DashboardModule,
    UsersModule,
    TransactionsModule,
    BookingsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // {
    //   provide: APP_GUARD,
    //   useClass: ThrottlerGuard,
    // },
  ],
})
export class AppModule {}

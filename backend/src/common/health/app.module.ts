import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from '../../app.controller';
import { AppService } from './app.service';
import { UsersModule } from '../../users/users.module';
import { AuthModule } from '../../auth/auth.module';
import { ExercisesModule } from '../../exercises/exercises.module';
import { WorkoutPlansModule } from '../../workout-plans/workout-plans.module';
import { DialogflowModule } from 'src/dialogflow/dialogflow.module';
import { ChatModule } from 'src/chat/chat.module';
import { ProgressModule } from 'src/progress/progress.module';

@Module({
  imports: [
    // load .env and make ConfigService global so other modules (AuthModule) can read JWT_SECRET
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    // connect to MongoDB using env var
    MongooseModule.forRoot(process.env.MONGODB_URI || '', {
      // avoid warnings if URI is empty during static analysis
      serverSelectionTimeoutMS: 5000,
    }),
    UsersModule,
    AuthModule,
    ExercisesModule,
    WorkoutPlansModule, // 🎯 2. UPEWNIJ SIĘ, ŻE TEN MODUŁ JEST TUTAJ
    DialogflowModule,
    ChatModule,
    ProgressModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

// src/main.ts (Wersja do zasilania bazy)
import { NestFactory } from '@nestjs/core';
import { AppModule } from './common/health/app.module';
import { ValidationPipe } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { SeederService } from './exercises/seeder.service';
import { AdminSeederService } from './users/admin-seeder.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(json({ limit: '6mb' }));
  app.use(urlencoded({ extended: true, limit: '6mb' }));
  // ... (reszta konfiguracji: prefix, pipes, cors)
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors();

  // --- 🎯 Automatyczne zasilenie bazą ćwiczeń, tylko gdy kolekcja jest pusta ---
  try {
    const seeder = app.get(SeederService);
    await seeder.seedExercises(false); // false = nie wymuszaj, załaduj tylko jeśli pusta
  } catch (seedErr) {
    console.error('Seed exercises failed:', seedErr);
  }

  // --- 🔐 Automatyczne utworzenie konta administratora ---
  try {
    const adminSeeder = app.get(AdminSeederService);
    await adminSeeder.seedAdmin();
  } catch (adminSeedErr) {
    console.error('Admin seed failed:', adminSeedErr);
  }

//   await app.listen(3000, '0.0.0.0');
//   console.log(`🚀 Server running on http://localhost:3000`);
// }
// bootstrap();
const port = process.env.PORT || 3000;


  // '0.0.0.0' jest konieczne, aby kontener w chmurze był dostępny z zewnątrz
  await app.listen(port, '0.0.0.0'); 
  
  console.log(`🚀 Server running on port: ${port}`);
}
bootstrap();


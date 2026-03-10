import { IsEnum, IsInt, IsNotEmpty, IsString, Max, Min } from 'class-validator';

// Definiujemy dozwolone wartości dla pól
export enum TrainingLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
}

export enum TrainingGoal {
  CALISTHENICS = 'calisthenics', // Kalistenika
  STRENGTH = 'strength', // Siła
  HYPERTROPHY = 'hypertrophy', // Budowa masy
  GENERAL = 'general', // Ogólna sprawność
}

// 🎯 NOWY ENUM DLA PRESETÓW SPRZĘTU
// Definiuje trzy opcje, które wybierze użytkownik.
export enum EquipmentPreset {
  BODYWEIGHT = 'body-weight', // Tylko Kalistenika (dom, drążek)
  FREE_WEIGHT = 'free-weight', // Wolne Ciężary (Sztangi/Hantle) + Podstawy
  GYM = 'gym', // Pełna Siłownia (Wszystko)
}

export class GeneratePlanDto {
  @IsNotEmpty()
  @IsString()
  name: string; // Np. "Mój pierwszy plan"

  @IsNotEmpty()
  @IsEnum(TrainingLevel)
  level: TrainingLevel; // 'beginner', 'intermediate', 'advanced'

  @IsNotEmpty()
  @IsEnum(TrainingGoal)
  goal: TrainingGoal; // 'calisthenics', 'strength', itp.

  @IsNotEmpty()
  @IsInt()
  @Min(1) // Minimum 1 dzień
  @Max(7) // Maksimum 7 dni
  daysPerWeek: number; // np. 3
  // 🎯 ZMIANA: Z tablicy stringów na pojedynczy, wymagany enum

  @IsNotEmpty()
  @IsEnum(EquipmentPreset)
  equipment: EquipmentPreset; // Użytkownik wyśle 'body-weight', 'free-weight', lub 'gym'
}

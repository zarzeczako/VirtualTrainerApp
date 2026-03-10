import { Injectable, Logger, OnModuleInit, Optional } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import Fuse, { IFuseOptions } from 'fuse.js';
import { Model } from 'mongoose';
import {
  SwapExercise,
  SwapExerciseDocument,
} from '../exercises/schemas/swap-exercise.schema';
// Upewnij się, że ścieżki do map są poprawne!
import {
  bodyPartMap,
  equipmentMap,
} from '../../data/dialogflow/translations.maps';
import { definitionsMap } from '../../data/dialogflow/definitions.map';

type ExerciseDocument = SwapExercise & { instructions_pl?: string[] };

type ExerciseAnalyticsPort = {
  recordExerciseQuery?: (payload: {
    query: string;
    exerciseId?: string;
    exerciseName?: string;
  }) => Promise<void> | void;
};

@Injectable()
export class DialogflowService implements OnModuleInit {
  private readonly logger = new Logger(DialogflowService.name);
  private allExercisesCache: ExerciseDocument[] = [];
  private fuse?: Fuse<ExerciseDocument>;
  
  private readonly fuseOptions: IFuseOptions<ExerciseDocument> = {
    includeScore: true,
    threshold: 0.45,
    keys: [
      { name: 'name_pl', weight: 1 },
      { name: 'name', weight: 0.4 },
    ],
  };

  private static readonly QUICK_REPLY_LIMIT = 10;

  constructor(
    @InjectModel(SwapExercise.name)
    private readonly swapExerciseModel: Model<SwapExerciseDocument>,
    @Optional() private readonly analyticsService?: ExerciseAnalyticsPort,
  ) {}

  async onModuleInit(): Promise<void> {
    const exercises = await this.swapExerciseModel.find().lean();
    this.allExercisesCache = exercises as ExerciseDocument[];
    this.fuse = new Fuse(this.allExercisesCache, this.fuseOptions);
    this.logger.log(
      `[Init] Wczytano ${this.allExercisesCache.length} ćwiczeń do cache i skonfigurowano Fuse.js`,
    );
  }

  public async routeIntent(body: any): Promise<any> {
    const intentName = body.queryResult.intent.displayName;
    const parameters = body.queryResult.parameters;
    const queryText = body.queryResult.queryText;

    const muscleGroup = parameters.muscle_group;
    const equipment = parameters.equipment;

    this.logger.log(`[Webhook] Rozpoznano intencję: ${intentName}`);

    let query: string;
    let filters = { muscleGroup, equipment };

    if (intentName === 'PytanieOTechnike - Wybor') {
      query = queryText;
      filters = { muscleGroup: null, equipment: null };
      this.logger.log(`[Webhook] Intencja Wybor. QueryText: "${query}"`);
    } else {
 
      const rawExercise = parameters.exercise_name;
      query = Array.isArray(rawExercise) ? rawExercise[0] : rawExercise;
      
    
      if (!query && !filters.muscleGroup && !filters.equipment) {
      query = queryText;
    }
      
      this.logger.log(`[Webhook] Intencja Główna. Parametr: "${query}"`);
    }

    switch (intentName) {
      case 'PytanieOTechnike':
      case 'PytanieOTechnike - Wybor':
        return this.handlePytanieOTechnike(
          query,
          filters.muscleGroup,
          filters.equipment,
          queryText,
        );
      case 'DefinicjaTerminu':
        return this.handleDefinicjaTerminu(parameters.fitness_term);
      default:
        this.logger.warn(`[Webhook] Nieobsługiwana intencja: ${intentName}`);
        return {
          fulfillmentText: `Nieobsługiwana intencja: ${intentName}.`,
        };
    }
  }

  private async handlePytanieOTechnike(
    query: string,
    muscleGroup: any,
    equipment: any,
    originalQuery?: string,
  ): Promise<any> {
    if (!this.allExercisesCache.length) {
      await this.onModuleInit();
    }

    const trimmedQuery = query?.trim() ?? '';
    const normalizedQuery = trimmedQuery.toLowerCase();
    const fallbackQuery = originalQuery?.trim() ?? trimmedQuery;
    const fallbackNormalized = fallbackQuery.toLowerCase();
    
    const hasQuery = normalizedQuery.length > 0;

    // Tłumaczenie parametrów (bezpieczne dla tablic)
    const translatedBodyPart = this.translateValue(muscleGroup, bodyPartMap);
    const translatedEquipment = this.translateValue(equipment, equipmentMap);

    // Helper: Szukanie dokładne
    const findExactMatch = (normalized: string) =>
      normalized
        ? this.allExercisesCache.find(
            (exercise) =>
              exercise.name_pl?.toLowerCase() === normalized,
          )
        : undefined;

    // Krok A: Dokładne dopasowanie (Exact Match)
    if (hasQuery) {
      const exactMatch = findExactMatch(normalizedQuery);
      if (exactMatch && this.hasInstructions(exactMatch)) {
        return this.formatExerciseResponse(exactMatch, trimmedQuery);
      }
    } 
    
    // Próba dopasowania oryginalnego tekstu (jeśli parametr zawiódł)
    const fallbackExact = findExactMatch(fallbackNormalized);
    if (fallbackExact && this.hasInstructions(fallbackExact)) {
        return this.formatExerciseResponse(fallbackExact, fallbackQuery);
    }

    // Krok B: Wyszukiwanie Fuse.js
    let searchPool: ExerciseDocument[];
    
    if (hasQuery && this.fuse) {
      const fuseResults = this.fuse.search(trimmedQuery);
      searchPool = fuseResults.map((hit) => hit.item);
      this.logger.log(`[Search] Fuse znalazł ${searchPool.length} wyników dla "${trimmedQuery}"`);
      
      // Jeśli Fuse nic nie znalazł dla parametru, spróbuj dla całego zdania
      if (searchPool.length === 0 && trimmedQuery !== fallbackQuery) {
          const fallbackFuse = this.fuse.search(fallbackQuery);
          if (fallbackFuse.length > 0) {
              searchPool = fallbackFuse.map(h => h.item);
              this.logger.log(`[Search] Fallback Fuse znalazł ${searchPool.length} dla "${fallbackQuery}"`);
          }
      }
    } else {
      searchPool = [...this.allExercisesCache];
    }

    // Krok C: Filtrowanie
    const filtered = searchPool.filter((exercise) =>
      this.matchesFilters(exercise, translatedBodyPart, translatedEquipment),
    );

    // Krok D: Deduplikacja
    const uniqueByName = this.deduplicateByName(filtered);

    // Krok E: Odpowiedź
    if (!uniqueByName.length) {
      return {
        fulfillmentText:
          'Niestety, nie znalazłem ćwiczenia pasującego do Twojego zapytania. Spróbuj sprecyzować nazwę.',
      };
    }

    if (uniqueByName.length === 1) {
      return this.formatExerciseResponse(uniqueByName[0], fallbackQuery);
    }

    const suggestions = uniqueByName
      .map((exercise) => exercise.name_pl)
      .filter((name): name is string => Boolean(name))
      .slice(0, DialogflowService.QUICK_REPLY_LIMIT);

    return {
      fulfillmentMessages: [
        {
          text: {
            text: ['Znalazłem kilka opcji. Którą masz na myśli?'],
          },
        },
        {
          quickReplies: {
            title: 'Wybierz:',
            quickReplies: suggestions,
          },
        },
      ],
    };
  }

  private formatExerciseResponse(exercise: ExerciseDocument, query: string) {
    if (!this.hasInstructions(exercise)) {
      return {
        fulfillmentText: `Znalazłem ćwiczenie "${exercise.name_pl}", ale niestety nie mam jeszcze instrukcji.`,
      };
    }

    this.analyticsService?.recordExerciseQuery?.({
      query,
      exerciseId: (exercise as any)._id?.toString?.(),
      exerciseName: exercise.name_pl,
    });

    const formattedInstructions = exercise.instructions_pl!
      .map((step, index) => `${index + 1}. ${step}`)
      .join('\n\n');

    return {
      fulfillmentText: `Jasne! Oto instrukcje dla **${exercise.name_pl}**:\n\n${formattedInstructions}`,
    };
  }
  
  private hasInstructions(exercise: ExerciseDocument): boolean {
    return (
      Array.isArray(exercise.instructions_pl) &&
      exercise.instructions_pl.length > 0
    );
  }

  private matchesFilters(
    exercise: ExerciseDocument,
    translatedBodyPart: string | null,
    translatedEquipment: string | null,
  ): boolean {
    if (!this.hasInstructions(exercise)) {
      return false;
    }

    const normalizedBodyPart = exercise.bodyPart?.toLowerCase() ?? '';
    const normalizedEquipment = exercise.equipment?.toLowerCase() ?? '';

    // Luźniejsze dopasowanie dla bodyPart (np. 'legs' pasuje do 'upper legs')
    const matchesBodyPart = translatedBodyPart
      ? normalizedBodyPart.includes(translatedBodyPart)
      : true;

    const matchesEquipment = translatedEquipment
      ? normalizedEquipment.includes(translatedEquipment)
      : true;

    return matchesBodyPart && matchesEquipment;
  }

  private deduplicateByName(exercises: ExerciseDocument[]): ExerciseDocument[] {
    const map = new Map<string, ExerciseDocument>();
    exercises.forEach((exercise) => {
      if (exercise.name_pl) {
          map.set(exercise.name_pl.toLowerCase(), exercise);
      }
    });
    return Array.from(map.values());
  }

  private translateValue(
    value: any,
    dictionary: Record<string, string>,
  ): string | null {
    const raw = Array.isArray(value) ? value[0] : value;
    if (!raw || typeof raw !== 'string') {
      return null;
    }
    return dictionary[raw.toLowerCase()]?.toLowerCase() ?? raw.toLowerCase();
  }

  private handleDefinicjaTerminu(term: any): any {
    const termValue = Array.isArray(term) ? term[0] : term;
    
    if (!termValue) {
      return {
        fulfillmentText: 'Przepraszam, nie dosłyszałem o jaki termin pytasz.',
      };
    }
    
    this.logger.log(`[Webhook] Wyszukiwanie definicji dla: ${termValue}`);
    const definition = definitionsMap[termValue.toLowerCase().trim()];

    if (definition) {
      return { fulfillmentText: definition };
    }

    return {
      fulfillmentText: `Niestety, nie znam jeszcze definicji dla "${termValue}".`,
    };
  }
}
// src/common/pipes/parse-mongo-id.pipe.ts

import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { Types } from 'mongoose';

/**
 * Pipe, który sprawdza, czy string jest poprawnym
 * identyfikatorem MongoDB ObjectId.
 */
@Injectable()
export class ParseMongoIdPipe implements PipeTransform<string, Types.ObjectId> {
  transform(value: string, metadata: ArgumentMetadata): Types.ObjectId {
    // Sprawdzamy, czy ID jest poprawnym ObjectId
    if (!Types.ObjectId.isValid(value)) {
      throw new BadRequestException(
        `'${value}' nie jest poprawnym MongoID dla parametru '${metadata.data}'`,
      );
    }
    // Zwracamy przekonwertowaną wartość
    return new Types.ObjectId(value);
  }
}

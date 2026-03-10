import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schema/user.schema';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeederService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async seedAdmin() {
    try {
      const adminEmail = 'admin@gmail.com';
      const adminPassword = 'admin123';

      // Sprawdź czy admin już istnieje
      const existing = await this.userModel.findOne({ email: adminEmail });

      if (existing) {
        console.log('✓ Konto administratora już istnieje');
        return;
      }

      // Hashuj hasło
      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      // Utwórz konto admina
      await this.userModel.create({
        email: adminEmail,
        name: 'Administrator',
        password: hashedPassword,
        role: 'admin',
        isBlocked: false,
      });

      console.log('✓ Utworzono konto administratora:');
      console.log('  Email: admin@gmail.com');
      console.log('  Hasło: admin123');
      console.log('  WAŻNE: Zaleca się zmianę hasła po pierwszym logowaniu!');
    } catch (error) {
      console.error('✗ Błąd podczas tworzenia konta administratora:', error);
    }
  }
}

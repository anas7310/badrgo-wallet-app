import { AppDataSource } from '../data-source';
import { User } from '../../modules/users/entities/user.entity';
import { Wallet } from '../../modules/wallets/entities/wallet.entity';
import { Transaction } from '../../modules/transactions/entities/transaction.entity';
import { TransactionType } from '../../common/enums/transaction-type.enum';

async function seed() {
  await AppDataSource.initialize();
  console.log('📦 Connected to database. Seeding...');

  const userRepo = AppDataSource.getRepository(User);
  const walletRepo = AppDataSource.getRepository(Wallet);
  const txRepo = AppDataSource.getRepository(Transaction);

  
  const user1 = userRepo.create({ name: 'Anas Khan', email: 'anas@example.com', phone: '+923001111111' });
  const user2 = userRepo.create({ name: 'Sara Ahmed', email: 'sara@example.com', phone: '+923002222222' });
  const savedUser1 = await userRepo.save(user1);
  const savedUser2 = await userRepo.save(user2);

  
  const wallet1 = walletRepo.create({ userId: savedUser1.id, currency: 'USD', balance: 0 });
  const wallet2 = walletRepo.create({ userId: savedUser2.id, currency: 'USD', balance: 0 });
  const savedWallet1 = await walletRepo.save(wallet1);
  const savedWallet2 = await walletRepo.save(wallet2);

  
  const credit1 = txRepo.create({
    walletId: savedWallet1.id,
    type: TransactionType.CREDIT,
    amount: 50000,
    balanceBefore: 0,
    balanceAfter: 50000,
    referenceId: 'seed-credit-001',
    description: 'Initial top-up',
  });
  savedWallet1.balance = 50000;
  await txRepo.save(credit1);
  await walletRepo.save(savedWallet1);

  
  const debit1 = txRepo.create({
    walletId: savedWallet1.id,
    type: TransactionType.DEBIT,
    amount: 12000,
    balanceBefore: 50000,
    balanceAfter: 38000,
    referenceId: 'seed-debit-001',
    description: 'Ride payment',
  });
  savedWallet1.balance = 38000;
  await txRepo.save(debit1);
  await walletRepo.save(savedWallet1);

  
  const credit2 = txRepo.create({
    walletId: savedWallet2.id,
    type: TransactionType.CREDIT,
    amount: 20000,
    balanceBefore: 0,
    balanceAfter: 20000,
    referenceId: 'seed-credit-002',
    description: 'Initial top-up',
  });
  savedWallet2.balance = 20000;
  await txRepo.save(credit2);
  await walletRepo.save(savedWallet2);

  console.log('✅ Seed complete!');
  console.log(`   Users: ${savedUser1.id}, ${savedUser2.id}`);
  console.log(`   Wallets: ${savedWallet1.id} ($380), ${savedWallet2.id} ($200)`);

  await AppDataSource.destroy();
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});

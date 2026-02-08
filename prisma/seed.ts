import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  let agriculture = await prisma.domain.findFirst({ where: { name: 'Agriculture' } });
  if (!agriculture) {
    agriculture = await prisma.domain.create({
      data: {
        name: 'Agriculture',
        description: 'Farming, crops, and land management',
      },
    });
  }

  let cattle = await prisma.domain.findFirst({ where: { name: 'Cattle' } });
  if (!cattle) {
    cattle = await prisma.domain.create({
      data: {
        name: 'Cattle',
        description: 'Livestock and animal husbandry',
      },
    });
  }

  let infrastructure = await prisma.domain.findFirst({ where: { name: 'Infrastructure' } });
  if (!infrastructure) {
    infrastructure = await prisma.domain.create({
      data: {
        name: 'Infrastructure',
        description: 'Buildings, roads, and utilities',
      },
    });
  }

  let admin = await prisma.user.findFirst({ where: { phone: '+919876543210' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        phone: '+919876543210',
        name: 'System Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    });
  } else {
    await prisma.user.update({
      where: { id: admin.id },
      data: { passwordHash },
    });
  }

  let agTeam = await prisma.team.findFirst({
    where: { domainId: agriculture.id, name: 'Crop Team' },
  });
  if (!agTeam) {
    agTeam = await prisma.team.create({
      data: {
        name: 'Crop Team',
        domainId: agriculture.id,
      },
    });
  }

  let domainHead = await prisma.user.findFirst({
    where: { phone: '+919876543211' },
  });
  if (!domainHead) {
    domainHead = await prisma.user.create({
      data: {
        phone: '+919876543211',
        name: 'Agriculture Head',
        role: 'DOMAIN_HEAD',
        passwordHash,
        domainId: agriculture.id,
      },
    });
  }
  await prisma.team.update({
    where: { id: agTeam.id },
    data: { leadId: domainHead.id },
  });

  // SULI Location (PrismaClient.suliLocation exists after `npx prisma generate`; IDE may cache older types)
  const suliLocation = (prisma as any).suliLocation;
  let suliVillage = suliLocation ? await suliLocation.findFirst({ where: { name: 'SULI Village Center' } }) : null;
  if (suliLocation && !suliVillage) {
    suliVillage = await suliLocation.create({
      data: {
        name: 'SULI Village Center',
        latitude: 15.5,
        longitude: 73.8,
        radiusMetres: 500,
      },
    });
  }

  console.log('Seed completed:');
  console.log('  Admin:', admin.phone, admin.name);
  console.log('  Domains:', agriculture.name, cattle.name, infrastructure.name);
  console.log('  Team:', agTeam.name);
  if (suliVillage) {
    console.log('  SULI Location:', suliVillage.name, '(500m radius)');
  }
  console.log('\nLogin: phone=+919876543210, password=admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

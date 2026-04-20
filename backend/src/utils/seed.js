const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Admin user
  const adminHash = await bcrypt.hash("Admin@123456", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@metamissmaster.cm" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@metamissmaster.cm",
      passwordHash: adminHash,
      role: "ADMIN",
      phone: "+237600000000"
    }
  });
  console.log("✅ Admin created:", admin.email);

  // Test user
  const userHash = await bcrypt.hash("User@123456", 12);
  const user = await prisma.user.upsert({
    where: { email: "test@example.com" },
    update: {},
    create: {
      name: "Test User",
      email: "test@example.com",
      passwordHash: userHash,
      phone: "+237699999999"
    }
  });
  console.log("✅ Test user created:", user.email);

  // Contest
  const contest = await prisma.contest.upsert({
    where: { id: "seed-contest-1" },
    update: {},
    create: {
      id: "seed-contest-1",
      name: "META MISS & MASTER 2025",
      status: "OPEN",
      startDate: new Date()
    }
  });
  console.log("✅ Contest created:", contest.name);

  // Candidates
  const candidates = [
    { name: "Aïcha Nguemo", type: "MISS", age: 22, city: "Yaoundé", bio: "Passionnée de mode et de culture africaine.", photoUrl: "/uploads/placeholder-miss.jpg" },
    { name: "Blandine Fotso", type: "MISS", age: 24, city: "Douala", bio: "Étudiante en médecine et militante sociale.", photoUrl: "/uploads/placeholder-miss.jpg" },
    { name: "Carelle Mbida", type: "MISS", age: 21, city: "Bafoussam", bio: "Artiste et créatrice de contenu digital.", photoUrl: "/uploads/placeholder-miss.jpg" },
    { name: "Jean-Marc Eto", type: "MASTER", age: 25, city: "Douala", bio: "Entrepreneur et sportif de haut niveau.", photoUrl: "/uploads/placeholder-master.jpg" },
    { name: "Patrick Nlend", type: "MASTER", age: 27, city: "Yaoundé", bio: "Ingénieur passionné de musique.", photoUrl: "/uploads/placeholder-master.jpg" },
    { name: "Boris Kana", type: "MASTER", age: 23, city: "Kribi", bio: "Photographe et voyageur.", photoUrl: "/uploads/placeholder-master.jpg" },
  ];

  for (const c of candidates) {
    await prisma.candidate.create({ data: { ...c, status: "APPROVED" } });
  }
  console.log(`✅ ${candidates.length} candidates created`);

  console.log("\n🎉 Seed complete!");
  console.log("Admin login: admin@metamissmaster.cm / Admin@123456");
  console.log("User login:  test@example.com / User@123456");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());

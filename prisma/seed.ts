import { PrismaClient } from "@prisma/client";
import { hashPin } from "../src/lib/auth";

const db = new PrismaClient();
const KATHERINE_PIN = "1234"; // demo only — see README "Auth / roles"
const STEVE_PIN = "5678";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

async function main() {
  // Wipe existing data so the seed is repeatable.
  await db.pointsLedger.deleteMany();
  await db.quizResponse.deleteMany();
  await db.quizQuestion.deleteMany();
  await db.feedPost.deleteMany();
  await db.announcement.deleteMany();
  await db.calendarEvent.deleteMany();
  await db.dinnerPlan.deleteMany();
  await db.shoppingItem.deleteMany();
  await db.job.deleteMany();
  await db.profile.deleteMany();
  await db.family.deleteMany();

  const family = await db.family.create({
    data: {
      name: "The Family",
      address: "Regional NSW, Australia",
      timezone: "Australia/Sydney",
    },
  });

  const katherinePin = hashPin(KATHERINE_PIN);
  const stevePin = hashPin(STEVE_PIN);

  const [katherine, steve, victoria, anna, lucy, juliet] = await Promise.all([
    db.profile.create({
      data: {
        familyId: family.id,
        name: "Katherine",
        role: "parent",
        avatarColor: "#4c8c5b",
        avatarInitial: "K",
        pinHash: katherinePin.hash,
        pinSalt: katherinePin.salt,
      },
    }),
    db.profile.create({
      data: {
        familyId: family.id,
        name: "Steve",
        role: "parent",
        avatarColor: "#3a5a8c",
        avatarInitial: "S",
        pinHash: stevePin.hash,
        pinSalt: stevePin.salt,
      },
    }),
    db.profile.create({ data: { familyId: family.id, name: "Victoria", role: "child", avatarColor: "#7d5aa6", avatarInitial: "V" } }),
    db.profile.create({ data: { familyId: family.id, name: "Anna", role: "child", avatarColor: "#3e7c8c", avatarInitial: "A" } }),
    db.profile.create({ data: { familyId: family.id, name: "Lucy", role: "child", avatarColor: "#a3760f", avatarInitial: "L" } }),
    db.profile.create({ data: { familyId: family.id, name: "Juliet", role: "child", avatarColor: "#c1585f", avatarInitial: "J" } }),
  ]);

  await db.job.createMany({
    data: [
      { familyId: family.id, title: "Feed dogs", points: 5, assignedToId: anna.id, status: "open", dueDate: startOfToday() },
      { familyId: family.id, title: "Empty dishwasher", points: 10, assignedToId: anna.id, status: "done", dueDate: startOfToday(), completedAt: new Date() },
      { familyId: family.id, title: "Vacuum lounge", points: 15, assignedToId: victoria.id, status: "open", dueDate: startOfToday() },
    ],
  });

  await db.dinnerPlan.create({
    data: {
      familyId: family.id,
      date: startOfToday(),
      mealName: "Spaghetti Bolognese",
      cookId: katherine.id,
      dishesId: victoria.id,
    },
  });

  await db.shoppingItem.createMany({
    data: [
      { familyId: family.id, name: "Milk", addedById: juliet.id, addedVia: "voice" },
      { familyId: family.id, name: "Cheese", addedById: anna.id, addedVia: "voice" },
      { familyId: family.id, name: "Bread", addedById: katherine.id, addedVia: "type" },
      { familyId: family.id, name: "Eggs", addedById: katherine.id, addedVia: "type" },
      { familyId: family.id, name: "Dog food", addedById: anna.id, addedVia: "ai" },
    ],
  });

  const tomorrow = new Date(startOfToday());
  tomorrow.setDate(tomorrow.getDate() + 1);
  const netball = new Date(tomorrow);
  netball.setHours(17, 30, 0, 0);

  await db.calendarEvent.create({
    data: {
      familyId: family.id,
      title: "Netball",
      startTime: netball,
      category: "sport",
      attendees: { connect: [{ id: anna.id }] },
    },
  });

  await db.quizQuestion.create({
    data: {
      category: "Australian Wildlife",
      question: 'Which Australian marsupial is known for "boxing" with its front paws?',
      optionA: "Wallaby",
      optionB: "Kangaroo",
      optionC: "Wombat",
      optionD: "Koala",
      correctIndex: 1,
      explanation:
        'Male kangaroos "box" with their front paws and brace on their tail to kick — it\'s how they settle disputes over mates and territory.',
      points: 10,
      activeDate: startOfToday(),
    },
  });

  await db.feedPost.create({
    data: {
      familyId: family.id,
      authorId: juliet.id,
      caption: "Can someone please clean this up when they have a minute?",
      photoColor: "#9c6b3d",
    },
  });

  await db.pointsLedger.createMany({
    data: [
      { profileId: lucy.id, source: "job", amount: 540 },
      { profileId: anna.id, source: "job", amount: 510 },
      { profileId: victoria.id, source: "job", amount: 495 },
      { profileId: juliet.id, source: "job", amount: 470 },
      { profileId: anna.id, source: "job", amount: 10, note: "Empty dishwasher" },
    ],
  });

  console.log(`Seeded family "${family.name}" (${family.id}) with 6 profiles.`);
  console.log(`Katherine (parent) PIN: ${KATHERINE_PIN}`);
  console.log(`Steve (parent) PIN: ${STEVE_PIN}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

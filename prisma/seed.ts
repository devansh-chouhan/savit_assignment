import { PrismaClient, type LeadStage } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const companies = [
  { name: "Tata Consultancy Services", website: "https://www.tcs.com", industry: "IT Services", city: "Mumbai" },
  { name: "Infosys", website: "https://www.infosys.com", industry: "IT Services", city: "Bangalore" },
  { name: "Reliance Retail", website: "https://www.relianceretail.com", industry: "Retail", city: "Mumbai" },
  { name: "HDFC Bank", website: "https://www.hdfcbank.com", industry: "Banking", city: "Mumbai" },
  { name: "Zomato", website: "https://www.zomato.com", industry: "Food Tech", city: "Delhi" },
  { name: "Flipkart", website: "https://www.flipkart.com", industry: "E-commerce", city: "Bangalore" },
  { name: "Bajaj Finance", website: "https://www.bajajfinserv.in", industry: "Financial Services", city: "Pune" },
  { name: "Dr. Reddy's Laboratories", website: "https://www.drreddys.com", industry: "Pharmaceuticals", city: "Hyderabad" },
  { name: "Asian Paints", website: "https://www.asianpaints.com", industry: "Manufacturing", city: "Mumbai" },
  { name: "PhonePe", website: "https://www.phonepe.com", industry: "Fintech", city: "Bangalore" },
  { name: "Mahindra Logistics", website: "https://www.mahindralogistics.com", industry: "Logistics", city: "Mumbai" },
  { name: "Delhivery", website: "https://www.delhivery.com", industry: "Logistics", city: "Delhi" },
];

const people = [
  { name: "Aarav Sharma", city: "Mumbai" },
  { name: "Vivaan Patel", city: "Mumbai" },
  { name: "Aditya Iyer", city: "Bangalore" },
  { name: "Vihaan Reddy", city: "Hyderabad" },
  { name: "Arjun Mehta", city: "Pune" },
  { name: "Sai Nair", city: "Bangalore" },
  { name: "Reyansh Gupta", city: "Delhi" },
  { name: "Ishaan Kapoor", city: "Delhi" },
  { name: "Shaurya Joshi", city: "Pune" },
  { name: "Kabir Singh", city: "Mumbai" },
  { name: "Ananya Desai", city: "Mumbai" },
  { name: "Diya Menon", city: "Bangalore" },
  { name: "Aadhya Rao", city: "Hyderabad" },
  { name: "Myra Kulkarni", city: "Pune" },
  { name: "Anika Banerjee", city: "Delhi" },
  { name: "Sara Khan", city: "Mumbai" },
  { name: "Navya Chopra", city: "Delhi" },
  { name: "Kiara Bose", city: "Bangalore" },
  { name: "Pari Malhotra", city: "Delhi" },
  { name: "Neha Verma", city: "Pune" },
  { name: "Pooja Natarajan", city: "Hyderabad" },
  { name: "Sneha Kulkarni", city: "Mumbai" },
  { name: "Meera Iyer", city: "Bangalore" },
  { name: "Divya Reddy", city: "Hyderabad" },
  { name: "Rohan Deshmukh", city: "Pune" },
  { name: "Karan Malhotra", city: "Delhi" },
  { name: "Amit Bansal", city: "Delhi" },
  { name: "Rahul Joshi", city: "Mumbai" },
  { name: "Nikhil Rao", city: "Hyderabad" },
  { name: "Tanvi Shah", city: "Mumbai" },
];

const sources = ["Website", "Referral", "LinkedIn", "IndiaMart", "Cold Call", "Trade Show", "Google Ads"];
const tagPool = ["Decision maker", "Enterprise", "SMB", "Follow-up", "Priority", "Existing customer"];

const titles = [
  "Annual CRM subscription",
  "WhatsApp commerce rollout",
  "Dealer portal renewal",
  "Branch analytics pilot",
  "Restaurant partner CRM",
  "Seller success workspace",
  "Collections workflow",
  "Medical rep tracking",
  "Dealer tint studio app",
  "Merchant onboarding CRM",
  "Fleet visibility dashboard",
  "Last-mile control tower",
  "HR helpdesk expansion",
  "Campus hiring CRM",
  "Loyalty programme revamp",
  "Credit card cross-sell",
  "Cloud kitchen CRM",
  "Returns reduction pilot",
  "SME lending desk",
  "Field force app",
  "Store staff scheduling",
  "UPI merchant CRM",
  "Warehouse slotting tool",
  "NDR reduction programme",
  "IT services QBR pack",
  "Retail media pilot",
  "Priority banking CRM",
  "Hyperlocal growth pod",
  "Pharma sample tracking",
  "Paint contractor network",
  "Insurance lead desk",
  "Campus placement suite",
  "Dark store ops CRM",
  "Partner payout portal",
  "Support deflection project",
  "Festival demand planning",
  "MSME collections pod",
  "Clinic chain rollout",
  "Distributor rebate tracker",
  "City expansion war room",
];

const stagePlan: LeadStage[] = [
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST",
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON",
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON",
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "LOST",
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "WON",
  "NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST",
  "NEW", "CONTACTED", "NEW",
];

const values = [
  180000, 250000, 320000, 450000, 560000, 640000, 750000, 890000, 980000, 1200000,
  1500000, 1850000, 2100000, 2750000, 95000, 140000, 410000, 530000, 670000, 820000,
  1100000, 1350000, 1600000, 2400000, 300000, 390000, 470000, 610000, 730000, 880000,
  1020000, 1280000, 1490000, 1760000, 2050000, 2600000, 115000, 275000, 505000, 945000,
];

const lostReasons = ["Budget freeze for this quarter", "Chose a competitor", "No response after the proposal"];

function daysFromNow(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(11, 0, 0, 0);
  return date;
}

function domainOf(website: string | null) {
  if (!website) return "example.com";
  return website.replace(/^https?:\/\//, "").replace(/^www\./, "");
}

async function main() {
  await prisma.task.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.contact.deleteMany();
  await prisma.company.deleteMany();
  await prisma.user.deleteMany();

  const adminHash = await bcrypt.hash("Admin@123", 10);
  const repHash = await bcrypt.hash("Rep@123", 10);

  const admin = await prisma.user.create({
    data: { name: "Ananya Sharma", email: "admin@savit.dev", passwordHash: adminHash, role: "ADMIN" },
  });
  const rohan = await prisma.user.create({
    data: { name: "Rohan Mehta", email: "rohan.mehta@savit.dev", passwordHash: repHash, role: "SALES_REP" },
  });
  const priya = await prisma.user.create({
    data: { name: "Priya Nair", email: "priya.nair@savit.dev", passwordHash: repHash, role: "SALES_REP" },
  });
  const owners = [admin, rohan, priya];

  const createdCompanies = [];
  for (const company of companies) {
    createdCompanies.push(await prisma.company.create({ data: company }));
  }

  const contacts = [];
  for (let i = 0; i < people.length; i++) {
    const company = createdCompanies[i % createdCompanies.length];
    const person = people[i];
    const email = `${person.name.toLowerCase().replace(/\s+/g, ".")}@${domainOf(company.website)}`;
    contacts.push(
      await prisma.contact.create({
        data: {
          name: person.name,
          email,
          phone: `+91${9800000000 + i}`,
          companyId: company.id,
          city: person.city,
          source: sources[i % sources.length],
          notes: `Spoke with ${person.name.split(" ")[0]} about a CRM rollout for the ${person.city} team. They want a clearer pipeline and follow-up discipline.`,
          tags: [tagPool[i % tagPool.length], tagPool[(i + 2) % tagPool.length]],
          createdAt: daysFromNow(-(i + 12)),
        },
      }),
    );
  }

  for (let i = 0; i < titles.length; i++) {
    const stage = stagePlan[i];
    const contact = contacts[i % contacts.length];
    const owner = i % 3 === 0 ? admin : i % 2 === 0 ? rohan : priya;
    const source = sources[i % sources.length];
    const createdAt = daysFromNow(-(i % 40) - 6);
    const past = ["CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"].includes(stage);
    const proposed = ["PROPOSAL_SENT", "NEGOTIATION", "WON", "LOST"].includes(stage);
    const met = ["NEGOTIATION", "WON"].includes(stage);

    const activities: { type: "NOTE" | "CALL" | "EMAIL" | "MEETING" | "STAGE_CHANGE"; description: string; createdById: string; createdAt: Date }[] = [
      {
        type: "NOTE" as const,
        description: `Lead created from ${source}. Initial interest is a ${titles[i].toLowerCase()} for ${contact.name}.`,
        createdById: owner.id,
        createdAt,
      },
    ];
    if (past) {
      activities.push({
        type: "CALL",
        description: `Discovery call with ${contact.name}. They described the current follow-up process as spreadsheet-heavy.`,
        createdById: owner.id,
        createdAt: daysFromNow(-(i % 30) - 4),
      });
    }
    if (proposed) {
      activities.push({
        type: "EMAIL",
        description: `Sent a proposal covering pipeline visibility, activity tracking, and a 6-week rollout.`,
        createdById: owner.id,
        createdAt: daysFromNow(-(i % 20) - 2),
      });
    }
    if (met) {
      activities.push({
        type: "MEETING",
        description: `Working session with the buying team. They asked for a tighter rollout plan before the quarter closes.`,
        createdById: owner.id,
        createdAt: daysFromNow(-(i % 12) - 1),
      });
    }
    if (stage !== "NEW") {
      activities.push({
        type: "STAGE_CHANGE",
        description: `Stage changed from New to ${stage.replaceAll("_", " ").toLowerCase()}.`,
        createdById: owner.id,
        createdAt: daysFromNow(-(i % 15) - 1),
      });
    }

    const tasks = [];
    if (i % 3 === 0) {
      const completed = i % 9 === 0;
      const overdue = !completed && i % 2 === 0;
      tasks.push({
        title: overdue ? `Follow up with ${contact.name.split(" ")[0]}` : `Book a demo for ${titles[i]}`,
        dueDate: overdue ? daysFromNow(-((i % 6) + 1)) : daysFromNow((i % 12) + 2),
        assignedUserId: owner.id,
        completed,
      });
    }

    await prisma.lead.create({
      data: {
        title: titles[i],
        contactId: contact.id,
        dealValue: values[i],
        stage,
        ownerId: owner.id,
        expectedCloseDate: stage === "WON" ? daysFromNow(-4) : stage === "LOST" ? daysFromNow(-8) : daysFromNow((i % 40) + 5),
        source,
        lostReason: stage === "LOST" ? lostReasons[i % lostReasons.length] : null,
        scoreStale: true,
        createdAt,
        activities: { create: activities },
        tasks: { create: tasks },
      },
    });
  }

  console.log(`Seeded ${owners.length} users, ${createdCompanies.length} companies, ${contacts.length} contacts, ${titles.length} leads.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });

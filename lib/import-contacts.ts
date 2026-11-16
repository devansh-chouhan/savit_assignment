import { z } from "zod";
import { digits } from "./format";
import { prisma } from "./prisma";

export type ImportInput = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  city?: string | null;
  source?: string | null;
  notes?: string | null;
  tags?: string | null;
};

export type PreparedRow = {
  index: number;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  city: string | null;
  source: string | null;
  notes: string | null;
  tags: string[];
  status: "valid" | "duplicate" | "invalid";
  message: string | null;
};

const emailCheck = z.string().email();

function clean(value?: string | null) {
  const text = (value ?? "").trim();
  return text.length ? text : null;
}

export async function prepareImport(rows: ImportInput[]) {
  const existing = await prisma.contact.findMany({ select: { email: true, phone: true } });
  const emails = new Set(existing.map((item) => item.email?.toLowerCase()).filter(Boolean) as string[]);
  const phones = new Set(existing.map((item) => digits(item.phone)).filter((value) => value.length >= 10));
  const seenEmails = new Set<string>();
  const seenPhones = new Set<string>();

  return rows.map((row, index): PreparedRow => {
    const name = clean(row.name);
    const email = clean(row.email)?.toLowerCase() ?? null;
    const phone = clean(row.phone);
    const phoneKey = digits(phone);
    const company = clean(row.company);
    const city = clean(row.city);
    const source = clean(row.source);
    const notes = clean(row.notes);
    const tags = (row.tags ?? "")
      .split(/[|,;]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 12);

    if (!name || name.length < 2) {
      return {
        index,
        name: name ?? "",
        email,
        phone,
        company,
        city,
        source,
        notes,
        tags,
        status: "invalid",
        message: "Name is required",
      };
    }
    if (email && !emailCheck.safeParse(email).success) {
      return {
        index,
        name,
        email,
        phone,
        company,
        city,
        source,
        notes,
        tags,
        status: "invalid",
        message: "Invalid email",
      };
    }

    const emailDup = email && (emails.has(email) || seenEmails.has(email));
    const phoneDup = phoneKey.length >= 10 && (phones.has(phoneKey) || seenPhones.has(phoneKey));
    if (email) seenEmails.add(email);
    if (phoneKey.length >= 10) seenPhones.add(phoneKey);

    if (emailDup || phoneDup) {
      return {
        index,
        name,
        email,
        phone,
        company,
        city,
        source,
        notes,
        tags,
        status: "duplicate",
        message: emailDup ? "Duplicate email" : "Duplicate phone",
      };
    }

    return {
      index,
      name,
      email,
      phone,
      company,
      city,
      source,
      notes,
      tags,
      status: "valid",
      message: null,
    };
  });
}

export async function importContacts(rows: ImportInput[], skipDuplicates: boolean) {
  const prepared = await prepareImport(rows);
  let imported = 0;
  let skipped = 0;
  let failed = 0;
  const errors: { row: number; message: string }[] = [];

  for (const row of prepared) {
    if (row.status === "invalid") {
      failed += 1;
      errors.push({ row: row.index + 1, message: row.message ?? "Invalid row" });
      continue;
    }
    if (row.status === "duplicate") {
      if (skipDuplicates) {
        skipped += 1;
      } else {
        failed += 1;
        errors.push({ row: row.index + 1, message: row.message ?? "Duplicate" });
      }
      continue;
    }

    try {
      let companyId: string | null = null;
      if (row.company) {
        const existing = await prisma.company.findFirst({
          where: { name: { equals: row.company, mode: "insensitive" } },
        });
        if (existing) {
          companyId = existing.id;
        } else {
          const created = await prisma.company.create({
            data: { name: row.company, city: row.city },
          });
          companyId = created.id;
        }
      }
      await prisma.contact.create({
        data: {
          name: row.name,
          email: row.email,
          phone: row.phone,
          companyId,
          city: row.city,
          source: row.source,
          notes: row.notes,
          tags: row.tags,
        },
      });
      imported += 1;
    } catch (error) {
      console.error(error);
      failed += 1;
      errors.push({ row: row.index + 1, message: "Could not save this row" });
    }
  }

  return { imported, skipped, failed, errors: errors.slice(0, 20), preview: prepared };
}

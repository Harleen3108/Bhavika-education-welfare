/**
 * Diagnose and clear an admin login lockout.
 *
 * Run with: `npx tsx scripts/admin-unlock.ts [email]`
 *
 * With no argument it reports (and clears) every admin lockout and prints the
 * effective ADMIN_ACCESS_CODE so a "the code is wrong" report can be checked
 * against what the server actually expects. Read-mostly: it only deletes
 * AdminLockout rows, never touches users, wallets or the attempt log.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import { User } from "../src/server/models/User";
import { AdminLockout } from "../src/server/models/AdminLockout";
import { UserRole } from "../src/lib/enums";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set in .env.local");
  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB_NAME });

  const wanted = process.argv[2]?.toLowerCase();

  console.log("\nEffective ADMIN_ACCESS_CODE:", JSON.stringify(process.env.ADMIN_ACCESS_CODE ?? "BHAVIKA-ADMIN-2026 (default)"));

  const admins = await User.find({ role: UserRole.ADMIN }).select("email status").lean();
  console.log("\nAdmin accounts:");
  for (const a of admins) console.log(`  • ${a.email}  [status: ${a.status}]`);

  const filter = wanted ? { email: wanted } : {};
  const locks = await AdminLockout.find(filter).lean();

  if (locks.length === 0) {
    console.log("\nNo lockout rows found — nothing to clear.");
  } else {
    console.log("\nLockout rows:");
    for (const l of locks) {
      const ms = l.lockedUntil ? l.lockedUntil.getTime() - Date.now() : 0;
      const state = ms > 0 ? `LOCKED for ${Math.ceil(ms / 60000)} more min` : "not currently locked";
      console.log(
        `  • ${l.email}  failedCount=${l.failedCount} level=${l.level}  ${state}`,
      );
    }
    const res = await AdminLockout.deleteMany(filter);
    console.log(`\nCleared ${res.deletedCount} lockout row(s). You can sign in again now.`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

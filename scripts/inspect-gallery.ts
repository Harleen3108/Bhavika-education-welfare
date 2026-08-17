/* eslint-disable no-console */
/** Read-only: reports what is currently in the gallery/testimonial collections. */
import { config } from "dotenv";
config({ path: ".env.local" });

import mongoose from "mongoose";
import { GalleryItem } from "../src/server/models/GalleryItem";
import { Testimonial } from "../src/server/models/Testimonial";
import { Partner } from "../src/server/models/Partner";

async function main() {
  await mongoose.connect(process.env.MONGODB_URI!, {
    dbName: process.env.MONGODB_DB_NAME || "bhavika",
  });

  const gallery = await GalleryItem.find().select("title imageUrl category order").lean();
  console.log(`\nGALLERY (${gallery.length})`);
  for (const g of gallery) {
    const host = (() => {
      try {
        return new URL(g.imageUrl).hostname;
      } catch {
        return "?";
      }
    })();
    console.log(`  [${host}] ${g.title}`);
  }

  const t = await Testimonial.find().select("name role").lean();
  console.log(`\nTESTIMONIALS (${t.length})`);
  t.forEach((x) => console.log(`  ${x.name} — ${x.role ?? ""}`));

  const p = await Partner.find().select("name logoUrl").lean();
  console.log(`\nPARTNERS (${p.length})`);
  p.forEach((x) => console.log(`  ${x.name}${x.logoUrl ? " [has logo]" : " [no logo]"}`));

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

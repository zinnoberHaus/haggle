import { config } from "dotenv";
import { ingestDeals } from "../src/lib/ingestion";

config({ path: ".env.local", quiet: true });

ingestDeals()
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch(() => {
    console.error(
      "DealNews ingestion failed. Check database configuration and feed availability.",
    );
    process.exitCode = 1;
  });

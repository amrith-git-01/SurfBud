/**
 * Lists models available to your Groq API key.
 * Run: npm run list:groq-models
 */
import dotenv from "dotenv";
import Groq from "groq-sdk";

dotenv.config();

async function main(): Promise<void> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("GROQ_API_KEY is not set in .env");
    process.exit(1);
  }

  const groq = new Groq({ apiKey });
  const models = await groq.models.list();

  console.log(JSON.stringify(models, null, 2));
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});

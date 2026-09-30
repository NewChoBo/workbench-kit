const executablePath = process.env.npm_execpath || '';

if (!/pnpm/.test(executablePath)) {
  console.error('This repository requires pnpm. Please run `pnpm install`.');
  process.exit(1);
}

import { Connection, PublicKey } from '@solana/web3.js';
import { getWatchTargets, postTransfers } from './api.js';
import { config } from './config.js';
import { SolanaAdapter } from './solana.js';

const solana = new SolanaAdapter(
  new Connection(config.solanaRpcUrl, 'finalized'),
  new PublicKey(config.usdcMint),
);

async function tick(): Promise<void> {
  const targets = await getWatchTargets();
  const transfers = await solana.poll(targets.solana.wallets, targets.solana.references);
  await postTransfers(transfers);
  solana.commit();
  if (transfers.length > 0) console.log(`[watcher] ${transfers.length} transfer(s) enviadas à API`);
}

async function loop(): Promise<never> {
  console.log(`[watcher] observando ${config.solanaRpcUrl} a cada ${config.pollMs} ms`);
  for (;;) {
    try {
      await tick();
    } catch (e) {
      console.error('[watcher]', e instanceof Error ? e.message : e);
    }
    await new Promise((r) => setTimeout(r, config.pollMs));
  }
}

void loop();

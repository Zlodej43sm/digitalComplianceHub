// Synthetic POC: identical account-picker sessions locally and on the configured HTTPS host.
import { createLocalApp } from './local-identity';
import { dispatchOutbox, processAnalysis } from '../../api/analysis';
const app = createLocalApp(true);
export default {
  fetch: app.fetch,
  async queue(batch: any, env: any) {
    for (const message of batch.messages) {
      try {
        await processAnalysis(env, message.body);
        message.ack();
      } catch {
        message.retry();
      }
    }
  },
  async scheduled(_controller: any, env: any) {
    await dispatchOutbox(env);
  },
};

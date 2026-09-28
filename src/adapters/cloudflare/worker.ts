// Synthetic POC: identical account-picker sessions locally and on the configured HTTPS host.
import { createLocalApp } from './local-identity';
import { createApp } from '../../api/app';
import { dispatchOutbox, processAnalysis } from '../../api/analysis';
const demoApp = createLocalApp(true);
const accessApp = createApp();
export default {
  fetch(request: Request, env: any, executionContext: any) {
    return (env.AUTH_MODE === 'access' ? accessApp : demoApp).fetch(request, env, executionContext);
  },
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

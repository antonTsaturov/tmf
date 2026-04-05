
/*
* Для CRON:  0 2 * * * /usr/bin/node /var/www/your-app/dist/scripts/send-digest.js >> /var/log/digest.log 2>&1
*
* Еще варианты запуска скрипта:
* A. запускать на хосте (проще)
* node dist/scripts/send-digest.js
* 
* B. через docker exec
* docker exec your-container node dist/scripts/send-digest.js
* 
*/

import { DigestService } from '@/services/digest.service';

async function run() {
  try {
    console.log('Starting daily digest job...');

    await DigestService.sendDailyDigests();

    console.log('Digest job completed');
    process.exit(0);
  } catch (error) {
    console.error('Digest job failed:', error);
    process.exit(1);
  }
}

run();
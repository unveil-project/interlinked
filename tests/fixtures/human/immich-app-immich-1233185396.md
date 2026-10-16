> Which mechanism are you planning to use to trigger the job? Cronjob?

The queue only run at bootstrap time now. I trigger the job at [server/apps/microservices/src/microservices.service.ts](https://github.com/immich-app/immich/pull/558/files#diff-7865d279796e32cad8c05b29fce40464feb79507bd6535f54f2057a315ae3f94). Cron-job is also good idea.

import { test } from '@playwright/test';
import { databaseConnect } from '../utils/databaseConnect';
import { Db } from 'mongodb'
import { Logger } from 'winston';
import { logger } from '@utils/logger';

type WorkerFixtures = {
  dbInstance: Db
}

type TestFixtures = {
  log: Logger
  myFixture: string
}

export const dbFixture = test.extend<TestFixtures, WorkerFixtures>({
  dbInstance: [
    async ({}, use, workerInfo) => {
      logger.info(`Run test at worker ${workerInfo.workerIndex} =====`)
      const dbConnect = await databaseConnect();
      await use(dbConnect.db);
      logger.info(`Tear down for worker: ${workerInfo.workerIndex} =====`)
      await dbConnect.client.close()
  },
  {scope: 'worker', timeout: 60_000}
  ],

  log: async ({}, use) => {
    const initLogger = logger
    logger.info("Setup: Fixture log")
    await use(initLogger)
    logger.info("Tear down: Fixture log")
  },

  myFixture: [
    async ({dbInstance}, use) => {
      const dbName = dbInstance.databaseName
      await use(dbName)
    },
    {timeout: 15_000}
  ]
})

export { expect } from '@playwright/test'

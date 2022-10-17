import { suite, test } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import { Severity } from 'allure-js-commons'

import { description, feature, severity } from '../../.jest/jest-custom-reporter'
import { FEATURE } from '../../src/enums/feature'
import { Hooks } from './hooks'

@suite('storage')
class Storage extends Hooks {
  protected static apiKey: string

  static async before(): Promise<void> {
    try {
      await super.before()

      this.apiKey = await Storage.getProjectApiKey(process.env.PROJECT_REF, 'service_role')
      return Promise.resolve(null)
    } catch (err) {
      return Promise.reject(err)
    }
  }

  @feature(FEATURE.STORAGE)
  @severity(Severity.NORMAL)
  @description('create new storage bucket via API')
  @test
  async 'create storage bucket'() {
    const bucketName = faker.word.adjective() + '_' + faker.word.noun()
    const fakeBucket = {
      id: bucketName,
      name: bucketName,
      public: faker.datatype.boolean(),
    }
    const sb = this.createSupaClient(
      `https://${process.env.PROJECT_REF}.${Storage.projectDomain}`,
      Storage.apiKey
    )
    const { error: createError } = await sb.storage.createBucket(fakeBucket.name, {
      public: fakeBucket.public,
    })
    expect(createError).toBeNull()

    const { error: listObjectsErr } = await sb.storage.from(fakeBucket.id).list()
    expect(listObjectsErr).toBeNull()

    const textContent = faker.lorem.paragraphs()
    const fileName = faker.system.fileName()
    const { error: uploadErr } = await sb.storage.from(fakeBucket.id).upload(fileName, textContent)
    expect(uploadErr).toBeNull()

    const { data, error: downloadErr } = await sb.storage.from(fakeBucket.id).download(fileName)
    expect(downloadErr).toBeNull()
    expect(await data.text()).toBe(textContent)

    await sb.storage.emptyBucket(fakeBucket.id)
    const { error: deleteError } = await sb.storage.deleteBucket(fakeBucket.id)
    expect(deleteError).toBeNull()

    const { data: dataErr, error: downloadDeletedErr } = await sb.storage
      .from(fakeBucket.id)
      .download(fileName)
    expect(downloadDeletedErr).not.toBeNull()
    expect(dataErr).toBeNull()
  }
}

import { params, suite, test, timeout } from '@testdeck/jest'
import { faker } from '@faker-js/faker'
import { ContentType, Severity } from 'allure-js-commons'

import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js'

import { FEATURE } from '../types/enums'
import { attach, description, feature, log, severity, step } from '../.jest/jest-custom-reporter'
import { Hooks } from './hooks'

@suite('realtime')
@timeout(30000)
class Realtime extends Hooks {
  static sbClients: SupabaseClient<any, 'public', any>[] = []

  static async after(done: any) {
    log('removing channels')
    Realtime.sbClients.map(async (s) => await s.removeAllChannels())
    Realtime.sbClients = []
    log('hooks after')
    await Hooks.after(done)
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.BLOCKER)
  @description('When you call "on" table then connected realtime client should be returned')
  @test
  async 'connect to realtime'() {
    const { supabase } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    log('connecting to realtime')
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) =>
        console.log(payload)
      )
    channel.subscribe()

    expect(channel).toBeDefined()
    const err = await this.waitForChannelJoined(channel)
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(err).toBeNull()
    log('removing channel')
    const ok = await supabase.removeChannel(channel)
    expect(ok).toBe('ok')
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.BLOCKER)
  @description('When you subscrive to realtime, you have to receive updates')
  @timeout(60000)
  @test.skip
  async '[skip-local] receive event when connected to realtime'() {
    let res: any
    let t: NodeJS.Timeout
    const { supabase, user } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    let payloadReceived = (payload: any) => {
      attach('payload received', payload, ContentType.JSON)
      if (payload?.eventType !== 'INSERT') {
        return
      }
      clearTimeout(t)
      expect(payload.schema).toBe('public')
      expect(payload.table).toBe('profiles')
      expect(payload.new.id).toBe(user.id)
      expect(payload.new.username).toBe(user.username)
      expect(payload.old).toEqual({})
      expect(payload.error).toBeUndefined()
      res(null)
    }

    log('connecting to realtime')
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, payloadReceived)
    channel.subscribe()

    expect(channel).toBeDefined()
    await this.waitForChannelJoined(channel)
    // we should wait some time seconds to connect to database changes
    await new Promise((resolve) => setTimeout(resolve, 10000))

    const eventPromise = new Promise((resolve) => {
      res = resolve
      new Promise(() => {
        t = setTimeout(() => resolve(new Error('timeout')), 30000)
      })
    })
    await this.insertProfile(supabase, user, user)
    log('waiting for event')
    expect(await eventPromise).toBeNull()

    log('removing channel')
    const ok = await supabase.removeChannel(channel)
    expect(ok).toBe('ok')
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.NORMAL)
  @description('When you call "on" table but not subscribe then no events have to be returned')
  @test
  async 'you should get no events until subscribe'() {
    const { supabase, user } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    log('connecting to realtime')
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        console.log(payload)
        expect('event received').toBe('should not receive event')
      })

    expect(channel).toBeDefined()
    await this.insertProfile(supabase, user, user)

    // wait for 1 second to see if we receive any events
    log('waiting for event (should not receive any)')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(channel._isClosed).toBeTruthy()
    log('removing channel')
    const ok = await supabase.removeChannel(channel)
    expect(ok).toBe('ok')
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.BLOCKER)
  @description(
    'When you create 2 subs (1 subscribed and 1 not yet) then both should be returned on get subs'
  )
  @test
  async 'get supabase client subscriptions'() {
    const { supabase } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    log('creating two realtime channels')
    const channel1 = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        console.log(payload)
        expect('event received').toBe('should not receive event')
      })
    const channel2 = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        console.log(payload)
        expect('event received').toBe('should not receive event')
      })

    log('listing channels')
    const channels = supabase.getChannels()
    expect(channels).toEqual(expect.arrayContaining([channel1, channel2]))
    log('removing channels')
    supabase.removeAllChannels()
    expect(supabase.getChannels().length).toEqual(0)
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.NORMAL)
  @description('When you subscribe on table then corresponding events have to be returned')
  @params.skip({ event: 'INSERT', returnedTypes: ['insert'] })
  @params.skip({ event: 'UPDATE', returnedTypes: ['update'] })
  @params.skip({ event: 'DELETE', returnedTypes: ['delete'] })
  @params.skip({ event: '*', returnedTypes: ['insert', 'update', 'delete'] })
  async 'subscribe on table'() {
    // todo
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.NORMAL)
  @description(
    'When you create multiple subscriptions then corresponding events have to be returned'
  )
  @params.skip({
    events: [
      { event: 'INSERT', table: 'rt_table1' },
      { event: '*', table: 'rt_table1' },
    ],
    returnedIds: [[], []],
  })
  @params.skip({
    events: [
      { event: 'UPDATE', table: 'rt_table1' },
      { event: 'DELETE', table: 'rt_table1' },
    ],
    returnedIds: [[], []],
  })
  @params.skip({
    events: [
      { event: 'INSERT', table: 'rt_table1' },
      { event: 'INSERT', table: 'rt_table2' },
    ],
    returnedIds: [[], []],
  })
  async 'multiple subscriptions'() {
    // todo
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.NORMAL)
  @description('When you subscribe on table with RLS then corresponding events have to be returned')
  @params.skip({ event: 'INSERT', returnedTypes: ['insert'] })
  @params.skip({ event: 'UPDATE', returnedTypes: ['update'] })
  @params.skip({ event: 'DELETE', returnedTypes: ['delete'] })
  @params.skip({ event: '*', returnedTypes: ['insert', 'update', 'delete'] })
  async 'subscribe on table with RLS'() {
    // todo
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.CRITICAL)
  @description('When you subscribe on table with RLS then only allowed events have to be returned')
  @params.skip({ event: 'INSERT', returnedIds: [] })
  @params.skip({ event: 'UPDATE', returnedIds: [] })
  @params.skip({ event: 'DELETE', returnedIds: [] })
  @params.skip({ event: '*', returnedIds: [] })
  async 'subscribe on table with RLS policies'() {
    // todo
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.CRITICAL)
  @description(
    'When you subscribe on table with 2 clients then they have to receive different events'
  )
  @test.skip
  async 'subscribe from 2 clients'() {
    // todo
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.NORMAL)
  @description(
    'When you subscribe on table with RLS policies then service key subscription has to bypass RLS'
  )
  @params.skip({ event: 'INSERT', returnedTypes: ['insert'] })
  @params.skip({ event: 'UPDATE', returnedTypes: ['update'] })
  @params.skip({ event: 'DELETE', returnedTypes: ['delete'] })
  @params.skip({ event: '*', returnedTypes: ['insert', 'update', 'delete'] })
  async 'subscribe on RLS table with service key'() {
    // todo
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.CRITICAL)
  @description('When you unsubscribe from table then no events have to be returned')
  @test
  async 'unsubscribe from table'() {
    const { supabase, user } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    log('subscribe to realtime')
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        console.log(payload)
        expect('event received').toBe('should not receive event')
      })
    channel.subscribe()
    // wait for subscription to postgres
    log('waiting for subscription to postgres')
    await new Promise((resolve) => setTimeout(resolve, 8000))
    log('unsubscribe from realtime')
    const ok = await channel.unsubscribe()
    expect(ok).toEqual('ok')

    await this.insertProfile(supabase, user, user)

    // wait for 1 second to see if we receive any events
    log('waiting for 1 second to see if we receive any events')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(channel._isClosed).toBeTruthy()
    log('removing channels')
    await supabase.removeChannel(channel)
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.CRITICAL)
  @description('When you remove one subscription then only events from another have to be returned')
  @test
  async 'remove one subscription from client'() {
    const { supabase, user } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    log('subscribe to realtime')
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        console.log(payload)
        expect('event received').toBe('should not receive event')
      })
    channel.subscribe()
    // wait for subscription to postgres
    log('waiting for subscription to postgres')
    await new Promise((resolve) => setTimeout(resolve, 8000))
    log('unsubscribe from realtime')
    const ok = await supabase.removeChannel(channel)
    expect(ok).toEqual('ok')

    await this.insertProfile(supabase, user, user)

    // wait for 1 second to see if we receive any events
    log('waiting for 1 second to see if we receive any events')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(channel._isClosed).toBeTruthy()
  }

  @feature(FEATURE.REALTIME)
  @severity(Severity.CRITICAL)
  @description('When you remove all subscription then no events have to be returned')
  @test
  async 'remove all subscriptions from client'() {
    const { supabase, user } = await this.createSignedInSupaClient()
    Realtime.sbClients.push(supabase)

    log('subscribe to realtime')
    const channel = supabase
      .channel('profiles')
      .on('postgres_changes', { event: '*', schema: 'public' }, (payload: any) => {
        console.log(payload)
        expect('event received').toBe('should not receive event')
      })
    channel.subscribe()
    // wait for subscription to postgres
    log('waiting for subscription to postgres')
    await new Promise((resolve) => setTimeout(resolve, 8000))
    log('unsubscribe from realtime for all channels')
    const ok = await supabase.removeAllChannels()
    expect(ok).toEqual(expect.arrayContaining(['ok']))

    await this.insertProfile(supabase, user, user)

    // wait for 1 second to see if we receive any events
    log('waiting for 1 second to see if we receive any events')
    await new Promise((resolve) => setTimeout(resolve, 1000))
    expect(channel._isClosed).toBeTruthy()
  }

  @step('Wait until channel is joined')
  async waitForChannelJoined(channel: RealtimeChannel): Promise<Error> {
    for (let i = 0; i < 30; i++) {
      if (channel._isJoined()) {
        return null
      }
      if (channel._isLeaving()) {
        return new Error('Channel is leaving')
      }
      if (channel._isClosed()) {
        return new Error('Channel is closed')
      }
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
    return new Error("Channel didn't join in 3 seconds")
  }
}

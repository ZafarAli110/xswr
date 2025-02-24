import { lastOf } from "../libs/arrays";
import { Core, DEFAULT_COOLDOWN, DEFAULT_TIMEOUT, Fetcher, Scroller } from "./core";

export class Scroll {
  constructor(readonly core: Core) { }

  /**
   * 
   * @param key Key
   * @param scroller We don't care if it's not memoized
   * @param fetcher We don't care if it's not memoized
   * @param cooldown 
   * @returns 
   */
  async first<D = any, E = any, K = any>(
    skey: string | undefined,
    scroller: Scroller<D, K>,
    fetcher: Fetcher<D, K>,
    cooldown = DEFAULT_COOLDOWN,
    timeout = DEFAULT_TIMEOUT,
    aborter = new AbortController()
  ) {
    if (skey === undefined) return

    const current = this.core.get<D[], E>(skey)
    if (current?.aborter)
      return current
    if (this.core.cooldown(current, cooldown))
      return current

    const pages = current?.data ?? []
    const first = scroller(undefined)
    if (!first) return current

    const t = setTimeout(() => {
      aborter.abort("Timed out")
    }, timeout)

    try {
      const { signal } = aborter

      this.core.mutate(skey, { aborter })
      const { data, expiration } = await fetcher(first, { signal })

      return this.core.equals(data, pages[0])
        ? this.core.mutate<D[], E>(skey, { expiration })
        : this.core.mutate<D[], E>(skey, { data: [data], expiration })
    } catch (error: any) {
      return this.core.mutate<D[], E>(skey, { error })
    } finally {
      clearTimeout(t)
    }
  }

  /**
   * 
   * @param key 
   * @param scroller We don't care if it's not memoized
   * @param fetcher We don't care if it's not memoized
   * @param cooldown 
   * @returns 
   */
  async scroll<D = any, E = any, K = any>(
    skey: string | undefined,
    scroller: Scroller<D, K>,
    fetcher: Fetcher<D, K>,
    cooldown = DEFAULT_COOLDOWN,
    timeout = DEFAULT_TIMEOUT,
    aborter = new AbortController()
  ) {
    if (skey === undefined) return

    const current = this.core.get<D[], E>(skey)
    if (current?.aborter)
      return current
    if (this.core.cooldown(current, cooldown))
      return current
    const pages = current?.data ?? []
    const last = scroller(lastOf(pages))
    if (!last) return current

    const t = setTimeout(() => {
      aborter.abort("Timed out")
    }, timeout)

    try {
      const { signal } = aborter

      this.core.mutate(skey, { aborter })
      const { data } = await fetcher(last, { signal })
      return this.core.mutate<D[], E>(skey, { data: [...pages, data] })
    } catch (error: any) {
      return this.core.mutate<D[], E>(skey, { error })
    } finally {
      clearTimeout(t)
    }
  }
}
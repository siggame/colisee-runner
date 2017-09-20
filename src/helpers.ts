import "core-js/modules/es7.symbol.async-iterator";
import * as _ from "lodash";

interface IRetryOptions { attempts: number; timeout: number; }

/**
 * Retry fn using attempts as the maximum number of attempts using
 * timeout as the timeout between attempts. Throws an error when
 * maximum attempts have been reached.
 *
 * @export
 * @param {IRetryOptions} { attempts, timeout }
 * @param {(...args: any[]) => Promise<any>} fn
 * @param {...any[]} args
 * @returns {Promise<void>}
 */
export async function retry(
    { attempts, timeout }: IRetryOptions,
    fn: (...args: any[]) => Promise<any>,
    ...args: any[]): Promise<void> {
    for (let i = 0; i < attempts; i++) {
        const success = await fn(...args).then(() => true).catch(() => false);
        if (success) {
            return;
        } else {
            await delay(timeout);
        }
    }
    throw new Error(`Max attempts reached for request. (${attempts})`);
}

/**
 * Delay execution for ms milliseconds.
 *
 * @export
 * @param {number} ms
 */
export async function delay(ms: number) {
    await new Promise((res, rej) => setTimeout(res, ms));
}

/**
 * Helper for type problems on callbacks.
 *
 * @export
 * @template T
 * @returns {(first: T) => T}
 */
export function identity<T>(): (first: T) => T {
    return (first: T) => first;
}

/**
 * Assert that value is not undefined or null.
 *
 * @export
 * @template T
 * @param {(T | undefined | null)} value
 * @returns {value is T}
 */
export function not_nil<T>(value: T | undefined | null): value is T {
    return !_.isNil(value);
}

/**
 * Create an infinite stream.
 *
 * @export
 * @template T
 * @returns {AsyncIterableIterator<T>}
 */
export async function* infinite<T>(): AsyncIterableIterator<T> {
    while (true) { yield; }
}

/**
 * Create a stream of values that are the result of calling `fn` with `...args`.
 *
 * @export
 * @template T
 * @param {(...args: any[]) => Promise<T>} fn
 * @param {...any[]} args
 * @returns {AsyncIterableIterator<T>}
 */
export async function* generate<T>(fn: (...args: any[]) => Promise<T>, ...args: any[]): AsyncIterableIterator<T> {
    while (true) {
        yield await fn(...args);
    }
}

/**
 * Take n values generated from iter.
 *
 * @export
 * @template T
 * @param {number} n
 * @param {AsyncIterableIterator<T>} iter
 * @returns {AsyncIterableIterator<T>}
 */
export async function* take<T>(n: number, iter: AsyncIterableIterator<T>): AsyncIterableIterator<T> {
    for (let i = 0; i < n; i++) {
        yield (await iter.next()).value;
    }
    return;
}

/**
 * Transform a stream of T into a stream of U.
 *
 * @export
 * @template T
 * @template U
 * @param {AsyncIterableIterator<T>} iter
 * @param {(value: T) => Promise<U>} async_callback
 * @param {(error: any, value: T) => Promise<any>} error
 * @returns {AsyncIterableIterator<U>}
 */
export async function* map<T, U>(
    iter: AsyncIterableIterator<T>,
    async_callback: (value: T) => Promise<U>,
    error: (error: any, value: T) => Promise<any>,
): AsyncIterableIterator<U> {
    for await (const value of iter) {
        yield await async_callback(value)
            .catch((e) => error(e, value));
    }
}

/**
 * Asynchronously call async_callback on values generated
 * by iter and yield incoming values.
 *
 * @export
 * @template T
 * @param {AsyncIterableIterator<T>} iter
 * @param {(value: T) => Promise<T>} async_callback
 * @param {(error: any, value: T) => Promise<any>} error
 * @returns {AsyncIterableIterator<T>}
 */
export async function* async_foreach<T>(
    iter: AsyncIterableIterator<T>,
    async_callback: (value: T) => Promise<T>,
    error: (error: any, value: T) => Promise<any>,
): AsyncIterableIterator<T> {
    for await (const value of iter) {
        async_callback(value)
            .catch((e) => error(e, value));
        yield value;
    }
}

export async function* foreach<T>(
    iter: AsyncIterableIterator<T>,
    async_callback: (value: T) => Promise<T>,
    error: (error: any, value: T) => Promise<any>,
): AsyncIterableIterator<T> {
    for await (const value of iter) {
        await async_callback(value)
            .catch((e) => error(e, value));
        yield value;
    }
}

/**
 * Filter out values that do not satisfy the condition.
 *
 * @export
 * @template T
 * @template U
 * @param {AsyncIterableIterator<T>} iter
 * @param {(value: T) => value is U} condition
 * @returns {AsyncIterableIterator<U>}
 */
export async function* filter<T, U extends T>(
    iter: AsyncIterableIterator<T>,
    condition: (value: T) => value is U,
): AsyncIterableIterator<U> {
    for await (const value of iter) {
        if (condition(value)) {
            yield value;
        }
    }
}

export function coroutine<T, U, V extends IterableIterator<U> | AsyncIterableIterator<U>>(
    genFn: (...args: Array<any | T>) => V,
) {
    return (...args: Array<any | T>): V => {
        const generator = genFn(...args);
        generator.next();
        return generator;
    };
}

/**
 * Send the values generated from iter to sink so that the values
 * are consumed.
 *
 * @export
 * @template T
 * @template U
 * @param {(IterableIterator<T> | AsyncIterableIterator<T>)} iter
 * @param {(IterableIterator<U> | AsyncIterableIterator<U>)} sink
 * @returns {Promise<void>}
 */
export async function send<T, U>(
    iter: IterableIterator<T> | AsyncIterableIterator<T>,
    sink: IterableIterator<U> | AsyncIterableIterator<U>,
): Promise<void> {
    for await (const value of iter) {
        try {
            sink.next(value);
        } catch (e) {
            throw e;
        }
    }
}

export async function broadcast<T>(
    iter: AsyncIterableIterator<T>,
    ...sinks: Array<AsyncIterableIterator<any>>,
) {
    if (sinks.length < 1) { throw new TypeError("At least one sink is necessary"); }
    for await (const value of iter) {
        try {
            sinks.forEach(async (sink) => sink.next(value));
        } catch (e) {
            throw e;
        }
    }
}

/**
 * Create a consumer using fn by calling fn on the incoming value.
 *
 * @export
 * @template T
 * @template U
 * @param {(...args: Array<T>) => any} fn
 * @returns
 */
export function consumer<T, U>(fn: (...args: Array<T>) => any) {
    const consume = coroutine<T, U, AsyncIterableIterator<U>>(async function* (): AsyncIterableIterator<U> {
        while (true) {
            try {
                const [...args]: Array<T> = [await (yield)];
                fn(...args);
            } catch (e) {
                throw e;
            }
        }
    })();
    return consume;
}

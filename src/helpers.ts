import "core-js/modules/es7.symbol.async-iterator";
import * as _ from "lodash";
import { Socket } from "net";
import { RequestPromise } from "request-promise-native";

interface IRetryOptions { attempts: number; timeout: number; }

/**
 * Retry fn using attempts as the maximum number of attempts using
 * timeout as the timeout between attempts. Throws an error when
 * maximum attempts have been reached.
 *
 * @export
 */
export async function retry(
    { attempts, timeout }: IRetryOptions,
    fn: (...args: any[]) => Promise<any> | RequestPromise,
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

export function isPortReachable(host: string, port: number, timeout: number) {
    return new Promise((resolve => {
        const socket = new Socket();

        const onError = () => {
            socket.destroy();
            resolve();
        };

        socket.setTimeout(timeout);
        socket.on("error", onError);
        socket.on("timeout", onError);

        socket.connect(port, host, () => {
            socket.end();
            resolve();
        });
    }));
}
/**
 * Delay execution for ms milliseconds.
 *
 * @export
 */
export async function delay(ms: number) {
    await new Promise((res, rej) => setTimeout(res, ms));
}

/**
 * Helper for type problems on callbacks.
 *
 * @export
 */
export function identity<T>(): (first: T) => T {
    return (first: T) => first;
}

/**
 * Assert that value is not undefined or null.
 *
 * @export
 */
export function not_nil<T>(value: T | undefined | null): value is T {
    return !_.isNil(value);
}

/**
 * Create an infinite stream.
 *
 * @export
 */
export async function* infinite<T>(): AsyncIterableIterator<T> {
    while (true) { yield; }
}

/**
 * Create a stream of values that are the result of calling `fn` with `...args`.
 *
 * @export
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

/**
 * Synchronously call async_callback on values generated
 * by iter and yield incoming values.
 *
 * @export
 */
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

/**
 * Create and prepare consumer from given generator.
 *
 * @export
 */
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

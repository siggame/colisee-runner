import "core-js/modules/es7.symbol.async-iterator";
import * as _ from "lodash";

interface IRetryOptions { attempts: number; timeout: number; }

export async function retry(
    { attempts, timeout }: IRetryOptions,
    fn: (...args: any[]) => Promise<any>,
    ...args: any[]) {
    for (let i = 0; i < attempts; i++) {
        const { response, error }: { response?: any, error?: any } = await fn(...args)
            .then((res) => ({ response: res }))
            .catch((e) => ({ error: e }));
        if (response) {
            return;
        } else {
            await delay(timeout);
        }
    }
    throw new Error(`Max attempts reached for request. (${attempts})`);
}

export async function delay(ms: number) {
    await new Promise((res, rej) => setTimeout(res, ms));
}

export function identity<T>(): (first: T) => T {
    return (first: T) => first;
}

export function not_nil<T>(value: T | undefined | null): value is T {
    return !_.isNil(value);
}

export async function* infinite<T>(): AsyncIterableIterator<T> {
    while (true) { yield; }
}

export async function* generate<T>(fn: (...args: any[]) => Promise<T>, ...args: any[]) {
    while (true) {
        yield await fn(...args);
    }
}

export async function* take<T>(n: number, iter: AsyncIterableIterator<T>) {
    while (n-- > 0) {
        yield await iter.next();
    }
    return;
}

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

export function coroutine<T, U>(
    genFn: (...args: T[]) => AsyncIterableIterator<U>,
) {
    return (...args: T[]): AsyncIterableIterator<U> => {
        const generator = genFn(...args);
        generator.next();
        return generator;
    };
}

export async function send<T, U>(
    iter: AsyncIterableIterator<T>,
    consumer: AsyncIterableIterator<U>,
): Promise<void> {
    for await (const value of iter) {
        consumer.next(value);
    }
}

import * as request from "request-promise-native";

interface IRetryOptions { url: string; attempts: number; timeout: number; }

export async function retryRequest({ url, attempts, timeout }: IRetryOptions) {
    while (attempts-- > 0) {
        const { response, error }: { response?: any, error?: any } = await request.get(url)
            .then((res) => ({ response: res }))
            .catch((e) => ({ error: e }));
        if (response) {
            return;
        } else {
            await delay(timeout);
        }
    }
    throw new Error(`Max attempts reached for request to ${url}.`);
}

export async function delay(ms: number) {
    await new Promise((res, rej) => setTimeout(res, ms));
}

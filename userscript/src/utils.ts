/**
 * Wrapped console.log function.
 *
 * @export
 * @param {*} args
 */
export function log(...args: any[]) {
    console.log(
        "%cUserscript (React Mode):",
        "color: purple; font-weight: bold",
        ...args
    );
}

/**
 * Await a sequence of promises (functions that evaluate to a promise), but
 * limit the number of promises executed in parallel.
 */
export async function batchedPromises<T>(
    promises: (() => Promise<T>)[],
    batchSize: number
) {
    const ret = [];
    const remaining = [...promises];
    while (remaining.length > 0) {
        const batch = remaining.splice(0, batchSize);
        ret.push(...(await Promise.all(batch.map((f) => f()))));
    }
    return ret;
}

/**
 * Ensure `callback` is called every time window.location changes
 * Code derived from https://stackoverflow.com/questions/3522090/event-when-window-location-href-changes
 */
export function addLocationChangeCallback(callback: Function) {
    // Run the callback once right at the start
    window.setTimeout(callback, 0);

    // Set up a `MutationObserver` to watch for changes in the URL
    let oldHref = window.location.href;
    const body = document.querySelector("body");
    const observer = new MutationObserver((mutations) => {
        if (mutations.some(() => oldHref !== document.location.href)) {
            oldHref = document.location.href;
            callback();
        }
    });

    if (body) {
        observer.observe(body, { childList: true, subtree: true });
    }
    return observer;
}

export function getCSRFToken() {
    const csrfCookie = document.cookie
        .split(";")
        .find((v) => v.trim().startsWith("_csrf_token="));
    if (csrfCookie) {
        return decodeURIComponent(csrfCookie.trim().slice(12));
    }
}

/**
 * Awaits for an element with the specified `selector` to be found
 * and then returns the selected dom node.
 * This is used to delay rendering a widget until its parent appears.
 *
 * @export
 * @param {string} selector
 * @returns {DOMNode}
 */
export async function awaitElement(selector: string): Promise<Element> {
    const MAX_TRIES = 60;
    let tries = 0;
    return new Promise((resolve, reject) => {
        function probe() {
            tries++;
            return document.querySelector(selector);
        }

        function delayedProbe() {
            if (tries >= MAX_TRIES) {
                log("Can't find element with selector", selector);
                reject();
                return;
            }
            const elm = probe();
            if (elm) {
                resolve(elm);
                return;
            }

            window.setTimeout(delayedProbe, 250);
        }

        delayedProbe();
    });
}

/**
 * Run `fetch`, but in the local context of the webpage (i.e., not
 * from the extension's context).
 *
 * @export
 * @param {RequestInfo} info
 * @param {(RequestInit | undefined)} [init]
 */
export async function localFetch(
    info: RequestInfo,
    init?: RequestInit | undefined
): Promise<Response> {
    if (init == null) {
        return await (window as any).wrappedJSObject.eval(`
        (async function(){
            return await fetch(${JSON.stringify(info)})
        })()
    `);
    }

    init = { ...init };
    if (init.body && typeof init.body !== "string") {
        // Body cannot be URLSearchParams, so coerce it into a string
        init.body = "" + init.body;
    }

    // For some reason `await window.wrappedJSObject.fetch` won't work,
    // so we do an ugly eval instead.
    return await (window as any).wrappedJSObject.eval(`
        (async function(){
            return await fetch(${JSON.stringify(info)}, ${JSON.stringify(init)})
        })()
    `);
}

const threadsafePromiseData: { acquireLock: Promise<any> } = {
    acquireLock: Promise.resolve(),
};
/**
 * Wraps a promise to create a new promise; wrapped promises will
 * execute mutually exclusively (e.g., despite calling `Promise.all(...)`
 * on a set of wrapped promises, they will not execute in parallel.)
 */
export function makePromiseThreadsafe<A extends any[], B>(
    f: (...args: A) => Promise<B>
) {
    return async (...args: A) => {
        const lock = threadsafePromiseData.acquireLock;
        threadsafePromiseData.acquireLock = new Promise(
            async (resolve, reject) => {
                await lock;
                try {
                    resolve(await f(...args));
                } catch (e) {
                    reject(e);
                }
            }
        );
        return (await threadsafePromiseData.acquireLock) as B;
    };
}

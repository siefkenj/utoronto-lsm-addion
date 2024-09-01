import { log } from "../utils";

export interface ExtractedKeys {
    /**
     * These are the plugin keys used to authenticate various requests.
     */
    ajaxIdentifiers: {
        BLDG: string;
        ROOM: string;
        PLUGIN: string;
        P1_COURSE: string;
        P1_SESSION: string;
        P1_SUBJECT: string;
    };
    pFlowId: string;
    pFlowStepId: string;
    pInstance: string;
    pPageSubmissionId: string;
    pRequest: string;
    pReloadOnSubmit: string;
    pSalt: string;
    pPageItemsRowVersion: string;
    pPageItemsProtected: string;
    buildings: Record<string, string>;
    P1_DISPLAY_OBJ?: { n: "P1_DISPLAY"; v: string; ck: string };
}

/**
 * Given the html source for a page, extract session keys from the page.
 * The session keys are used to authenticate subsequent requests to the page.
 */
export function extractKeysFromLsmPage(html: string) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    // The value needed for the p_request variable is in the `ajaxIdentifier`
    // key of some auto-generated javascript. We need to extract it.
    const extractedJavascript =
        Array.from(doc.querySelectorAll("script:not([src])"))
            .map((x) => x.firstChild?.nodeValue || "")
            .filter((t) => t.match("ajaxIdentifier"))[0] || "";
    const ajaxIdentifiers = Object.fromEntries(
        extractedJavascript
            .split("\n")
            .filter((s) => s.match('{"') && s.match("ajaxIdentifier"))
            .map((s) => {
                const match = s.match(/"#(\w+)".*"ajaxIdentifier":"(.*?)"/);
                if (match) {
                    try {
                        // We're paring Javascript strings directly. They may include
                        // escaped unicode (e.g. "\u002C"). This escaped unicode should be processed.
                        return [match[1], JSON.parse(`"${match[2]}"`)];
                    } catch (e) {
                        return [match[1], match[2]];
                    }
                } else {
                    // The previous regex won't match the PLUGIN key, so we include a fallback
                    const match = s.match(/"ajaxIdentifier":"(.*?)"/);
                    if (match) {
                        try {
                            return ["PLUGIN", JSON.parse(`"${match[1]}"`)];
                        } catch (e) {
                            return ["PLUGIN", match[1]];
                        }
                    }
                }
                return ["", ""];
            })
    );

    const ret = {
        ajaxIdentifiers: {
            BLDG: "",
            ROOM: "",
            PLUGIN: "",
            P1_COURSE: "",
            P1_SESSON: "",
            P1_SUBJECT: "",
            ...ajaxIdentifiers,
        },
        buildings: {},
    };

    const additionalKeys = Object.fromEntries(
        Array.from(
            // relevant values from the page are loaded in hidden input elements
            // with ids like `pSalt` and `pInstance`
            doc.querySelectorAll("input[id^=p]") as NodeListOf<HTMLInputElement>
        ).map((elm) => {
            return [elm.id, elm.value];
        })
    );

    // Grab a list of all the buildings while we're at it
    const elm = doc.querySelector("#BLDG");
    if (elm) {
        const buildings = Object.fromEntries(
            Array.from(elm.querySelectorAll("option"))
                .map((e) => [e.value, e.textContent])
                .filter((x) => x[0] !== "")
        );
        Object.assign(ret, { buildings });
    }

    Object.assign(ret, additionalKeys);

    // When loading from https://lsm.utoronto.ca/webapp/f?p=210:1:::NO::: we have some
    // information stuffed away in inputs associated with the P1_DISPLAY key
    const displayInput = doc.querySelector(
        "input#P1_DISPLAY"
    ) as HTMLInputElement;
    if (displayInput) {
        const displayForInput = doc.querySelector(
            "input[data-for=P1_DISPLAY]"
        ) as HTMLInputElement;
        if (displayForInput) {
            (ret as any as ExtractedKeys).P1_DISPLAY_OBJ = {
                n: "P1_DISPLAY",
                v: displayInput.value,
                ck: displayForInput.value,
            };
        } else {
            log(
                "WARNING: couldn't find the associated display-for input for the P1_DISPLAY input"
            );
        }
    }

    return ret as any as ExtractedKeys;
}

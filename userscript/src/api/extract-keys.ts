import { log } from "../utils";

export interface ExtractedKeys {
    ajaxIdentifiers: { BLDG: string; ROOM: string; PLUGIN: string };
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
    const ajaxIdentifiers = extractedJavascript
        .split("\n")
        .filter((s) => s.match('{"'))
        .map((s) => {
            const match = s.match(/"ajaxIdentifier":"(.*?)"/);
            if (match) {
                return match[1];
            }
            return "";
        });
    if (ajaxIdentifiers.length !== 3 || ajaxIdentifiers.some((x) => x === "")) {
        // It turns out this function can be reused on multiple pages, so this error
        // isn't so useful.
        //log(
        //    "WARNING: expected three non-empty ajaxIdentifiers, but found",
        //    ajaxIdentifiers,
        //    "This could be an error with extracting the values from the page's Javascript"
        //);
    }

    const ret = {
        ajaxIdentifiers: {
            BLDG: ajaxIdentifiers[0] || "",
            ROOM: ajaxIdentifiers[1] || "",
            PLUGIN: ajaxIdentifiers[2] || "",
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
            (ret as ExtractedKeys).P1_DISPLAY_OBJ = {
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

    return ret as ExtractedKeys;
}

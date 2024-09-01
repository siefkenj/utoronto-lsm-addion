import React from "react";
import ReactDOM from "react-dom";
import App from "./App";
import "./index.css";
import { awaitElement, log, addLocationChangeCallback } from "./utils";
import { StoreProvider } from "easy-peasy";
import { store } from "./store/store";

log("React script has successfully started");

// Do required initial work. Gets called every time the URL changes,
// so that elements can be re-inserted as a user navigates a page with
// different routes.
async function main() {
    // Find <body/>. This can be any element. We wait until
    // the page has loaded enough for that element to exist.
    const body = await Promise.race([
        awaitElement(".t-NavigationBar"),
        awaitElement("header .header-container"),
    ]);
    let container: Element = document.createElement("li");
    container.classList.add("t-NavigationBar-item");

    if (globalThis.location.host.startsWith("ttb.")) {
        container = document.createElement("div");
        container.setAttribute("style", "display: flex; flex-direction: row; align-items: center;");
        const style = document.createElement("style");
        style.textContent = `
            .t-Button {
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                cursor: pointer;
                margin-left: 1rem;
            }
        `;
        document.head.appendChild(style);
    }

    body.prepend(container);
    ReactDOM.render(
        <StoreProvider store={store}>
            <App />
        </StoreProvider>,
        container
    );
}

// Call `main()` every time the page URL changes, including on first load.
addLocationChangeCallback(() => {
    // Greasemonkey doesn't bubble errors up to the main console,
    // so we have to catch them manually and log them
    main().catch((e) => {
        log(e);
    });
});

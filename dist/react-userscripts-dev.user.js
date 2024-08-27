// ==UserScript==
// @name     utoronto LSM Addon Dev
// @version  1.1
// @description Development mode for React Userscripts.
// @include https://lsm.utoronto.ca/*
// @grant    none
// ==/UserScript==


"use strict";

function log(...args) {
    console.log("Userscript:", ...args);
}

log("Dev mode started")

async function main() {
  const resp = await fetch("http://localhost:8124/react-userscripts.user.js")
  const script = await resp.text();
  log("Got Dev script")
  if (script.length === 0 || script.trim().startsWith("<")) {
    log("WARNING: dev script was empty")
  }
  eval(script)
  log("Dev script evaled")
  
}

// Make sure we run once at the start
main.bind({})().catch(e => {
    log("ERROR", e);
});
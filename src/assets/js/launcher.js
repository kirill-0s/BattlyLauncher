"use strict";

const fs = require("fs");
const { loadMinecraftJavaCore } = require('./assets/js/utils/library-loader');
const { ipcRenderer } = require("electron");
const { getValue, setValue } = require('./assets/js/utils/storage');
import { Alert } from "./utils/alert.js";

import { createPerformanceTimer } from "./utils/launcherLogger.js";

require('./assets/js/libs/errorReporter');

import {
  config,
  logger,
  changePanel,
  database,
  addAccount,
  accountSelect,
} from "./utils.js";

import { LoadAPI } from "./utils/loadAPI.js";

class Launcher {
  async init() {
    this.initTheme();
    const loadingText = document.getElementById("loading-text");
    loadingText.innerHTML = "Caricamento del pannello iniziale";
    this.initLog();
    console.log("🔄 Avvio del launcher...");

    const stringLoaderTimer = createPerformanceTimer("Inizializzazione del caricatore di stringhe");
    await window.ensureStringLoader?.();
    stringLoaderTimer.end();

    const apiTimer = createPerformanceTimer("Caricamento configurazione API");
    await new LoadAPI().GetConfig().then((config) => {
      apiTimer.end();
      console.info("Configurazione API caricata correttamente");
      return config;
    }).catch((error) => {
      console.error("Impossibile caricare la configurazione dell'API", { error: error.message });
    });

    console.info("Avvio dell'inizializzazione del launcher");

    if (process.platform == "win32") this.initFrame();

    const { config } = await import("./utils.js");

    const configTimer = createPerformanceTimer("Inizializzazione della configurazione");
    this.config = await new LoadAPI().GetConfig()
    configTimer.end();

    const newsTimer = createPerformanceTimer("Caricamento notizie");
    this.news = await config.GetNews();
    newsTimer.end();

    const dbTimer = createPerformanceTimer("Caricamento database");
    const { database } = await import("./utils.js");

    dbTimer.end();

    const dbInitTimer = createPerformanceTimer("Inizializzazione del database");
    this.database = await new database().init();
    dbInitTimer.end();

    const panelsTimer = createPerformanceTimer("Caricamento pannelli");
    const panelNames = [
      "login",
      "music",
      "home",
      "settings",
      "mods",
      "news",
      "friends",
      "chat",
      "servers",
      "mybattly",
    ];

    const panels = await Promise.all(panelNames.map(async (name, index) => {
      const panelTimer = createPerformanceTimer(`Pannello ${name}`);

      const loadingText = document.getElementById("loading-text");
      loadingText.innerHTML = `In carica ${name}`;

      try {
        const panel = await import(`./panels/${name}.js`);
        panelTimer.end({ panelName: name, index });
        console.debug(`Pannello ${name} caricato correttamente`, { index });
        return panel;
      } catch (error) {
        console.error(`Impossibile caricare il pannello ${name}`, {
          error: error.message,
          panelName: name,
          index
        });
        throw error;
      }
    }));
    panelsTimer.end({ totalPanels: panelNames.length });

    console.info("Avvio dell'inizializzazione dei pannelli");

    const createPanelsTimer = createPerformanceTimer("Creazione di pannelli");
    await this.createPanels(...panels.map((p, index) => ({ panel: p.default, index })));
    createPanelsTimer.end();

    const accountsTimer = createPerformanceTimer("Caricamento account");
    await this.getAccounts();
    console.timeEnd("🕐 getAccountsLauncher");

    console.time("🕐 DisableIframeLogsLauncher")
    await this.disableIframeLogs();
    console.timeEnd("🕐 DisableIframeLogsLauncher");
  }

  async initTheme() {
    let backgroundLoadingScreenColor = await getValue("background-loading-screen-color");
    if (backgroundLoadingScreenColor) {
      document.querySelectorAll(".diamond").forEach(rect => rect.style.backgroundColor = backgroundLoadingScreenColor);
    }
  }

  initLog() {
    document.querySelector(".preload-content").style.display = "block";
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey && e.shiftKey && e.keyCode == 73) || e.keyCode == 123) {
        ipcRenderer.send("main-window-dev-tools");

        console.adv([
          "%cASPETTARE!",
          "color: #3e8ed0; font-size: 70px; font-weight: bold; font-family: 'Poppins'; text-shadow: 0 0 5px #000;",
        ]);
        console.adv([
          "%cNon fare nulla qui se non sai cosa stai facendo!",
          "color: #3e8ed0; font-size: 18px; font-weight: bold; font-family: 'Poppins';",
        ]);
        console.adv([
          "%cInoltre, non incollare qui nulla proveniente da una fonte esterna: c’è una probabilità del 101% che si tratti di un virus!",
          "color: red; font-size: 15px; font-weight: bold; font-family: 'Poppins';",
        ]);

        setTimeout(() => {
          console.adv([
            "%cASPETTARE!",
            "color: #3e8ed0; font-size: 70px; font-weight: bold; font-family: 'Poppins'; text-shadow: 0 0 5px #000;",
          ]);
          console.adv([
            "%cNon fare nulla qui se non sai cosa stai facendo!",
            "color: #3e8ed0; font-size: 18px; font-weight: bold; font-family: 'Poppins';",
          ]);
          console.adv([
            "%cInoltre, non incollare qui nulla proveniente da una fonte esterna: c’è una probabilità del 101% che si tratti di un virus!",
            "color: red; font-size: 15px; font-weight: bold; font-family: 'Poppins';",
          ]);
        }, 1000);

        setTimeout(() => {
          console.adv([
            "%cASPETTARE!",
            "color: #3e8ed0; font-size: 70px; font-weight: bold; font-family: 'Poppins'; text-shadow: 0 0 5px #000;",
          ]);
          console.adv([
            "%cNon fare nulla qui se non sai cosa stai facendo!",
            "color: #3e8ed0; font-size: 18px; font-weight: bold; font-family: 'Poppins';",
          ]);
          console.adv([
            "%cInoltre, non incollare qui nulla proveniente da una fonte esterna: c’è una probabilità del 101% che si tratti di un virus!",
            "color: red; font-size: 15px; font-weight: bold; font-family: 'Poppins';",
          ]);
        }, 1500);
      }
    });
    new logger("Launcher", "#3e8ed0");
  }

  initFrame() {
    const loadingText = document.getElementById("loading-text");
    loadingText.innerHTML = "Caricamento pannelli";
    document.querySelector(".preload-content").style.display = "block";
    console.log("🔄 Fotogramma iniziale...");
    document.querySelector(".titlebar").classList.toggle("hide");
    document.querySelector(".dragbar").classList.toggle("hide");

    document.querySelector("#minimize").addEventListener("click", () => {
      ipcRenderer.send("main-window-minimize");
    });

    let maximized = false;
    let maximize = document.querySelector("#maximize");
    maximize.addEventListener("click", () => {
      if (maximized) ipcRenderer.send("main-window-maximize");
      else ipcRenderer.send("main-window-maximize");
      maximized = !maximized;
      maximize.classList.toggle("icon-maximize");
      maximize.classList.toggle("icon-restore-down");
    });

    document.querySelector("#close").addEventListener("click", () => {
      ipcRenderer.send("main-window-close");
    });
  }

  async createPanels(...panels) {
    document.querySelector(".preload-content").style.display = "";
    let panelsElem = document.querySelector(".panels");

    console.time("🕐 Pannelli di carico");

    const panelPromises = panels.map(async ({ panel }) => {
      console.log(`🔄 Pannello di avvio per ${panel.name}...`);

      let div = document.createElement("div");
      div.classList.add("panel", panel.id);

      const content = await fs.promises.readFile(`${__dirname}/panels/${panel.id}.html`, "utf8");

      div.innerHTML = content;
      panelsElem.appendChild(div);

      new panel().init(this.config, this.news);
    });

    await Promise.all(panelPromises);

    console.timeEnd("🕐 Pannelli di carico");
  }

  async getAccounts() {
    const loadingText = document.getElementById("loading-text");
    const preload = document.querySelector(".preload-content");
    const showPreload = (msg) => { loadingText.textContent = msg; preload.style.display = "block"; };
    const hidePreload = () => { preload.style.display = "none"; };

    showPreload("Caricamento account…");

    const accounts = await this.database.getAccounts();
    const selectedAccount = await this.database.getSelectedAccount();

    if (!accounts?.length) {
      changePanel("login");
      hidePreload();
      return;
    }

    console.log(`🔄 Di partenza ${accounts.length} account…`);

    const processAccount = async (acc) => {
      if (!acc?.meta) return;
      try {
        if (acc.type === "microsoft") {
          console.log(`🔄 Autenticazione Microsoft (Xbox) – ${acc.name}`);
          showPreload("Autenticazione dell'account Microsoft…");
          console.log(this.config.client_id);

          // Cargar dinámicamente minecraft-java-core
          const minecraftLib = await loadMinecraftJavaCore(this.config);
          const { Microsoft } = minecraftLib;
          const refresh = await new Microsoft(this.config.client_id).refresh(acc);

          console.log(`🔄 Account Microsoft aggiornato – ${acc.name}`);
          console.log(refresh);
          if (refresh?.error) throw new Error(refresh.errorMessage);

          const updatedAccount = {
            type: "microsoft",
            access_token: refresh.access_token,
            client_token: refresh.client_token,
            uuid: refresh.uuid,
            name: refresh.name,
            refresh_token: refresh.refresh_token,
            user_properties: refresh.user_properties,
            meta: { type: refresh.meta.type, xuid: refresh.meta.xuid, demo: refresh.meta.demo }
          };
          const updatedProfile = {
            uuid: refresh.uuid,
            skins: refresh.profile?.skins ?? [],
            capes: refresh.profile?.capes ?? []
          };

          await this.database.updateAccount(acc.uuid, updatedAccount);

          addAccount(updatedAccount, false, true);
          if (refresh.uuid === selectedAccount?.uuid) accountSelect(refresh.uuid);
        } else if (acc.type === "battly") {
          console.log(`🔄 Autenticazione di Battly – ${acc.name}`);
          try {
            const res = await fetch("https://battlylauncher.com/api/launcher/hello", {
              headers: { Authorization: `Bearer ${acc.token}` }
            });
            const data = await res.json();
            if (data.status !== 200) {
              throw new Error(`L'API di Battly ha restituito ${data.status}`);
            }

            const updatedAccount = {
              type: "battly",
              uuid: data.data.uuid,
              name: data.data.username,
              token: acc.token,
              access_token: "1234",
              client_token: "1234",
              user_properties: "{}",
              premium: data.data.premium,
              skins: data.data.skins,
              connections: data.data.connections,
              meta: { type: "battly", offline: true }
            };

            await this.database.updateAccount(acc.uuid, updatedAccount);
            showPreload(`Aggiornamento del profilo per ${updatedAccount.name}…`);
            addAccount(updatedAccount, data.data.premium, false);

            if (updatedAccount.uuid === selectedAccount?.uuid) {
              accountSelect(updatedAccount.uuid);
            }
          } catch (err) {
            throw new Error(`Errore durante l'autenticazione con Battly: ${err.message ?? err}`);
          }
        }
      } catch (err) {
        console.error(`[Cuenta] ${acc.uuid}: ${err.message ?? err}`);
        await this.database.deleteAccount(acc.uuid);
        if (acc.uuid === selectedAccount?.uuid) {
          console.warn(`Account selezionato eliminato: ${acc.uuid}`);
          await this.database.removeAccount();
          const accounts = await this.database.getAccounts();
          if (accounts.length > 0) {
            const firstUuid = accounts[0].uuid;
            await this.database.selectAccount(firstUuid);

            if (!document.getElementById(firstUuid)) {
              let theresAccount = false;
              setInterval(() => {
                if (theresAccount) return;
                const accountElem = document.getElementById(firstUuid);
                if (accountElem) {
                  accountSelect(firstUuid);
                  theresAccount = true;

                  new Alert().ShowAlert({
                    title: "Account eliminato",
                    text: `Account ${acc.name} è stato eliminato. L'account è stato selezionato. ${accounts[0].name} automaticamente.`,
                    type: "info",
                  });
                }
              }, 1000);
            }
          } else {
            console.warn("Nessun account disponibile; passaggio al pannello di accesso.");
            changePanel("login");
          }
        }
      }
    };

    await Promise.allSettled(accounts.map(processAccount));

    const stillSelected = await this.database.getSelectedAccount();
    if (!stillSelected) {
      const firstUuid = (await this.database.getAccounts())[0]?.uuid;
      if (firstUuid) {
        await this.database.selectAccount(firstUuid);
        accountSelect(firstUuid);
      }
    }

    if ((await this.database.getAccounts()).length === 0) {
      changePanel("login");
      hidePreload();
      return;
    }

    hidePreload();
    changePanel("home");
  }

  async disableIframeLogs() {
    const iframes = Array.from(document.getElementsByTagName('iframe'));
    for (const iframe of iframes) {
      iframe.addEventListener("load", () => {
        try {
          iframe.contentWindow.console.error = () => { };
        } catch (e) {

        }
      });
    }
  }

}

new Launcher().init();

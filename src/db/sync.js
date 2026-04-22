import PouchDB from "pouchdb/dist/pouchdb.js"
import { getDB, resetLocalDB } from "./couch"


const VITE_POUCHDB_ROOT_URL = import.meta.env.VITE_POUCHDB_ROOT_URL;
const VITE_AUTH_STRING = import.meta.env.VITE_AUTH_STRING;

let syncHandler = null

// db/sync.js
export async function startSync({ id, dbName }) {
  const localDB = getDB(id);

  if (syncHandler) return syncHandler;

  const authString = btoa(VITE_AUTH_STRING);

  const remoteDB = new PouchDB( `${VITE_POUCHDB_ROOT_URL}/${dbName}`,
    {
      skip_setup: true,
      fetch: (url, opts) => {
        opts.headers.set("Authorization", `Basic ${authString}`);
        return PouchDB.fetch(url, opts);
      }
    }
  );

  try {
    // 🔥 1. INITIAL PULL (VERY IMPORTANT)
    await localDB.replicate.from(remoteDB);

    // 🔥 2. LIVE SYNC
    syncHandler = localDB.sync(remoteDB, {
      live: true,
      retry: true,
    })
      .on("change", (info) => console.log("🔄 Sync success:", info))
      .on("error", (err) => console.error("❌ Sync error:", err));

    return syncHandler;

  } catch (err) {
    console.warning("❌ Sync init failed:", err);
  }
}

export function stopSync() {
  if (syncHandler) {
    syncHandler.cancel()
    syncHandler = null
  }
  resetLocalDB()
}

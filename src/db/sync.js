
import PouchDB from "pouchdb/dist/pouchdb.js"
import { getDB, resetLocalDB } from "./couch"

let syncHandler = null

// db/sync.js
export async function startSync({ username, token, dbName }) {
  const localDB = getDB(username);
  if (syncHandler) return syncHandler;

  // 1. Create the Auth String (admin:x1root99 encoded)
  // 'YWRtaW46eDFyb290OTk=' is the base64 of 'admin:x1root99'
  const authString = btoa("admin:x1root99"); 

  const remoteDB = new PouchDB(`https://ds1.d3.net/couchdb/${dbName}`, {
    skip_setup: true,
    fetch: function (url, opts) {
      // 2. Use Basic Auth instead of Bearer
      opts.headers.set('Authorization', `Basic ${authString}`);
      return PouchDB.fetch(url, opts);
    }
  });

  syncHandler = localDB.sync(remoteDB, {
    live: true,
    retry: true,
  })
  .on("change", (info) => console.log("🔄 Sync success:", info))
  .on("error", (err) => console.error("❌ Sync error:", err));

  return syncHandler;
}

export function stopSync() {
  if (syncHandler) {
    syncHandler.cancel()
    syncHandler = null
  }
  resetLocalDB()
}

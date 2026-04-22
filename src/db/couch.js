import PouchDB from "pouchdb/dist/pouchdb.js"

let db = null


export function getDB(userId) {
  // if (!userId) {
  //   console.warning("❌ userId is required to initialize PouchDB");
  // }

  if (!db) {
    db = new PouchDB(`teamstar_local_${userId}`);
  }

  return db;
}

export function resetLocalDB() {
  db = null
}
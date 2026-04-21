import PouchDB from "pouchdb/dist/pouchdb.js"

let db = null


export function getDB(username) {
  // If no database exists, or the user changed, create a new instance
  if (!db && username) {
    db = new PouchDB(`teamstar_local_${username}`); 
  }
  return db
}

export function resetLocalDB() {
  db = null
}
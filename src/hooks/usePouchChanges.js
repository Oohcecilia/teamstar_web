import { useEffect } from 'react';
import { getDB } from '@/db/couch';

/**
 * A reusable hook to listen for PouchDB changes.
 * @param {Object} user - The current user object (must contain username).
 * @param {Function} onUpdate - The function to run when a change occurs (e.g., loadData).
 * @param {String} docType - (Optional) Filter changes by document type.
 */
export function usePouchChanges(user, onUpdate, docType = null) {
  useEffect(() => {
    if (!user?.username || !onUpdate) return;

    const db = getDB(user.username);
    if (!db) return;

    const options = {
      since: 'now',
      live: true,
      include_docs: true,
    };

    // Apply filter if docType is provided
    if (docType) {
      options.filter = (doc) => doc.type === docType;
    }

    const changes = db.changes(options)
      .on('change', (info) => {
        console.log(`🔔 DB Change detected [${docType || 'all'}]:`, info.id);
        onUpdate();
      })
      .on('error', (err) => {
        console.error("❌ PouchDB Changes Error:", err);
      });

    // Cleanup: Stop listening when the component unmounts
    return () => {
      if (changes) {
        changes.cancel();
      }
    };
  }, [user?.username, onUpdate, docType]);
}
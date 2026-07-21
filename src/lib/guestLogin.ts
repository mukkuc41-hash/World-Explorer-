import { db } from './firebase';
import { 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc,
  increment
} from 'firebase/firestore';

// ==========================================
// GUEST LOGIN LOGIC WITH PREVIOUS CLEANUP
// ==========================================

/**
 * Logs in the user as a unique, persistent guest.
 * 
 * 1. Checks if there is a pre-existing guest ID in localStorage. If found, it deletes
 *    the old guest record from Firestore (`guests/{oldGuestId}`) to avoid leaving orphaned documents.
 * 2. Increments a global "guestCounter" in Firestore to get a unique sequential index.
 * 3. Generates a random 10-digit identifier.
 * 4. Constructs a unique guest ID: `${index}_guest${random10DigitNumber}`.
 * 5. Persists this guest ID to localStorage immediately for session recovery across refreshes.
 * 
 * @returns {Promise<string>} The generated unique, persistent guestId.
 */
export async function loginAsGuest(): Promise<string> {
  try {
    // 1. Identify and delete any previous guest session to keep Firestore database clean
    const previousGuestId = localStorage.getItem('world_explorer_guest_id');
    if (previousGuestId) {
      console.log(`[Guest Cleanup] Found previous guest session: ${previousGuestId}. Deleting old account record from Firestore...`);
      try {
        const previousGuestRef = doc(db, 'guests', previousGuestId);
        await deleteDoc(previousGuestRef);
        console.log(`[Guest Cleanup] Previous guest account document successfully removed: ${previousGuestId}`);
      } catch (cleanupError) {
        // Log warning but do not halt login flow if the previous doc cannot be deleted
        console.warn(`[Guest Cleanup Warning] Could not remove previous guest document from Firestore:`, cleanupError);
      }
    }

    // 2. Reference the stats/guestCounter document in Firestore
    const statsRef = doc(db, 'stats', 'guestCounter');

    // 3. Safely increment the global guest counter using Firestore's field increment operator.
    // If the document doesn't exist yet, { merge: true } creates it with count: 1.
    await setDoc(statsRef, { count: increment(1) }, { merge: true });

    // 4. Fetch the updated document to retrieve the newly incremented index
    const statsSnap = await getDoc(statsRef);
    if (!statsSnap.exists()) {
      throw new Error("Failed to retrieve guestCounter state from Firestore after increment.");
    }

    const index = statsSnap.data()?.count || 1;

    // 5. Generate a secure, 10-digit random number to guarantee high entropy and prevent collisions
    const random10DigitNumber = Math.floor(1000000000 + Math.random() * 9000000000).toString();

    // 6. Construct the final guestId format: guest_${index}_${random10DigitNumber}
    const guestId = `guest_${index}_${random10DigitNumber}`;

    // 7. Persist the guest session to localStorage immediately so the user remains logged in
    localStorage.setItem('world_explorer_guest_id', guestId);
    localStorage.setItem('world_explorer_guest_session_active', 'true');

    // 8. Initialize guest record in the `guests` collection
    const guestRef = doc(db, 'guests', guestId);
    await setDoc(guestRef, {
      guestId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      savedLocationsCount: 0
    }, { merge: true });

    console.log(`[Guest Login] Successfully authenticated unique guest: ${guestId}`);
    return guestId;
  } catch (error) {
    console.error("[Guest Login Error] Failed to complete guest authentication flow:", error);
    throw error;
  }
}

/**
 * Explicitly deletes the current guest account from Firestore and clears local browser storage.
 * Useful for logouts or reset scenarios.
 * 
 * @returns {Promise<void>}
 */
export async function deleteCurrentGuestAccount(): Promise<void> {
  try {
    const guestId = localStorage.getItem('world_explorer_guest_id');
    if (guestId) {
      console.log(`[Guest Cleanup] Deleting current guest account: ${guestId}`);
      
      // Delete from guests collection
      const guestRef = doc(db, 'guests', guestId);
      await deleteDoc(guestRef);

      // Delete from public_profiles collection
      const publicProfileRef = doc(db, 'public_profiles', guestId);
      await deleteDoc(publicProfileRef);

      // Delete from users collection
      const userRef = doc(db, 'users', guestId);
      await deleteDoc(userRef);

      console.log(`[Guest Cleanup] Current guest account and associated profiles successfully deleted from Firestore.`);
    }
  } catch (error) {
    console.error("[Guest Cleanup Error] Failed to delete guest account from Firestore:", error);
  } finally {
    // Always clear localStorage regardless of Firestore deletion success
    localStorage.removeItem('world_explorer_guest_id');
    localStorage.removeItem('world_explorer_guest_session_active');
    console.log(`[Guest Cleanup] Guest localStorage session cleared.`);
  }
}

/**
 * Writes or merges data into the Firestore document path guests/{guestId} for the current guest.
 * 
 * @param {any} data - The data object to be written/merged into Firestore.
 * @returns {Promise<void>}
 */
export async function saveGuestData(data: any): Promise<void> {
  try {
    // Retrieve the persistent guestId from localStorage
    const guestId = localStorage.getItem('world_explorer_guest_id');
    if (!guestId) {
      throw new Error("No active guest session found in browser localStorage.");
    }

    // Reference the isolated document under guests/{guestId}
    const guestDocRef = doc(db, 'guests', guestId);

    // Merge the new payload safely into the existing document
    await setDoc(guestDocRef, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    console.log(`[Guest Storage] Guest data successfully merged for: ${guestId}`);
  } catch (error) {
    console.error("[Guest Storage Error] Failed to write guest data:", error);
    throw error;
  }
}

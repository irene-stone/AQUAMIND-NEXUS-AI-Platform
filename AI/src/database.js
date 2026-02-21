import { db } from "./firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

// --- UNIFIED BILL CALCULATION (Matches WASAC official Tiers) ---
export const calculateWASACBill = (liters, accountType) => {
  const m3 = liters / 1000;
  let cost = 0;
  const fee = 850; // Fixed monthly charge

  if (accountType === 'Non-Residential') {
    if (m3 <= 50) cost = m3 * 1037.491;
    else cost = (50 * 1037.491) + ((m3 - 50) * 1058.785);
    return Math.round(cost);
  } else {
    // Residential Tiers
    if (m3 <= 5) cost = m3 * 340;
    else if (m3 <= 20) cost = (5 * 340) + ((m3 - 5) * 720);
    else cost = (5 * 340) + (15 * 720) + ((m3 - 20) * 845);
    
    // Total + Fixed Fee + 18% VAT
    return Math.round((cost + fee) * 1.18);
  }
};

export const getUserProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, "users", uid));
  return userDoc.exists() ? userDoc.data() : null;
};

export const createUserProfile = async (uid, data) => {
  await setDoc(doc(db, "users", uid), {
    uid: uid,
    email: data.email,
    displayName: data.displayName,
    district: data.district,
    accountType: data.accountType,
    ecoPoints: 0,
    waterGoal: 150,
    monthlyBudget: 5000,
    lastMeterReading: 0,
    history: [],
    createdAt: new Date().toISOString(),
  });
};

export const updateUserProfile = async (uid, updates) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, updates);
};
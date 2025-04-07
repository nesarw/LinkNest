const admin = require("firebase-admin");
const serviceAccount = require("./firebase-admin.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://console.firebase.google.com/u/0/project/chatapp-889cb/database/chatapp-889cb-default-rtdb/data/~2F",
});

const db = admin.firestore();

module.exports = db;

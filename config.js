/* RC-Craft config — បំពេញតម្លៃទាំងនេះមុន deploy (មើល README.md) */
window.RC_CONFIG = {
  // URL សាធារណៈរបស់គេហទំព័រ (គ្មាន / នៅចុង)។ ឧ. "https://rc-craft.com" ឬ "https://rarechicken0.github.io"
  siteUrl: "https://rarechicken0.github.io",

  // Email Google របស់ Owner (អ្នកដែលអាចបង្ហោះ/កែ/លុប Mod)។ ត្រូវដូចគ្នានឹងក្នុង firestore.rules និង storage.rules
  ownerEmails: ["redchicken010@gmail.com"],

  // Admin ដំបូង (ត្រូវបានបញ្ចូលក្នុងប្រព័ន្ធម្តងគត់ ពេល Owner ចូលគណនីលើកដំបូង)។ ក្រោយមក Owner គ្រប់គ្រងតាមប៊ូតុង “Admin” លើគេហទំព័រ។
  adminEmails: ["buntphon0@gmail.com", "rathachanna49@gmail.com"],

  // ចម្លងពី Firebase Console → Project settings → Your apps → Web app → SDK setup (Config)
  firebase: {
    apiKey: "AIzaSyDQJQN6a-BP9pibrvE7w52pcZcyZmH0CFs",
    authDomain: "rc-craft-77824.firebaseapp.com",
    projectId: "rc-craft-77824",
    storageBucket: "rc-craft-77824.firebasestorage.app",
    messagingSenderId: "494836286246",
    appId: "1:494836286246:web:4a0ba8fc3c831485f4f7e7"
  },

  // true = ផ្ទុករូបភាព Mod ទៅ Firebase Storage (ត្រូវការគម្រោង Blaze, មានកូតាឥតគិតថ្លៃ)។
  // false = រក្សារូបតូចៗក្នុង Firestore ផ្ទាល់ (ឥតគិតថ្លៃ តែរូបគុណភាពទាបជាង)។
  useStorage: false
};

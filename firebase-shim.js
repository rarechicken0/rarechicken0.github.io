/* Adapter: ផ្តល់ db / user / assets ដែលកូដ RC-Craft ត្រូវការ ដោយប្រើ Firebase */
(function () {
  "use strict";
  var cfg = window.RC_CONFIG || {};
  var fbc = cfg.firebase || {};
  var configured = !!fbc.apiKey && fbc.apiKey.indexOf("YOUR_") !== 0 && !!window.firebase;
  var owners = (cfg.ownerEmails || []).map(function (e) { return String(e).toLowerCase(); });
  var state = { auth: null, db: null, storage: null, fbUser: null };

  function authReady() {
    return new Promise(function (res) {
      var off = state.auth.onAuthStateChanged(function (u) { off(); res(u); });
    });
  }

  function makeUser() {
    return {
      isOwner: function () {
        var u = state.fbUser;
        return Promise.resolve(!!u && !!u.email && u.emailVerified && owners.indexOf(u.email.toLowerCase()) > -1);
      },
      me: function () {
        var u = state.fbUser;
        if (!u) return Promise.reject(new Error("signed out"));
        return Promise.resolve({ id: u.uid, name: u.displayName || (u.email || "").split("@")[0], avatarUrl: u.photoURL || "", email: (u.email || "").toLowerCase(), emailVerified: !!u.emailVerified });
      },
      can: function () { return Promise.resolve(!!state.fbUser); },
      profiles: function (ids) {
        var out = {};
        return Promise.all(ids.map(function (id) {
          return state.db.doc("profiles/" + id).get().then(function (s) {
            var d = s.exists ? s.data() : null;
            out[id] = { name: (d && d.name) || "អ្នកប្រើ", avatarUrl: (d && d.avatarUrl) || "" };
          }).catch(function () { out[id] = { name: "អ្នកប្រើ", avatarUrl: "" }; });
        })).then(function () { return out; });
      }
    };
  }

  function makeAssets() {
    if (!cfg.useStorage) return null;
    return {
      upload: function (blob, opts) {
        var id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
        var ref = state.storage.ref("mods/" + id + ".jpg");
        return ref.put(blob, { contentType: (opts && opts.type) || "image/jpeg" })
          .then(function () { return ref.getDownloadURL(); })
          .then(function (url) { return { url: url }; });
      }
    };
  }

  function saveProfile(u) {
    return state.db.doc("profiles/" + u.uid).set({
      name: u.displayName || (u.email || "").split("@")[0],
      avatarUrl: u.photoURL || ""
    }, { merge: true }).catch(function () {});
  }

  window.RCFirebase = {
    ready: function () {
      if (!configured) return Promise.resolve({ db: null, user: null, assets: null });
      if (!firebase.apps.length) firebase.initializeApp(fbc);
      state.auth = firebase.auth();
      state.db = firebase.firestore();
      state.storage = cfg.useStorage && firebase.storage ? firebase.storage() : null;
      return authReady().then(function (u) {
        state.fbUser = u;
        if (u) saveProfile(u);
        return { db: state.db, user: makeUser(), assets: makeAssets() };
      });
    },
    login: function () {
      var p = new firebase.auth.GoogleAuthProvider();
      return state.auth.signInWithPopup(p).then(function () { location.reload(); })
        .catch(function (e) { if (e && e.code !== "auth/popup-closed-by-user") alert("ចូលគណនីមិនបាន៖ " + (e.message || e.code)); });
    },
    logout: function () { return state.auth.signOut().then(function () { location.reload(); }); }
  };

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("#loginBtn")) window.RCFirebase.login();
    else if (e.target.closest && e.target.closest("#logoutBtn")) window.RCFirebase.logout();
  });
})();

// Entry point — polyfills MUST run before expo-router loads any Solana modules.
// Using require() (not import) to prevent ES module hoisting.
// NOTE: index.ts was deleted so Metro uses this file as the entry point.

// 1. Buffer polyfill (needed by @solana/web3.js, anchor, etc.)
var BufferModule = require("buffer");
global.Buffer = BufferModule.Buffer;
if (typeof globalThis !== "undefined") {
  globalThis.Buffer = BufferModule.Buffer;
}

// 2. crypto.getRandomValues polyfill
// uuid (used by @solana/web3.js) captures crypto.getRandomValues at module-load
// time, so this MUST be set before require("expo-router/entry") triggers module loading.
if (typeof global.crypto !== "object") {
  global.crypto = {};
}

if (typeof global.crypto.getRandomValues !== "function") {
  try {
    var ExpoCrypto = require("expo-crypto");
    if (typeof ExpoCrypto.getRandomValues === "function") {
      global.crypto.getRandomValues = function (array) {
        return ExpoCrypto.getRandomValues(array);
      };
    }
  } catch (_e) {
    // expo-crypto native module not available
  }
}

if (typeof global.crypto.getRandomValues !== "function") {
  try {
    require("react-native-get-random-values");
  } catch (_e) {
    // TurboModule not linked
  }
}

if (typeof global.crypto.getRandomValues !== "function") {
  // Math.random fallback — always works, sufficient for devnet
  global.crypto.getRandomValues = function (array) {
    for (var i = 0, r; i < array.length; i++) {
      if ((i & 0x03) === 0) r = Math.random() * 0x100000000;
      array[i] = (r >>> ((i & 0x03) << 3)) & 0xff;
    }
    return array;
  };
}

// Sync globalThis.crypto so bare `crypto` references resolve correctly
if (typeof globalThis !== "undefined") {
  globalThis.crypto = global.crypto;
}

// 3. Patch Uint8Array with Buffer read/write methods.
// @solana/web3.js returns account data as Uint8Array, but Anchor's buffer-layout
// calls Buffer methods like readUIntLE on it. Bridge the gap here.
if (typeof Uint8Array !== "undefined" && !Uint8Array.prototype.readUIntLE) {
  [
    "readUIntLE", "readUIntBE", "readUInt8", "readUInt16LE", "readUInt16BE",
    "readUInt32LE", "readUInt32BE", "readIntLE", "readIntBE", "readInt8",
    "readInt16LE", "readInt16BE", "readInt32LE", "readInt32BE",
    "readFloatLE", "readFloatBE", "readDoubleLE", "readDoubleBE",
    "readBigUInt64LE", "readBigInt64LE",
    "writeUIntLE", "writeUIntBE", "writeUInt8", "writeUInt16LE", "writeUInt16BE",
    "writeUInt32LE", "writeUInt32BE", "writeIntLE", "writeIntBE", "writeInt8",
    "writeInt16LE", "writeInt16BE", "writeInt32LE", "writeInt32BE",
    "writeFloatLE", "writeFloatBE", "writeDoubleLE", "writeDoubleBE",
  ].forEach(function (method) {
    if (typeof Buffer.prototype[method] === "function" && !Uint8Array.prototype[method]) {
      Uint8Array.prototype[method] = function () {
        var buf = Buffer.from(this.buffer, this.byteOffset, this.byteLength);
        return buf[method].apply(buf, arguments);
      };
    }
  });
}

// 4. Load the app (this triggers all module loading including @solana/web3.js, uuid, etc.)
require("expo-router/entry");

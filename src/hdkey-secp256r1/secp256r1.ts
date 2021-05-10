import BN from 'bn.js';
//import { createHash } from 'crypto';
import { createHash } from 'crypto-browserify';
import * as elliptic from 'elliptic';

import * as messages from './messages.json';

var ec = new elliptic.ec('p256');
var ecparams = ec.curve;

function loadPublicKey(publicKey: Buffer) {
  return ec.keyFromPublic(publicKey);
}

export function privateKeyVerify(privateKey: Buffer) {
  var bn = new BN(privateKey);
  return bn.cmp(ecparams.n) < 0 && !bn.isZero();
}

export function privateKeyExport(privateKey: Buffer, compressed: boolean) {
  var d = new BN(privateKey);
  if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages.EC_PRIVATE_KEY_EXPORT_DER_FAIL);

  return Buffer.from(ec.keyFromPrivate(privateKey).getPublic(compressed, 'true'));
}

export function privateKeyNegate(privateKey: Buffer) {
  var bn = new BN(privateKey);
  return bn.isZero()
    ? Buffer.alloc(32)
    : ecparams.n
        .sub(bn)
        .umod(ecparams.n)
        .toArrayLike(Buffer, 'be', 32);
}

export function privateKeyModInverse(privateKey: Buffer) {
  var bn = new BN(privateKey);
  if (bn.cmp(ecparams.n) >= 0 || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_RANGE_INVALID);

  return bn.invm(ecparams.n).toArrayLike(Buffer, 'be', 32);
}

export function privateKeyTweakAdd(privateKey: Buffer, tweak: Buffer) {
  var bn = new BN(tweak);
  if (bn.cmp(ecparams.n) >= 0) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL);

  bn.iadd(new BN(privateKey));
  if (bn.cmp(ecparams.n) >= 0) bn.isub(ecparams.n);
  if (bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_ADD_FAIL);

  return bn.toArrayLike(Buffer, 'be', 32);
}

export function privateKeyTweakMul(privateKey: Buffer, tweak: Buffer) {
  var bn = new BN(tweak);
  if (bn.cmp(ecparams.n) >= 0 || bn.isZero()) throw new Error(messages.EC_PRIVATE_KEY_TWEAK_MUL_FAIL);

  bn.imul(new BN(privateKey));
  if (bn.cmp(ecparams.n)) bn = bn.umod(ecparams.n);

  return bn.toArrayLike(Buffer, 'be', 32);
}

export function publicKeyCreate(privateKey: Buffer, compressed: boolean) {
  var d = new BN(privateKey);
  if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages.EC_PUBLIC_KEY_CREATE_FAIL);

  return Buffer.from(ec.keyFromPrivate(privateKey).getPublic(compressed, 'true'));
}

export function publicKeyConvert(publicKey: Buffer, compressed: boolean) {
  var pair = loadPublicKey(publicKey);
  if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

  return Buffer.from(pair.getPublic(compressed, 'true'));
}

export function publicKeyVerify(publicKey: Buffer) {
  return loadPublicKey(publicKey) !== null;
}

export function publicKeyTweakAdd(publicKey: Buffer, tweak: Buffer | BN, compressed: boolean) {
  var pair = loadPublicKey(publicKey);
  if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

  tweak = new BN(tweak);
  if (tweak.cmp(ecparams.n) >= 0) throw new Error(messages.EC_PUBLIC_KEY_TWEAK_ADD_FAIL);

  return Buffer.from(
    ecparams.g
      .mul(tweak)
      .add(pair.getPublic())
      .encode(true, compressed)
  );
}

export function publicKeyTweakMul(publicKey: Buffer, tweak: Buffer | BN, compressed: boolean) {
  var pair = loadPublicKey(publicKey);
  if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

  tweak = new BN(tweak);
  if (tweak.cmp(ecparams.n) >= 0 || tweak.isZero()) throw new Error(messages.EC_PUBLIC_KEY_TWEAK_MUL_FAIL);

  return Buffer.from(
    pair
      .getPublic()
      .mul(tweak)
      .encode(true, compressed)
  );
}

export function publicKeyCombine(publicKeys: Buffer[], compressed: boolean) {
  var pairs = new Array(publicKeys.length);
  for (var i = 0; i < publicKeys.length; ++i) {
    pairs[i] = loadPublicKey(publicKeys[i]);
    if (pairs[i] === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);
  }

  var point = pairs[0].pub;
  for (var j = 1; j < pairs.length; ++j) point = point.add(pairs[j].pub);
  if (point.isInfinity()) throw new Error(messages.EC_PUBLIC_KEY_COMBINE_FAIL);

  return Buffer.from(point.encode(true, compressed));
}

export function signatureNormalize(signature: Buffer) {
  var r = new BN(signature.slice(0, 32));
  var s = new BN(signature.slice(32, 64));
  if (r.cmp(ecparams.n) >= 0 || s.cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);

  var result = Buffer.from(signature);
  if (s.cmp(ec.nh) === 1)
    ecparams.n
      .sub(s)
      .toArrayLike(Buffer, 'be', 32)
      .copy(result, 32);

  return result;
}

export function signatureExport(signature: Buffer) {
  var r = signature.slice(0, 32);
  var s = signature.slice(32, 64);
  if (new BN(r).cmp(ecparams.n) >= 0 || new BN(s).cmp(ecparams.n) >= 0)
    throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);

  return { r: r, s: s };
}

export function signatureImport(sigObj: any) {
  var r = new BN(sigObj.r);
  if (r.cmp(ecparams.n) >= 0) r = new BN(0);

  var s = new BN(sigObj.s);
  if (s.cmp(ecparams.n) >= 0) s = new BN(0);

  return Buffer.concat([r.toArrayLike(Buffer, 'be', 32), s.toArrayLike(Buffer, 'be', 32)]);
}

export function sign(message: Buffer, privateKey: Buffer, noncefn?: any, data?: any) {
  if (typeof noncefn === 'function') {
    var getNonce = noncefn;
    noncefn = function(counter: any) {
      var nonce = getNonce(message, privateKey, null, data, counter);
      if (!Buffer.isBuffer(nonce) || nonce.length !== 32) throw new Error(messages.ECDSA_SIGN_FAIL);

      return new BN(nonce);
    };
  }

  var d = new BN(privateKey);
  if (d.cmp(ecparams.n) >= 0 || d.isZero()) throw new Error(messages.ECDSA_SIGN_FAIL);

  var result = ec.sign(message, privateKey, { canonical: true, k: noncefn, pers: data });
  return {
    signature: Buffer.concat([result.r.toArrayLike(Buffer, 'be', 32), result.s.toArrayLike(Buffer, 'be', 32)]),
    recovery: result.recoveryParam
  };
}

export function verify(message: Buffer, signature: Buffer, publicKey: Buffer) {
  if (message.length % 2 !== 0) {
    throw new Error('Wrong message length');
  }

  var sigObj = { r: signature.slice(0, 32), s: signature.slice(32, 64) };

  var sigr = new BN(sigObj.r);
  var sigs = new BN(sigObj.s);
  if (sigr.cmp(ecparams.n) >= 0 || sigs.cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);
  if (sigs.cmp(ec.nh) === 1 || sigr.isZero() || sigs.isZero()) return false;

  var pair = loadPublicKey(publicKey);
  if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

  return ec.verify(message, sigObj as any, { x: pair.getPublic().x, y: pair.getPublic().y } as any);
}

export function recover(message: Buffer, signature: Buffer, recovery: number, compressed: boolean) {
  var sigObj = { r: signature.slice(0, 32), s: signature.slice(32, 64) };

  var sigr = new BN(sigObj.r);
  var sigs = new BN(sigObj.s);
  if (sigr.cmp(ecparams.n) >= 0 || sigs.cmp(ecparams.n) >= 0) throw new Error(messages.ECDSA_SIGNATURE_PARSE_FAIL);

  try {
    if (sigr.isZero() || sigs.isZero()) throw new Error();

    var point = ec.recoverPubKey(message, sigObj as any, recovery);
    return Buffer.from(point.encode(true, compressed));
  } catch (err) {
    throw new Error(messages.ECDSA_RECOVER_FAIL);
  }
}

export function ecdh(publicKey: Buffer, privateKey: Buffer) {
  var shared = exports.ecdhUnsafe(publicKey, privateKey, true);
  return createHash('sha256')
    .update(shared)
    .digest();
}

export function ecdhUnsafe(publicKey: Buffer, privateKey: Buffer, compressed: boolean) {
  var pair = loadPublicKey(publicKey);
  if (pair === null) throw new Error(messages.EC_PUBLIC_KEY_PARSE_FAIL);

  var scalar = new BN(privateKey);
  if (scalar.cmp(ecparams.n) >= 0 || scalar.isZero()) throw new Error(messages.ECDH_FAIL);

  return Buffer.from(
    pair
      .getPublic()
      .mul(scalar)
      .encode(true, compressed)
  );
}
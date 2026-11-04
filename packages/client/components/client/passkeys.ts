export type PublicKeyOptionsJSON = {
  challenge: string;
  user?: { id: string; [key: string]: unknown };
  allowCredentials?: Array<{ id: string; [key: string]: unknown }>;
  excludeCredentials?: Array<{ id: string; [key: string]: unknown }>;
  [key: string]: unknown;
};

function decodeBase64Url(value: string): Uint8Array {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
}

function encodeBase64Url(value: ArrayBuffer): string {
  const bytes = new Uint8Array(value);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toBrowserOptions(options: PublicKeyOptionsJSON): PublicKeyCredentialRequestOptions {
  return {
    ...options,
    challenge: decodeBase64Url(options.challenge),
    allowCredentials: options.allowCredentials?.map((credential) => ({
      ...credential,
      id: decodeBase64Url(credential.id),
    })),
  } as PublicKeyCredentialRequestOptions;
}

export async function createPasskeyCredential(
  options: PublicKeyOptionsJSON,
): Promise<Record<string, unknown>> {
  if (!options.user) throw new Error("Passkey registration options are incomplete.");
  const credential = await navigator.credentials.create({
    publicKey: {
      ...options,
      challenge: decodeBase64Url(options.challenge),
      user: { ...options.user, id: decodeBase64Url(options.user.id) },
      excludeCredentials: options.excludeCredentials?.map((item) => ({
        ...item,
        id: decodeBase64Url(item.id),
      })),
    } as PublicKeyCredentialCreationOptions,
  });
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Your browser did not return a passkey.");
  }
  const response = credential.response;
  const payload: Record<string, unknown> = {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
    },
  };
  if (response instanceof AuthenticatorAttestationResponse) {
    Object.assign(payload.response as object, {
      attestationObject: encodeBase64Url(response.attestationObject),
      transports: response.getTransports?.() ?? [],
    });
  }
  return payload;
}

export async function getPasskeyCredential(
  options: PublicKeyOptionsJSON,
): Promise<Record<string, unknown>> {
  const credential = await navigator.credentials.get({
    publicKey: toBrowserOptions(options),
  });
  if (!(credential instanceof PublicKeyCredential)) {
    throw new Error("Your browser did not return a passkey.");
  }
  const response = credential.response;
  if (!(response instanceof AuthenticatorAssertionResponse)) {
    throw new Error("Your browser returned an invalid passkey response.");
  }
  return {
    id: credential.id,
    rawId: encodeBase64Url(credential.rawId),
    type: credential.type,
    authenticatorAttachment: credential.authenticatorAttachment,
    clientExtensionResults: credential.getClientExtensionResults(),
    response: {
      authenticatorData: encodeBase64Url(response.authenticatorData),
      clientDataJSON: encodeBase64Url(response.clientDataJSON),
      signature: encodeBase64Url(response.signature),
      userHandle: response.userHandle ? encodeBase64Url(response.userHandle) : null,
    },
  };
}
